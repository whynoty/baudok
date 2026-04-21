"""
Tests for GET /api/v1/analytics/

Covers:
- Role enforcement (worker → 403, unauthenticated → 401)
- Empty-data baseline (supervisor sees 200 with empty lists)
- Correct aggregation across 3 reports / 2 projects
- date_from filter excludes out-of-range reports
- project filter excludes other-project reports
- Cross-tenant isolation (supervisor only sees own company data)
"""
import pytest
from datetime import date, timedelta
from rest_framework import status

from apps.accounts.models import Company, User
from apps.reports.models import DailyReport, Project, ReportEntry

ANALYTICS_URL = "/api/v1/analytics/"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_report(company, user, project, report_date, entry_status="generated"):
    return DailyReport.objects.create(
        company=company,
        created_by=user,
        project=project,
        report_date=report_date,
        raw_input_text="Test",
        status=entry_status,
        structured_data={},
    )


def add_work_entry(report, duration_hours):
    return ReportEntry.objects.create(
        report=report,
        category="work_performed",
        position=0,
        content="Work",
        duration_hours=duration_hours,
    )


def add_material_entry(report):
    return ReportEntry.objects.create(
        report=report,
        category="materials_used",
        position=1,
        content="Material X",
    )


# ---------------------------------------------------------------------------
# Auth / role enforcement
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAnalyticsAuth:
    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_worker_role_returns_403(self, worker_client):
        response = worker_client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["error"]["code"] == "FORBIDDEN"

    def test_supervisor_role_returns_200(self, supervisor_client):
        response = supervisor_client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_200_OK

    def test_company_admin_role_returns_200(self, admin_client):
        response = admin_client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_200_OK


# ---------------------------------------------------------------------------
# Empty-data baseline
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAnalyticsEmptyData:
    def test_empty_company_returns_empty_lists(self, supervisor_client):
        response = supervisor_client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["reports_by_day"] == []
        assert data["hours_by_project"] == []
        assert data["materials_by_project"] == []
        assert data["top_workers"] == []
        assert data["submission_rate"] == {"on_time": 0, "total": 0, "percentage": 0.0}


# ---------------------------------------------------------------------------
# Aggregation correctness
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAnalyticsAggregation:
    def test_three_reports_two_projects_aggregates_correctly(
        self, supervisor_client, company, supervisor_user, worker_user, project
    ):
        today = date.today()

        # Second project in the same company
        project2 = Project.objects.create(
            company=company,
            name="Baustelle Süd",
            address="Südstraße 2",
            created_by=supervisor_user,
        )

        # Report 1: project, worker_user
        r1 = make_report(company, worker_user, project, today)
        add_work_entry(r1, 8.0)
        add_material_entry(r1)

        # Report 2: project, supervisor_user (same day)
        r2 = make_report(company, supervisor_user, project, today)
        add_work_entry(r2, 4.0)

        # Report 3: project2, worker_user, different day
        yesterday = today - timedelta(days=1)
        r3 = make_report(company, worker_user, project2, yesterday)
        add_work_entry(r3, 6.0)
        add_material_entry(r3)

        response = supervisor_client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # reports_by_day: 2 days
        dates = {item["date"]: item["count"] for item in data["reports_by_day"]}
        assert dates[str(today)] == 2
        assert dates[str(yesterday)] == 1

        # hours_by_project: project has 12h, project2 has 6h
        hours_map = {
            item["project_id"]: item["total_hours"]
            for item in data["hours_by_project"]
        }
        assert hours_map[str(project.id)] == 12.0
        assert hours_map[str(project2.id)] == 6.0

        # materials_by_project: project has 1, project2 has 1
        mat_map = {
            item["project_id"]: item["entries"]
            for item in data["materials_by_project"]
        }
        assert mat_map[str(project.id)] == 1
        assert mat_map[str(project2.id)] == 1

        # top_workers: worker_user has 2 reports, supervisor_user has 1
        workers_map = {
            item["worker_id"]: item for item in data["top_workers"]
        }
        worker_stats = workers_map[str(worker_user.id)]
        assert worker_stats["report_count"] == 2
        assert worker_stats["total_hours"] == 14.0  # 8 + 6

        supervisor_stats = workers_map[str(supervisor_user.id)]
        assert supervisor_stats["report_count"] == 1
        assert supervisor_stats["total_hours"] == 4.0

        # submission_rate: all 3 are "generated" (not draft) → on_time=3, total=3
        assert data["submission_rate"]["total"] == 3
        assert data["submission_rate"]["on_time"] == 3
        assert data["submission_rate"]["percentage"] == 100.0

    def test_submission_rate_excludes_drafts(
        self, supervisor_client, company, worker_user, project
    ):
        today = date.today()
        make_report(company, worker_user, project, today, entry_status="generated")
        make_report(company, worker_user, project, today, entry_status="draft")

        response = supervisor_client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_200_OK
        sr = response.data["submission_rate"]
        assert sr["total"] == 2
        assert sr["on_time"] == 1
        assert sr["percentage"] == 50.0


# ---------------------------------------------------------------------------
# Date filter
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAnalyticsDateFilter:
    def test_date_from_excludes_older_reports(
        self, supervisor_client, company, worker_user, project
    ):
        today = date.today()
        old_date = today - timedelta(days=10)

        make_report(company, worker_user, project, today)
        make_report(company, worker_user, project, old_date)

        response = supervisor_client.get(
            ANALYTICS_URL, {"date_from": str(today)}
        )
        assert response.status_code == status.HTTP_200_OK
        dates = [item["date"] for item in response.data["reports_by_day"]]
        assert str(today) in dates
        assert str(old_date) not in dates

    def test_date_to_excludes_newer_reports(
        self, supervisor_client, company, worker_user, project
    ):
        today = date.today()
        future_date = today + timedelta(days=5)

        make_report(company, worker_user, project, today)
        make_report(company, worker_user, project, future_date)

        response = supervisor_client.get(
            ANALYTICS_URL, {"date_to": str(today)}
        )
        assert response.status_code == status.HTTP_200_OK
        dates = [item["date"] for item in response.data["reports_by_day"]]
        assert str(today) in dates
        assert str(future_date) not in dates

    def test_invalid_date_from_returns_400(self, supervisor_client):
        response = supervisor_client.get(ANALYTICS_URL, {"date_from": "not-a-date"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "VALIDATION_ERROR"

    def test_invalid_date_to_returns_400(self, supervisor_client):
        response = supervisor_client.get(ANALYTICS_URL, {"date_to": "31-12-2025"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# Project filter
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAnalyticsProjectFilter:
    def test_project_filter_excludes_other_projects(
        self, supervisor_client, company, supervisor_user, worker_user, project
    ):
        today = date.today()

        project2 = Project.objects.create(
            company=company,
            name="Anderes Projekt",
            address="Andere Str. 9",
            created_by=supervisor_user,
        )

        r1 = make_report(company, worker_user, project, today)
        add_work_entry(r1, 5.0)

        r2 = make_report(company, worker_user, project2, today)
        add_work_entry(r2, 3.0)

        response = supervisor_client.get(ANALYTICS_URL, {"project": str(project.id)})
        assert response.status_code == status.HTTP_200_OK
        data = response.data

        project_ids = [item["project_id"] for item in data["hours_by_project"]]
        assert str(project.id) in project_ids
        assert str(project2.id) not in project_ids

        # reports_by_day should only count report from project
        total_count = sum(item["count"] for item in data["reports_by_day"])
        assert total_count == 1

    def test_invalid_project_uuid_returns_400(self, supervisor_client):
        response = supervisor_client.get(ANALYTICS_URL, {"project": "not-a-uuid"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# Worker filter
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAnalyticsWorkerFilter:
    def test_worker_filter_excludes_other_workers(
        self, supervisor_client, company, supervisor_user, worker_user, project
    ):
        today = date.today()

        r1 = make_report(company, worker_user, project, today)
        add_work_entry(r1, 8.0)

        r2 = make_report(company, supervisor_user, project, today)
        add_work_entry(r2, 4.0)

        response = supervisor_client.get(
            ANALYTICS_URL, {"worker": str(worker_user.id)}
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.data

        worker_ids = [item["worker_id"] for item in data["top_workers"]]
        assert str(worker_user.id) in worker_ids
        assert str(supervisor_user.id) not in worker_ids

    def test_invalid_worker_uuid_returns_400(self, supervisor_client):
        response = supervisor_client.get(ANALYTICS_URL, {"worker": "bad-uuid"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data["error"]["code"] == "VALIDATION_ERROR"


# ---------------------------------------------------------------------------
# Cross-tenant isolation
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAnalyticsCrossTenantIsolation:
    def test_supervisor_sees_only_own_company_data(
        self,
        supervisor_client,
        company,
        worker_user,
        project,
        other_company,
        other_worker,
    ):
        today = date.today()

        # Own-company report
        make_report(company, worker_user, project, today)

        # Other-company report
        other_project = Project.objects.create(
            company=other_company,
            name="Fremdprojekt",
            address="Fremdstraße 1",
        )
        make_report(other_company, other_worker, other_project, today)

        response = supervisor_client.get(ANALYTICS_URL)
        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Only one report should appear
        total_count = sum(item["count"] for item in data["reports_by_day"])
        assert total_count == 1

        # submission_rate total must be 1, not 2
        assert data["submission_rate"]["total"] == 1

        # No other-company project IDs in hours_by_project
        project_ids = [item["project_id"] for item in data["hours_by_project"]]
        assert str(other_project.id) not in project_ids

import pytest
from apps.reports.models import DailyReport, Project, ReportEntry


@pytest.mark.django_db
class TestProjectModel:
    def test_str(self, project):
        assert str(project) == 'Baustelle Hauptstraße'

    def test_belongs_to_company(self, project, company):
        assert project.company == company

    def test_uuid_pk(self, project):
        import uuid
        assert isinstance(project.id, uuid.UUID)


@pytest.mark.django_db
class TestDailyReportModel:
    def test_default_status_draft(self, company, worker_user, project):
        report = DailyReport.objects.create(
            company=company, created_by=worker_user, project=project,
            raw_input_text='Test'
        )
        assert report.status == 'draft'

    def test_str_contains_date(self, sample_report):
        assert str(sample_report.report_date) in str(sample_report)

    def test_company_isolation(self, sample_report, other_worker):
        reports = DailyReport.objects.filter(company=other_worker.company)
        assert sample_report not in reports


@pytest.mark.django_db
class TestReportEntryModel:
    def test_create_entry(self, sample_report):
        entry = ReportEntry.objects.create(
            report=sample_report,
            category='work_performed',
            content='Elektroleitungen verlegt',
            position=0,
        )
        assert entry.report == sample_report
        assert entry.category == 'work_performed'

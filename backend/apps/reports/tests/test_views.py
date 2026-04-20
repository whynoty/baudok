import pytest
from rest_framework import status


@pytest.mark.django_db
class TestProjectViews:
    def test_list_projects_requires_auth(self, api_client):
        response = api_client.get('/api/v1/projects/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_worker_can_list_projects(self, worker_client, project):
        response = worker_client.get('/api/v1/projects/')
        assert response.status_code == status.HTTP_200_OK

    def test_worker_cannot_create_project(self, worker_client):
        response = worker_client.post('/api/v1/projects/', {
            'name': 'Neues Projekt',
            'address': 'Berliner Str. 1',
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_supervisor_can_create_project(self, supervisor_client):
        response = supervisor_client.post('/api/v1/projects/', {
            'name': 'Neues Projekt',
            'address': 'Berliner Str. 1',
        })
        assert response.status_code == status.HTTP_201_CREATED

    def test_cross_tenant_project_returns_404(self, worker_client, other_company):
        from apps.reports.models import Project
        from apps.accounts.models import User
        other_project = Project.objects.create(
            company=other_company,
            name='Anderes Projekt',
            address='Other St. 1',
        )
        response = worker_client.get(f'/api/v1/projects/{other_project.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestReportViews:
    def test_worker_sees_own_reports_only(self, worker_client, sample_report, company, supervisor_user, project):
        from apps.reports.models import DailyReport
        other_report = DailyReport.objects.create(
            company=company, created_by=supervisor_user, project=project,
            raw_input_text='Supervisor report', status='generated',
            structured_data={}
        )
        response = worker_client.get('/api/v1/reports/')
        assert response.status_code == status.HTTP_200_OK
        ids = [r['id'] for r in response.data['results']]
        assert str(sample_report.id) in ids
        assert str(other_report.id) not in ids

    def test_supervisor_sees_all_company_reports(self, supervisor_client, sample_report):
        response = supervisor_client.get('/api/v1/reports/')
        assert response.status_code == status.HTTP_200_OK
        ids = [r['id'] for r in response.data['results']]
        assert str(sample_report.id) in ids

    def test_password_not_in_response(self, worker_client, sample_report):
        response = worker_client.get(f'/api/v1/reports/{sample_report.id}/')
        assert response.status_code == status.HTTP_200_OK
        import json
        response_text = json.dumps(response.data)
        assert 'password' not in response_text

    def test_cross_tenant_report_returns_404(self, worker_client, other_company, other_worker, project):
        from apps.reports.models import DailyReport
        other_report = DailyReport.objects.create(
            company=other_company, created_by=other_worker,
            raw_input_text='Other report', structured_data={},
        )
        response = worker_client.get(f'/api/v1/reports/{other_report.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_supervisor_can_review_report(self, supervisor_client, sample_report):
        response = supervisor_client.post(
            f'/api/v1/reports/{sample_report.id}/review/',
            {'notes': 'Alles in Ordnung.'},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['status'] == 'reviewed'

    def test_worker_cannot_review_report(self, worker_client, sample_report):
        response = worker_client.post(
            f'/api/v1/reports/{sample_report.id}/review/',
            {'notes': ''},
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

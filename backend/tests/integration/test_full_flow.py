"""Integration tests: full report creation flow against real DB."""
import pytest
from django.urls import reverse
from apps.reports.models import DailyReport, ReportEntry


@pytest.mark.django_db
class TestFullReportFlow:
    def test_worker_can_login(self, api_client, worker_user):
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'worker@test.de', 'password': 'pass123'
        })
        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_worker_create_report_via_ai(self, worker_client, project, mock_anthropic):
        response = worker_client.post('/api/v1/ai/generate/', {
            'raw_input': 'Heute habe ich Elektroleitungen im EG verlegt, ca 8 Stunden',
            'project_id': str(project.id),
            'report_date': '2026-04-21',
        }, format='json')
        assert response.status_code == 201
        data = response.data
        assert 'report' in data
        assert data['report']['status'] == 'generated'
        report_id = data['report']['id']
        assert DailyReport.objects.filter(id=report_id).exists()
        assert ReportEntry.objects.filter(report_id=report_id).exists()

    def test_cross_tenant_report_returns_404(self, worker_client, other_worker, project, sample_report):
        other_client_api = __import__('rest_framework.test', fromlist=['APIClient']).APIClient()
        other_client_api.force_authenticate(user=other_worker)
        response = other_client_api.get(f'/api/v1/reports/{sample_report.id}/')
        assert response.status_code == 404

    def test_worker_cannot_see_other_workers_reports(self, api_client, company, project):
        from apps.accounts.models import User
        from apps.reports.models import DailyReport
        worker2 = User.objects.create_user(
            email='worker2@test.de', password='pass123',
            first_name='Anna', last_name='Test',
            company=company, role='worker'
        )
        worker1 = User.objects.create_user(
            email='worker1b@test.de', password='pass123',
            first_name='Bob', last_name='Test',
            company=company, role='worker'
        )
        report = DailyReport.objects.create(
            company=company, created_by=worker2, raw_input_text='test',
            status='generated', structured_data={}
        )
        api_client.force_authenticate(user=worker1)
        response = api_client.get(f'/api/v1/reports/{report.id}/')
        assert response.status_code == 404

    def test_supervisor_can_see_all_company_reports(self, supervisor_client, sample_report):
        response = supervisor_client.get('/api/v1/reports/')
        assert response.status_code == 200
        ids = [r['id'] for r in response.data['results']]
        assert str(sample_report.id) in ids

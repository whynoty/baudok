import pytest
from apps.reports.models import ReportTemplate


@pytest.mark.django_db
class TestReportTemplates:
    def test_worker_sees_company_wide_and_own_templates(
        self, worker_client, company, worker_user, admin_user
    ):
        # company-wide template created by admin
        t1 = ReportTemplate.objects.create(
            company=company,
            created_by=admin_user,
            name='Elektro Standard',
            raw_input_template='Standard Elektro',
            is_company_wide=True,
        )
        # personal template by this worker
        t2 = ReportTemplate.objects.create(
            company=company,
            created_by=worker_user,
            name='Meine Vorlage',
            raw_input_template='Persönlich',
            is_company_wide=False,
        )
        # personal template by admin (not visible to worker)
        ReportTemplate.objects.create(
            company=company,
            created_by=admin_user,
            name='Admin Privat',
            raw_input_template='Privat',
            is_company_wide=False,
        )

        response = worker_client.get('/api/v1/templates/')
        assert response.status_code == 200
        ids = [r['id'] for r in response.data['results']]
        assert str(t1.id) in ids
        assert str(t2.id) in ids
        assert len([r for r in response.data['results'] if r['name'] == 'Admin Privat']) == 0

    def test_supervisor_sees_all_company_templates(
        self, supervisor_client, company, worker_user, supervisor_user
    ):
        t1 = ReportTemplate.objects.create(
            company=company,
            created_by=worker_user,
            name='T1',
            raw_input_template='x',
            is_company_wide=False,
        )
        t2 = ReportTemplate.objects.create(
            company=company,
            created_by=supervisor_user,
            name='T2',
            raw_input_template='y',
            is_company_wide=False,
        )
        response = supervisor_client.get('/api/v1/templates/')
        ids = [r['id'] for r in response.data['results']]
        assert str(t1.id) in ids
        assert str(t2.id) in ids

    def test_create_template(self, worker_client):
        response = worker_client.post(
            '/api/v1/templates/',
            {
                'name': 'Elektro Standardtag',
                'trade': 'Elektriker',
                'raw_input_template': 'Heute habe ich Elektroleitungen verlegt.',
                'is_company_wide': False,
            },
            format='json',
        )
        assert response.status_code == 201
        assert response.data['name'] == 'Elektro Standardtag'
        assert response.data['usage_count'] == 0

    def test_use_action_increments_usage_count(self, worker_client, company, worker_user):
        template = ReportTemplate.objects.create(
            company=company,
            created_by=worker_user,
            name='T',
            raw_input_template='x',
        )
        response = worker_client.post(f'/api/v1/templates/{template.id}/use/')
        assert response.status_code == 200
        template.refresh_from_db()
        assert template.usage_count == 1

    def test_from_report_creates_template(self, worker_client, sample_report):
        response = worker_client.post(
            '/api/v1/templates/from_report/',
            {
                'report_id': str(sample_report.id),
                'name': 'Vorlage aus Bericht',
                'is_company_wide': False,
            },
            format='json',
        )
        assert response.status_code == 201
        assert response.data['raw_input_template'] == sample_report.raw_input_text

    def test_cross_tenant_template_not_visible(
        self, worker_client, other_company, other_worker
    ):
        ReportTemplate.objects.create(
            company=other_company,
            created_by=other_worker,
            name='Other',
            raw_input_template='x',
            is_company_wide=True,
        )
        response = worker_client.get('/api/v1/templates/')
        assert all(r['id'] != str(other_company.id) for r in response.data.get('results', []))

    def test_filter_by_trade(self, worker_client, company, worker_user):
        ReportTemplate.objects.create(
            company=company,
            created_by=worker_user,
            name='Elektro',
            trade='Elektriker',
            raw_input_template='x',
            is_company_wide=True,
        )
        ReportTemplate.objects.create(
            company=company,
            created_by=worker_user,
            name='Sanitär',
            trade='Sanitär',
            raw_input_template='y',
            is_company_wide=True,
        )
        response = worker_client.get('/api/v1/templates/?trade=Elektrik')
        assert response.status_code == 200
        assert all('Elektri' in r['trade'] for r in response.data['results'])

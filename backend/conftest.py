import pytest
from rest_framework.test import APIClient
from apps.accounts.models import Company, User
from apps.reports.models import Project, DailyReport, ReportEntry


@pytest.fixture
def company(db):
    return Company.objects.create(name='Test GmbH', slug='test-gmbh')


@pytest.fixture
def worker_user(db, company):
    return User.objects.create_user(
        email='worker@test.de', password='pass123',
        first_name='Hans', last_name='Müller',
        company=company, role='worker', trade='Elektriker'
    )


@pytest.fixture
def supervisor_user(db, company):
    return User.objects.create_user(
        email='super@test.de', password='pass123',
        first_name='Klaus', last_name='Schmidt',
        company=company, role='supervisor'
    )


@pytest.fixture
def admin_user(db, company):
    return User.objects.create_user(
        email='admin@test.de', password='pass123',
        first_name='Maria', last_name='Weber',
        company=company, role='company_admin'
    )


@pytest.fixture
def other_company(db):
    return Company.objects.create(name='Other GmbH', slug='other-gmbh')


@pytest.fixture
def other_worker(db, other_company):
    return User.objects.create_user(
        email='other@test.de', password='pass123',
        first_name='Fritz', last_name='Other',
        company=other_company, role='worker'
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def worker_client(api_client, worker_user):
    api_client.force_authenticate(user=worker_user)
    return api_client


@pytest.fixture
def supervisor_client(api_client, supervisor_user):
    api_client.force_authenticate(user=supervisor_user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def project(db, company, admin_user):
    return Project.objects.create(
        company=company,
        name='Baustelle Hauptstraße',
        address='Hauptstraße 1, 10115 Berlin',
        created_by=admin_user
    )


@pytest.fixture
def sample_report(db, company, worker_user, project):
    report = DailyReport.objects.create(
        company=company,
        created_by=worker_user,
        project=project,
        raw_input_text='Heute Elektroleitungen verlegt im EG',
        status='generated',
        structured_data={
            'work_performed': [{'description': 'Elektroleitungen wurden im Erdgeschoss verlegt.', 'duration_hours': 8.0, 'location': 'EG'}],
            'materials_used': [],
            'equipment': [],
            'personnel': [],
            'obstacles': [],
            'safety_notes': [],
            'general_notes': [],
            'summary': 'Elektroinstallationsarbeiten im Erdgeschoss wurden planmäßig abgeschlossen.'
        },
        ai_model_used='claude-sonnet-4-6',
        ai_tokens_used=350
    )
    ReportEntry.objects.create(
        report=report, category='work_performed', position=0,
        content='Elektroleitungen wurden im Erdgeschoss verlegt.',
        duration_hours=8.0
    )
    return report


@pytest.fixture
def mock_anthropic(mocker):
    mock = mocker.patch('apps.ai.client.anthropic.Anthropic')
    mock_instance = mock.return_value
    mock_instance.messages.create.return_value = type('obj', (object,), {
        'content': [type('obj', (object,), {'text': '{"work_performed":[{"description":"Test","duration_hours":8.0,"location":"EG"}],"materials_used":[],"equipment":[],"personnel":[],"obstacles":[],"safety_notes":[],"general_notes":[],"summary":"Test summary."}'})()],
        'usage': type('obj', (object,), {'input_tokens': 200, 'output_tokens': 150})()
    })()
    return mock_instance

"""
Tests for Feature 6: Digital Signature endpoints.

Coverage:
- Worker POST → creates SignatureRecord with role='worker'
- Supervisor POST → creates SignatureRecord with role='supervisor'
- Worker duplicate POST → 409
- Invalid base64 POST → 400
- Cross-tenant GET → 404
- Unauthenticated GET → 401
- Report with 2 signatures GET → returns both
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import Company, User
from apps.reports.models import DailyReport, SignatureRecord

VALID_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

SIGNATURES_URL = '/api/v1/reports/{report_id}/signatures/'


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def url(report_id):
    return SIGNATURES_URL.format(report_id=report_id)


# ---------------------------------------------------------------------------
# POST — worker creates signature with role='worker'
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_worker_post_signature_creates_worker_role(worker_client, sample_report):
    response = worker_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})
    assert response.status_code == 201
    data = response.json()['data']
    assert data['signer_role'] == 'worker'
    assert SignatureRecord.objects.filter(report=sample_report, signer_role='worker').exists()


# ---------------------------------------------------------------------------
# POST — supervisor creates signature with role='supervisor'
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_supervisor_post_signature_creates_supervisor_role(supervisor_client, sample_report):
    response = supervisor_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})
    assert response.status_code == 201
    data = response.json()['data']
    assert data['signer_role'] == 'supervisor'
    assert SignatureRecord.objects.filter(report=sample_report, signer_role='supervisor').exists()


# ---------------------------------------------------------------------------
# POST — company_admin also maps to supervisor role
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_admin_post_signature_creates_supervisor_role(admin_client, sample_report):
    response = admin_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})
    assert response.status_code == 201
    assert response.json()['data']['signer_role'] == 'supervisor'


# ---------------------------------------------------------------------------
# POST — worker already signed → 409
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_worker_duplicate_signature_returns_409(worker_client, sample_report):
    worker_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})
    response = worker_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})
    assert response.status_code == 409
    assert 'Signature already exists' in response.json()['error']


# ---------------------------------------------------------------------------
# POST — invalid base64 → 400
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_invalid_signature_image_returns_400(worker_client, sample_report):
    response = worker_client.post(url(sample_report.id), {'signature_image': 'not-a-valid-image'})
    assert response.status_code == 400
    assert 'Invalid signature_image format' in response.json()['error']


@pytest.mark.django_db
def test_missing_signature_image_returns_400(worker_client, sample_report):
    response = worker_client.post(url(sample_report.id), {})
    assert response.status_code == 400


@pytest.mark.django_db
def test_wrong_mime_type_returns_400(worker_client, sample_report):
    response = worker_client.post(
        url(sample_report.id),
        {'signature_image': 'data:image/jpeg;base64,/9j/4AAQ'},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# GET — cross-tenant user gets 404
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_cross_tenant_get_returns_404(api_client, other_worker, sample_report):
    api_client.force_authenticate(user=other_worker)
    response = api_client.get(url(sample_report.id))
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# GET — unauthenticated → 401
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_unauthenticated_get_returns_401(api_client, sample_report):
    response = api_client.get(url(sample_report.id))
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET — report with 2 signatures returns both
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_get_returns_both_signatures(
    worker_client, supervisor_client, sample_report, api_client, worker_user
):
    # Worker signs
    worker_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})
    # Supervisor signs
    supervisor_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})

    # Re-authenticate as worker to GET
    response = worker_client.get(url(sample_report.id))
    assert response.status_code == 200
    data = response.json()['data']
    assert len(data) == 2
    roles = {sig['signer_role'] for sig in data}
    assert roles == {'worker', 'supervisor'}


# ---------------------------------------------------------------------------
# POST — response shape includes expected fields
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_post_response_shape(worker_client, sample_report):
    response = worker_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})
    assert response.status_code == 201
    data = response.json()['data']
    for field in ('id', 'signer_name', 'signer_role', 'signed_at', 'signature_image'):
        assert field in data, f'Missing field: {field}'
    # Password must never appear in response
    assert 'password' not in data


# ---------------------------------------------------------------------------
# POST — signer_name is derived from user's full name
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_signer_name_is_full_name(worker_client, worker_user, sample_report):
    response = worker_client.post(url(sample_report.id), {'signature_image': VALID_SIGNATURE})
    assert response.status_code == 201
    assert response.json()['data']['signer_name'] == worker_user.get_full_name()


# ---------------------------------------------------------------------------
# GET — worker cannot access another worker's report signatures
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_worker_cannot_access_other_workers_report(
    api_client, company, supervisor_user, project, db
):
    """A worker who did not create the report gets 404 when accessing its signatures."""
    other_worker = User.objects.create_user(
        email='otherworker@test.de',
        password='pass123',
        first_name='Anna',
        last_name='Bauer',
        company=company,
        role='worker',
    )
    report = DailyReport.objects.create(
        company=company,
        created_by=supervisor_user,
        project=project,
        raw_input_text='Some work',
        status='draft',
    )
    api_client.force_authenticate(user=other_worker)
    response = api_client.get(url(report.id))
    assert response.status_code == 404

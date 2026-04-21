"""
Tests for Feature 7: Client Portal — ShareLink endpoints.

Covers:
- POST   /api/v1/reports/{report_id}/share/        (supervisor/admin only)
- GET    /api/v1/reports/{report_id}/share/        (supervisor/admin only)
- DELETE /api/v1/reports/{report_id}/share/{link_id}/
- GET    /api/v1/public/share/{token}/             (public, no auth)
"""
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from apps.reports.models import ShareLink


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_link(report, user, *, days=30, is_active=True):
    """Create a ShareLink with sensible defaults."""
    return ShareLink.objects.create(
        report=report,
        created_by=user,
        expires_at=timezone.now() + timedelta(days=days),
        is_active=is_active,
    )


# ---------------------------------------------------------------------------
# Authenticated share-link management
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestShareLinkCreate:
    url_tpl = '/api/v1/reports/{report_id}/share/'

    def test_supervisor_can_create_share_link(self, supervisor_client, sample_report):
        url = self.url_tpl.format(report_id=sample_report.id)
        response = supervisor_client.post(url, {'expires_days': 14, 'note': 'für Herrn Müller'})

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data['data']
        assert 'token' in data
        assert data['url'].startswith('/share/')
        assert data['is_active'] is True
        assert data['accessed_count'] == 0
        assert data['note'] == 'für Herrn Müller'
        assert ShareLink.objects.filter(id=data['id']).exists()

    def test_admin_can_create_share_link(self, admin_client, sample_report):
        url = self.url_tpl.format(report_id=sample_report.id)
        response = admin_client.post(url, {'expires_days': 30})

        assert response.status_code == status.HTTP_201_CREATED

    def test_worker_cannot_create_share_link_returns_403(self, worker_client, sample_report):
        url = self.url_tpl.format(report_id=sample_report.id)
        response = worker_client.post(url, {'expires_days': 30})

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_returns_401(self, api_client, sample_report):
        url = self.url_tpl.format(report_id=sample_report.id)
        response = api_client.post(url, {'expires_days': 30})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cross_tenant_report_returns_404(
        self, supervisor_client, other_company, other_worker, project
    ):
        from apps.reports.models import DailyReport

        other_report = DailyReport.objects.create(
            company=other_company,
            created_by=other_worker,
            raw_input_text='Other tenant report',
            structured_data={},
        )
        url = self.url_tpl.format(report_id=other_report.id)
        response = supervisor_client.post(url, {'expires_days': 30})

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_default_expires_days_is_30(self, supervisor_client, sample_report):
        url = self.url_tpl.format(report_id=sample_report.id)
        before = timezone.now()
        response = supervisor_client.post(url, {})

        assert response.status_code == status.HTTP_201_CREATED
        link = ShareLink.objects.get(id=response.data['data']['id'])
        delta = link.expires_at - before
        # Should be ~30 days; allow a few seconds of slack
        assert timedelta(days=29, hours=23) < delta < timedelta(days=30, hours=1)

    def test_expires_days_max_365(self, supervisor_client, sample_report):
        url = self.url_tpl.format(report_id=sample_report.id)
        response = supervisor_client.post(url, {'expires_days': 366})

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_expires_days_min_1(self, supervisor_client, sample_report):
        url = self.url_tpl.format(report_id=sample_report.id)
        response = supervisor_client.post(url, {'expires_days': 0})

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestShareLinkList:
    url_tpl = '/api/v1/reports/{report_id}/share/'

    def test_supervisor_can_list_share_links(
        self, supervisor_client, supervisor_user, sample_report
    ):
        _make_link(sample_report, supervisor_user)
        _make_link(sample_report, supervisor_user)
        url = self.url_tpl.format(report_id=sample_report.id)
        response = supervisor_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['data']) == 2

    def test_worker_cannot_list_share_links(self, worker_client, sample_report):
        url = self.url_tpl.format(report_id=sample_report.id)
        response = worker_client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestShareLinkDeactivate:
    url_tpl = '/api/v1/reports/{report_id}/share/{link_id}/'

    def test_supervisor_can_deactivate_link(
        self, supervisor_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user)
        url = self.url_tpl.format(report_id=sample_report.id, link_id=link.id)
        response = supervisor_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        link.refresh_from_db()
        assert link.is_active is False

    def test_deactivated_link_still_exists_in_db(
        self, supervisor_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user)
        url = self.url_tpl.format(report_id=sample_report.id, link_id=link.id)
        supervisor_client.delete(url)

        assert ShareLink.objects.filter(id=link.id).exists()

    def test_worker_cannot_deactivate_link(
        self, worker_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user)
        url = self.url_tpl.format(report_id=sample_report.id, link_id=link.id)
        response = worker_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cross_tenant_link_returns_404(
        self, supervisor_client, supervisor_user, other_company, other_worker, project
    ):
        from apps.reports.models import DailyReport

        other_report = DailyReport.objects.create(
            company=other_company,
            created_by=other_worker,
            raw_input_text='Other tenant',
            structured_data={},
        )
        other_link = _make_link(other_report, other_worker)
        url = self.url_tpl.format(report_id=other_report.id, link_id=other_link.id)
        response = supervisor_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND


# ---------------------------------------------------------------------------
# Public endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPublicShareView:
    url_tpl = '/api/v1/public/share/{token}/'

    def test_valid_token_returns_report_data(
        self, api_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user)
        url = self.url_tpl.format(token=link.token)
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data['data']
        assert 'report_date' in data
        assert 'project_name' in data
        assert 'weather' in data
        assert 'worker_name' in data
        assert 'company_name' in data
        assert 'entries' in data
        assert 'share_expires_at' in data

    def test_valid_token_returns_entry_data(
        self, api_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user)
        url = self.url_tpl.format(token=link.token)
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        entries = response.data['data']['entries']
        assert len(entries) >= 1
        entry = entries[0]
        assert 'category' in entry
        assert 'content' in entry
        assert 'duration_hours' in entry

    def test_valid_token_does_not_expose_sensitive_fields(
        self, api_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user)
        url = self.url_tpl.format(token=link.token)
        response = api_client.get(url)

        data = response.data['data']
        assert 'raw_input_text' not in data
        assert 'ai_model_used' not in data
        assert 'ai_tokens_used' not in data
        assert 'pdf_file' not in data
        assert 'signatures' not in data

    def test_valid_token_increments_accessed_count(
        self, api_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user)
        url = self.url_tpl.format(token=link.token)

        api_client.get(url)
        api_client.get(url)

        link.refresh_from_db()
        assert link.accessed_count == 2

    def test_expired_token_returns_404(
        self, api_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user, days=-1)
        url = self.url_tpl.format(token=link.token)
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_inactive_link_returns_404(
        self, api_client, supervisor_user, sample_report
    ):
        link = _make_link(sample_report, supervisor_user, is_active=False)
        url = self.url_tpl.format(token=link.token)
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_nonexistent_token_returns_404(self, api_client):
        url = self.url_tpl.format(token='this-token-does-not-exist')
        response = api_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

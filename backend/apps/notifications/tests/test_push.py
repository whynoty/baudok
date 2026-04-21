"""
Tests for Web Push subscription endpoints and Celery push-notification tasks.
"""

import pytest
from unittest.mock import MagicMock, patch

from apps.notifications.models import NotificationPreference, PushSubscription


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SUBSCRIBE_PAYLOAD = {
    'endpoint': 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
    'keys': {
        'p256dh': 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlTgATklkizOTkAgfOrFmu8x3l4Pzh_E8wTJ_4Q==',
        'auth': 'tBHItJI5svbpez7KI4CCXg==',
    },
}


# ---------------------------------------------------------------------------
# Subscribe endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSubscribeView:
    def test_authenticated_user_can_subscribe(self, worker_client):
        response = worker_client.post(
            '/api/v1/notifications/subscribe/',
            data=SUBSCRIBE_PAYLOAD,
            format='json',
        )
        assert response.status_code == 201
        assert PushSubscription.objects.count() == 1

    def test_subscribe_stores_correct_fields(self, worker_client, worker_user):
        worker_client.post(
            '/api/v1/notifications/subscribe/',
            data=SUBSCRIBE_PAYLOAD,
            format='json',
        )
        sub = PushSubscription.objects.get(user=worker_user)
        assert sub.endpoint == SUBSCRIBE_PAYLOAD['endpoint']
        assert sub.p256dh == SUBSCRIBE_PAYLOAD['keys']['p256dh']
        assert sub.auth == SUBSCRIBE_PAYLOAD['keys']['auth']
        assert sub.is_active is True

    def test_same_endpoint_updates_not_duplicates(self, worker_client, worker_user):
        worker_client.post(
            '/api/v1/notifications/subscribe/',
            data=SUBSCRIBE_PAYLOAD,
            format='json',
        )
        # Post again with the same endpoint — should update, not create a second row
        worker_client.post(
            '/api/v1/notifications/subscribe/',
            data=SUBSCRIBE_PAYLOAD,
            format='json',
        )
        assert PushSubscription.objects.filter(user=worker_user).count() == 1

    def test_unauthenticated_subscribe_returns_401(self, api_client):
        response = api_client.post(
            '/api/v1/notifications/subscribe/',
            data=SUBSCRIBE_PAYLOAD,
            format='json',
        )
        assert response.status_code == 401

    def test_delete_deactivates_subscriptions(self, worker_client, worker_user):
        PushSubscription.objects.create(
            user=worker_user,
            endpoint='https://push.example.com/sub/1',
            p256dh='key1',
            auth='auth1',
        )
        PushSubscription.objects.create(
            user=worker_user,
            endpoint='https://push.example.com/sub/2',
            p256dh='key2',
            auth='auth2',
        )
        response = worker_client.delete('/api/v1/notifications/subscribe/')
        assert response.status_code == 204
        assert PushSubscription.objects.filter(user=worker_user, is_active=True).count() == 0
        assert PushSubscription.objects.filter(user=worker_user, is_active=False).count() == 2


# ---------------------------------------------------------------------------
# Preferences endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestNotificationPreferencesView:
    def test_get_creates_defaults_if_missing(self, worker_client, worker_user):
        assert not NotificationPreference.objects.filter(user=worker_user).exists()
        response = worker_client.get('/api/v1/notifications/preferences/')
        assert response.status_code == 200
        assert NotificationPreference.objects.filter(user=worker_user).exists()
        data = response.json()
        assert data['daily_reminder'] is True
        assert data['push_enabled'] is True

    def test_get_returns_existing_prefs(self, worker_client, worker_user):
        NotificationPreference.objects.create(
            user=worker_user,
            daily_reminder=False,
            push_enabled=False,
        )
        response = worker_client.get('/api/v1/notifications/preferences/')
        data = response.json()
        assert data['daily_reminder'] is False
        assert data['push_enabled'] is False

    def test_patch_updates_partial_fields(self, worker_client, worker_user):
        response = worker_client.patch(
            '/api/v1/notifications/preferences/',
            data={'daily_reminder': False, 'reminder_time': '08:00'},
            format='json',
        )
        assert response.status_code == 200
        prefs = NotificationPreference.objects.get(user=worker_user)
        assert prefs.daily_reminder is False
        assert str(prefs.reminder_time) == '08:00:00'
        # Other fields unchanged
        assert prefs.push_enabled is True

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get('/api/v1/notifications/preferences/')
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# VAPID public key endpoint
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestVapidPublicKeyView:
    def test_returns_public_key(self, worker_client, settings):
        settings.VAPID_PUBLIC_KEY = 'BTest_PublicKey_Value'
        response = worker_client.get('/api/v1/notifications/vapid-public-key/')
        assert response.status_code == 200
        assert response.json()['public_key'] == 'BTest_PublicKey_Value'

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get('/api/v1/notifications/vapid-public-key/')
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Celery task: send_daily_reminders
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSendDailyReminders:
    def test_sends_push_when_no_report_today(self, worker_user, settings):
        settings.VAPID_PRIVATE_KEY = 'fake-private-key'
        settings.VAPID_CLAIMS_EMAIL = 'admin@baudok.de'

        from django.utils import timezone

        now = timezone.localtime(timezone.now())
        NotificationPreference.objects.create(
            user=worker_user,
            daily_reminder=True,
            reminder_time=now.time().replace(minute=0, second=0, microsecond=0),
            push_enabled=True,
        )
        PushSubscription.objects.create(
            user=worker_user,
            endpoint='https://push.example.com/sub/abc',
            p256dh='dummykey',
            auth='dummyauth',
            is_active=True,
        )

        with patch('apps.notifications.tasks._send_webpush') as mock_push:
            mock_push.return_value = True
            from apps.notifications.tasks import send_daily_reminders
            send_daily_reminders()

        mock_push.assert_called_once()

    def test_does_not_send_when_report_already_submitted(
        self, worker_user, sample_report, settings
    ):
        settings.VAPID_PRIVATE_KEY = 'fake-private-key'

        from django.utils import timezone

        now = timezone.localtime(timezone.now())
        NotificationPreference.objects.create(
            user=worker_user,
            daily_reminder=True,
            reminder_time=now.time().replace(minute=0, second=0, microsecond=0),
            push_enabled=True,
        )
        PushSubscription.objects.create(
            user=worker_user,
            endpoint='https://push.example.com/sub/xyz',
            p256dh='dummykey',
            auth='dummyauth',
            is_active=True,
        )
        # sample_report already has report_date set, patch today to match it
        with patch('apps.notifications.tasks.timezone') as mock_tz:
            mock_now = MagicMock()
            mock_now.date.return_value = sample_report.report_date
            mock_now.hour = now.hour
            mock_tz.localtime.return_value = mock_now
            mock_tz.now.return_value = now

            with patch('apps.notifications.tasks._send_webpush') as mock_push:
                from apps.notifications.tasks import send_daily_reminders
                send_daily_reminders()

        mock_push.assert_not_called()


# ---------------------------------------------------------------------------
# Celery task: send_supervisor_alert
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSendSupervisorAlert:
    def test_sends_push_to_company_supervisors(
        self, sample_report, supervisor_user, settings
    ):
        settings.VAPID_PRIVATE_KEY = 'fake-private-key'
        settings.VAPID_CLAIMS_EMAIL = 'admin@baudok.de'

        NotificationPreference.objects.create(
            user=supervisor_user,
            supervisor_alerts=True,
            push_enabled=True,
            email_fallback=False,
        )
        PushSubscription.objects.create(
            user=supervisor_user,
            endpoint='https://push.example.com/super/1',
            p256dh='superkey',
            auth='superauth',
            is_active=True,
        )

        with patch('apps.notifications.tasks._send_webpush') as mock_push:
            mock_push.return_value = True
            from apps.notifications.tasks import send_supervisor_alert
            send_supervisor_alert(str(sample_report.id))

        mock_push.assert_called_once()
        call_payload = mock_push.call_args[0][1]
        assert 'Neuer Bericht' in call_payload['title']
        assert str(sample_report.id) in call_payload['url']

    def test_email_fallback_when_push_not_enabled(
        self, sample_report, supervisor_user, settings
    ):
        settings.DEFAULT_FROM_EMAIL = 'noreply@baudok.de'

        NotificationPreference.objects.create(
            user=supervisor_user,
            supervisor_alerts=True,
            push_enabled=False,
            email_fallback=True,
        )

        with patch('apps.notifications.tasks.send_mail') as mock_mail:
            from apps.notifications.tasks import send_supervisor_alert
            send_supervisor_alert(str(sample_report.id))

        mock_mail.assert_called_once()
        assert supervisor_user.email in mock_mail.call_args[1]['recipient_list']

    def test_does_not_alert_supervisor_from_other_company(
        self, sample_report, other_worker, settings
    ):
        """Supervisors in a different company must not receive the alert."""
        from apps.accounts.models import User

        # Promote other_worker to supervisor role in their own company
        other_worker.role = 'supervisor'
        other_worker.save()

        NotificationPreference.objects.create(
            user=other_worker,
            supervisor_alerts=True,
            push_enabled=True,
        )
        PushSubscription.objects.create(
            user=other_worker,
            endpoint='https://push.example.com/other/1',
            p256dh='otherkey',
            auth='otherauth',
            is_active=True,
        )

        with patch('apps.notifications.tasks._send_webpush') as mock_push:
            from apps.notifications.tasks import send_supervisor_alert
            send_supervisor_alert(str(sample_report.id))

        mock_push.assert_not_called()

"""
Celery tasks for PDF generation, email delivery, and push notifications.
"""

import json
import logging

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Push notification helpers
# ---------------------------------------------------------------------------

def _send_webpush(subscription, payload: dict) -> bool:
    """
    Send a Web Push message to a single PushSubscription.
    Returns True on success, False when the subscription has expired/gone.
    Raises for other errors so the caller can decide whether to retry.
    """
    try:
        from pywebpush import webpush  # type: ignore
    except ImportError:
        logger.warning('pywebpush is not installed — skipping push notification')
        return False

    try:
        webpush(
            subscription_info={
                'endpoint': subscription.endpoint,
                'keys': {
                    'p256dh': subscription.p256dh,
                    'auth': subscription.auth,
                },
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                'sub': f'mailto:{settings.VAPID_CLAIMS_EMAIL}',
            },
        )
        return True
    except Exception as exc:
        exc_str = str(exc)
        # 404 / 410 means the subscription is no longer valid
        if '404' in exc_str or '410' in exc_str:
            logger.info('Push subscription expired, deactivating: %s', subscription.endpoint[:60])
            subscription.is_active = False
            subscription.save(update_fields=['is_active'])
            return False
        raise


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_report_pdf_task(self, report_id: str):
    """
    Generate a PDF for the given DailyReport and save it to report.pdf_file.
    Retries up to 3 times on failure with 60-second delays.
    """
    from apps.reports.models import DailyReport
    from apps.reports.export import generate_pdf

    try:
        report = DailyReport.objects.get(id=report_id)
    except DailyReport.DoesNotExist:
        logger.error('generate_report_pdf_task: report %s not found', report_id)
        return

    try:
        pdf_bytes = generate_pdf(report)
        filename = f'bericht-{report.report_date}-{report_id[:8]}.pdf'
        report.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
        report.pdf_generated_at = timezone.now()
        report.save(update_fields=['pdf_file', 'pdf_generated_at'])
        logger.info('PDF generated for report %s → %s', report_id, filename)
    except Exception as exc:
        logger.exception('PDF generation failed for report %s: %s', report_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_report_email_task(self, report_id: str, recipient_email: str, sent_by_id: str):
    """
    Send a report via email to the given recipient.
    Creates an EmailDelivery record with the delivery status.
    """
    from django.core.mail import EmailMessage
    from django.conf import settings
    from apps.reports.models import DailyReport, EmailDelivery
    from apps.accounts.models import User

    try:
        report = DailyReport.objects.select_related(
            'created_by', 'project', 'company'
        ).get(id=report_id)
    except DailyReport.DoesNotExist:
        logger.error('send_report_email_task: report %s not found', report_id)
        return

    try:
        sent_by = User.objects.get(id=sent_by_id)
    except User.DoesNotExist:
        sent_by = None

    subject = (
        f'Bautagesbericht vom {report.report_date} — '
        f'{report.project.name if report.project else "Kein Projekt"}'
    )
    body = _build_email_body(report)

    try:
        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )

        # Attach PDF if available
        if report.pdf_file:
            try:
                email.attach(
                    filename=f'bericht-{report.report_date}.pdf',
                    content=report.pdf_file.read(),
                    mimetype='application/pdf',
                )
            except Exception as pdf_exc:
                logger.warning('Could not attach PDF to email: %s', pdf_exc)

        email.send(fail_silently=False)

        EmailDelivery.objects.create(
            report=report,
            sent_by=sent_by,
            recipient_email=recipient_email,
            status='sent',
        )
        logger.info('Report %s emailed to %s', report_id, recipient_email)

    except Exception as exc:
        logger.exception('Email delivery failed for report %s to %s: %s', report_id, recipient_email, exc)
        EmailDelivery.objects.create(
            report=report,
            sent_by=sent_by,
            recipient_email=recipient_email,
            status='failed',
            error_message=str(exc),
        )
        raise self.retry(exc=exc)


def _build_email_body(report) -> str:
    """Build a plain-text email body for the report."""
    lines = [
        f'Bautagesbericht — {report.report_date}',
        '=' * 50,
        f'Projekt: {report.project.name if report.project else "—"}',
        f'Mitarbeiter: {report.created_by.get_full_name()}',
        f'Gewerk: {report.created_by.trade or "—"}',
        f'Status: {report.get_status_display()}',
        '',
    ]

    if report.weather:
        lines.append(f'Wetter: {report.weather}')
    if report.temperature is not None:
        lines.append(f'Temperatur: {report.temperature} °C')

    lines.append('')

    # Group entries by category
    from collections import defaultdict
    categories = defaultdict(list)
    for entry in report.entries.all():
        categories[entry.get_category_display()].append(entry.content)

    for category, contents in categories.items():
        lines.append(f'{category}:')
        for content in contents:
            lines.append(f'  - {content}')
        lines.append('')

    structured = report.structured_data
    if structured.get('summary'):
        lines.append(f'Zusammenfassung: {structured["summary"]}')

    lines.extend([
        '',
        '---',
        f'Automatisch generiert von BauDok am {timezone.now().strftime("%d.%m.%Y %H:%M")}',
    ])

    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# Push notification tasks
# ---------------------------------------------------------------------------

@shared_task
def send_daily_reminders():
    """
    Periodic task — check every hour whether workers are due a daily reminder.
    Only sends to workers whose reminder_time falls in the current clock hour
    and who have not yet submitted a report for today.
    """
    from django.contrib.auth import get_user_model
    from apps.notifications.models import PushSubscription

    User = get_user_model()

    # Current time in the project timezone (Europe/Berlin as configured)
    now = timezone.localtime(timezone.now())
    current_hour = now.hour
    today = now.date()

    # Workers with daily reminders enabled who want push notifications
    workers = User.objects.filter(
        role='worker',
        notification_prefs__daily_reminder=True,
        notification_prefs__push_enabled=True,
    ).select_related('notification_prefs')

    for user in workers:
        prefs = user.notification_prefs
        # Only fire in the hour matching the user's configured reminder_time
        if prefs.reminder_time.hour != current_hour:
            continue

        # Skip if they already submitted a report today
        from apps.reports.models import DailyReport
        already_submitted = DailyReport.objects.filter(
            created_by=user,
            report_date=today,
        ).exists()
        if already_submitted:
            continue

        subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
        payload = {
            'title': 'BauDok Erinnerung',
            'body': 'Bitte reiche deinen Tagesbericht ein.',
            'url': '/reports/new',
        }
        for sub in subscriptions:
            try:
                _send_webpush(sub, payload)
            except Exception as exc:
                logger.exception(
                    'send_daily_reminders: push failed for user %s sub %s: %s',
                    user.email, sub.id, exc,
                )


@shared_task
def send_supervisor_alert(report_id: str):
    """
    Triggered after a new DailyReport is created.
    Sends a push notification (and optional email fallback) to all supervisors
    in the same company.
    """
    from django.contrib.auth import get_user_model
    from django.core.mail import send_mail
    from apps.reports.models import DailyReport
    from apps.notifications.models import PushSubscription

    User = get_user_model()

    try:
        report = DailyReport.objects.select_related('created_by', 'company').get(id=report_id)
    except DailyReport.DoesNotExist:
        logger.error('send_supervisor_alert: report %s not found', report_id)
        return

    worker_name = report.created_by.get_full_name()
    payload = {
        'title': 'Neuer Bericht',
        'body': f'{worker_name} hat einen Bericht eingereicht.',
        'url': f'/reports/{report_id}',
    }

    supervisors = User.objects.filter(
        company=report.company,
        role__in=['supervisor', 'company_admin'],
    ).select_related('notification_prefs')

    for supervisor in supervisors:
        # Fetch or default to implicit defaults when prefs row doesn't exist yet
        try:
            prefs = supervisor.notification_prefs
            push_enabled = prefs.push_enabled
            supervisor_alerts = prefs.supervisor_alerts
            email_fallback = prefs.email_fallback
        except Exception:
            # No prefs row — treat as defaults (all True)
            push_enabled = True
            supervisor_alerts = True
            email_fallback = True

        if not supervisor_alerts:
            continue

        push_sent = False
        if push_enabled:
            subscriptions = PushSubscription.objects.filter(
                user=supervisor, is_active=True,
            )
            for sub in subscriptions:
                try:
                    result = _send_webpush(sub, payload)
                    if result:
                        push_sent = True
                except Exception as exc:
                    logger.exception(
                        'send_supervisor_alert: push failed for supervisor %s: %s',
                        supervisor.email, exc,
                    )

        # Email fallback: send if fallback is enabled AND push was not sent
        if email_fallback and not push_sent:
            try:
                send_mail(
                    subject=f'Neuer Bericht: {worker_name}',
                    message=(
                        f'{worker_name} hat einen Bautagesbericht eingereicht.\n\n'
                        f'Bericht anzeigen: /reports/{report_id}'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[supervisor.email],
                    fail_silently=True,
                )
                logger.info(
                    'send_supervisor_alert: email fallback sent to %s', supervisor.email,
                )
            except Exception as exc:
                logger.exception(
                    'send_supervisor_alert: email fallback failed for %s: %s',
                    supervisor.email, exc,
                )

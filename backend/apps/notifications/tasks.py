"""
Celery tasks for PDF generation and email delivery.
"""

import logging
from django.core.files.base import ContentFile
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger(__name__)


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

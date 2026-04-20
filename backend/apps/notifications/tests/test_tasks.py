import pytest
from unittest.mock import patch, MagicMock


@pytest.mark.django_db
class TestSendReportEmailTask:
    def test_creates_email_delivery_on_success(self, sample_report, worker_user):
        from apps.notifications.tasks import send_report_email_task
        from apps.reports.models import EmailDelivery

        with patch('apps.notifications.tasks.EmailMessage') as mock_email_cls:
            mock_email = MagicMock()
            mock_email_cls.return_value = mock_email
            mock_email.send.return_value = 1

            send_report_email_task(
                str(sample_report.id),
                'recipient@example.de',
                str(worker_user.id),
            )

        delivery = EmailDelivery.objects.filter(
            report=sample_report,
            recipient_email='recipient@example.de',
        ).first()
        assert delivery is not None
        assert delivery.status == 'sent'

    def test_creates_failed_delivery_on_error(self, sample_report, worker_user):
        from apps.notifications.tasks import send_report_email_task
        from apps.reports.models import EmailDelivery

        with patch('apps.notifications.tasks.EmailMessage') as mock_email_cls:
            mock_email = MagicMock()
            mock_email_cls.return_value = mock_email
            mock_email.send.side_effect = Exception('SMTP error')

            with pytest.raises(Exception):
                send_report_email_task.apply(args=[
                    str(sample_report.id),
                    'bad@example.de',
                    str(worker_user.id),
                ])

        # Even on failure a record is created
        delivery = EmailDelivery.objects.filter(
            report=sample_report,
            recipient_email='bad@example.de',
            status='failed',
        ).first()
        assert delivery is not None


@pytest.mark.django_db
class TestGenerateReportPDFTask:
    def test_saves_pdf_file(self, sample_report):
        from apps.notifications.tasks import generate_report_pdf_task

        fake_pdf = b'%PDF-1.4 fake'
        with patch('apps.notifications.tasks.generate_pdf', return_value=fake_pdf):
            generate_report_pdf_task(str(sample_report.id))

        sample_report.refresh_from_db()
        assert sample_report.pdf_file
        assert sample_report.pdf_generated_at is not None

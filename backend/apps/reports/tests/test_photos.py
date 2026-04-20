import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.reports.models import ReportPhoto


@pytest.mark.django_db
class TestReportPhotoUpload:
    def test_worker_can_upload_photo_to_own_report(self, worker_client, sample_report):
        image = SimpleUploadedFile('test.jpg', b'fake-image-data', content_type='image/jpeg')
        response = worker_client.post(
            f'/api/v1/reports/{sample_report.id}/photos/',
            {'image': image, 'caption': 'Baustelle EG'},
            format='multipart',
        )
        assert response.status_code == 201
        assert ReportPhoto.objects.filter(report=sample_report).count() == 1

    def test_worker_cannot_upload_to_other_workers_report(self, api_client, company, project):
        from apps.accounts.models import User
        from apps.reports.models import DailyReport

        worker2 = User.objects.create_user(
            email='w2@test.de', password='pass',
            first_name='A', last_name='B',
            company=company, role='worker',
        )
        worker1 = User.objects.create_user(
            email='w1b@test.de', password='pass',
            first_name='C', last_name='D',
            company=company, role='worker',
        )
        report = DailyReport.objects.create(
            company=company,
            created_by=worker2,
            raw_input_text='x',
            structured_data={},
        )
        api_client.force_authenticate(user=worker1)
        image = SimpleUploadedFile('test.jpg', b'data', content_type='image/jpeg')
        response = api_client.post(
            f'/api/v1/reports/{report.id}/photos/',
            {'image': image},
            format='multipart',
        )
        assert response.status_code in (403, 404)

    def test_cross_tenant_photo_upload_returns_404(self, api_client, other_worker, sample_report):
        api_client.force_authenticate(user=other_worker)
        image = SimpleUploadedFile('test.jpg', b'data', content_type='image/jpeg')
        response = api_client.post(
            f'/api/v1/reports/{sample_report.id}/photos/',
            {'image': image},
            format='multipart',
        )
        assert response.status_code == 404

    def test_photo_appears_in_report_detail(self, worker_client, sample_report):
        ReportPhoto.objects.create(
            report=sample_report,
            uploaded_by=sample_report.created_by,
            caption='Test',
        )
        response = worker_client.get(f'/api/v1/reports/{sample_report.id}/')
        assert response.status_code == 200
        assert 'photos' in response.data

    def test_worker_can_delete_own_photo(self, worker_client, sample_report):
        photo = ReportPhoto.objects.create(
            report=sample_report,
            uploaded_by=sample_report.created_by,
        )
        response = worker_client.delete(f'/api/v1/reports/{sample_report.id}/photos/{photo.id}/')
        assert response.status_code == 204

    def test_list_photos_returns_only_report_photos(self, worker_client, sample_report):
        ReportPhoto.objects.create(
            report=sample_report,
            uploaded_by=sample_report.created_by,
            caption='Foto 1',
        )
        ReportPhoto.objects.create(
            report=sample_report,
            uploaded_by=sample_report.created_by,
            caption='Foto 2',
        )
        response = worker_client.get(f'/api/v1/reports/{sample_report.id}/photos/')
        assert response.status_code == 200
        assert len(response.data) == 2

    def test_patch_updates_caption_and_position(self, worker_client, sample_report):
        photo = ReportPhoto.objects.create(
            report=sample_report,
            uploaded_by=sample_report.created_by,
            caption='Alt',
            position=0,
        )
        response = worker_client.patch(
            f'/api/v1/reports/{sample_report.id}/photos/{photo.id}/',
            {'caption': 'Neu', 'position': 3},
            format='json',
        )
        assert response.status_code == 200
        photo.refresh_from_db()
        assert photo.caption == 'Neu'
        assert photo.position == 3

    def test_unauthenticated_upload_returns_401(self, api_client, sample_report):
        image = SimpleUploadedFile('test.jpg', b'data', content_type='image/jpeg')
        response = api_client.post(
            f'/api/v1/reports/{sample_report.id}/photos/',
            {'image': image},
            format='multipart',
        )
        assert response.status_code == 401

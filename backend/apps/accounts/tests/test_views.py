import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestLoginView:
    def test_login_success(self, api_client, worker_user):
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'worker@test.de',
            'password': 'pass123',
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_wrong_password(self, api_client, worker_user):
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'worker@test.de',
            'password': 'wrong',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_unknown_email(self, api_client):
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'nobody@test.de',
            'password': 'pass123',
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMeView:
    def test_get_own_profile(self, worker_client, worker_user):
        response = worker_client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_200_OK
        data = response.data['data']
        assert data['email'] == worker_user.email
        assert 'password' not in data

    def test_unauthenticated_returns_401(self, api_client):
        response = api_client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_patch_own_profile(self, worker_client):
        response = worker_client.patch('/api/v1/auth/me/', {'phone': '+49123456789'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['phone'] == '+49123456789'

    def test_patch_preferred_language(self, worker_client):
        response = worker_client.patch('/api/v1/auth/me/', {'preferred_language': 'en'})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['preferred_language'] == 'en'


@pytest.mark.django_db
class TestAdminUserViews:
    def test_admin_can_list_company_users(self, admin_client, worker_user, supervisor_user):
        response = admin_client.get('/api/v1/admin-panel/users/')
        assert response.status_code == status.HTTP_200_OK
        emails = [u['email'] for u in response.data['data']]
        assert 'worker@test.de' in emails

    def test_worker_cannot_access_admin_panel(self, worker_client):
        response = worker_client.get('/api/v1/admin-panel/users/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_cannot_see_other_company_users(self, admin_client, other_worker):
        response = admin_client.get('/api/v1/admin-panel/users/')
        emails = [u['email'] for u in response.data['data']]
        assert 'other@test.de' not in emails

    def test_admin_create_user(self, admin_client):
        response = admin_client.post('/api/v1/admin-panel/users/', {
            'email': 'new@test.de',
            'password': 'StrongPass123!',
            'first_name': 'Neuer',
            'last_name': 'Mitarbeiter',
            'role': 'worker',
        })
        assert response.status_code == status.HTTP_201_CREATED
        assert 'password' not in response.data['data']

    def test_admin_stats(self, admin_client, sample_report):
        response = admin_client.get('/api/v1/admin-panel/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_reports' in response.data['data']

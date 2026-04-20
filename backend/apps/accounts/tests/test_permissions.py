import pytest
from rest_framework.test import APIRequestFactory
from unittest.mock import MagicMock

from apps.accounts.permissions import IsCompanyAdmin, IsSupervisorOrAdmin, IsSameCompany


@pytest.mark.django_db
class TestIsCompanyAdmin:
    def test_company_admin_has_permission(self, admin_user):
        perm = IsCompanyAdmin()
        request = MagicMock()
        request.user = admin_user
        assert perm.has_permission(request, None) is True

    def test_worker_lacks_permission(self, worker_user):
        perm = IsCompanyAdmin()
        request = MagicMock()
        request.user = worker_user
        assert perm.has_permission(request, None) is False

    def test_supervisor_lacks_permission(self, supervisor_user):
        perm = IsCompanyAdmin()
        request = MagicMock()
        request.user = supervisor_user
        assert perm.has_permission(request, None) is False


@pytest.mark.django_db
class TestIsSupervisorOrAdmin:
    def test_supervisor_has_permission(self, supervisor_user):
        perm = IsSupervisorOrAdmin()
        request = MagicMock()
        request.user = supervisor_user
        assert perm.has_permission(request, None) is True

    def test_admin_has_permission(self, admin_user):
        perm = IsSupervisorOrAdmin()
        request = MagicMock()
        request.user = admin_user
        assert perm.has_permission(request, None) is True

    def test_worker_lacks_permission(self, worker_user):
        perm = IsSupervisorOrAdmin()
        request = MagicMock()
        request.user = worker_user
        assert perm.has_permission(request, None) is False


@pytest.mark.django_db
class TestIsSameCompany:
    def test_same_company_object_allowed(self, worker_user, sample_report):
        perm = IsSameCompany()
        request = MagicMock()
        request.user = worker_user
        assert perm.has_object_permission(request, None, sample_report) is True

    def test_other_company_object_denied(self, other_worker, sample_report):
        perm = IsSameCompany()
        request = MagicMock()
        request.user = other_worker
        assert perm.has_object_permission(request, None, sample_report) is False

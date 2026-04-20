import pytest
from apps.accounts.models import Company, User


@pytest.mark.django_db
class TestCompanyModel:
    def test_str_representation(self, company):
        assert str(company) == 'Test GmbH'

    def test_uuid_primary_key(self, company):
        import uuid
        assert isinstance(company.id, uuid.UUID)

    def test_default_preferred_language(self, company):
        assert company.preferred_language == 'de'


@pytest.mark.django_db
class TestUserModel:
    def test_str_representation(self, worker_user):
        assert 'Hans' in str(worker_user)
        assert 'Müller' in str(worker_user)
        assert 'worker@test.de' in str(worker_user)

    def test_uuid_primary_key(self, worker_user):
        import uuid
        assert isinstance(worker_user.id, uuid.UUID)

    def test_password_hashed(self, worker_user):
        assert worker_user.password != 'pass123'
        assert worker_user.check_password('pass123')

    def test_get_full_name(self, worker_user):
        assert worker_user.get_full_name() == 'Hans Müller'

    def test_company_relationship(self, worker_user, company):
        assert worker_user.company == company

    def test_default_role_is_worker(self, worker_user):
        assert worker_user.role == 'worker'

    def test_supervisor_role(self, supervisor_user):
        assert supervisor_user.role == 'supervisor'

    def test_admin_role(self, admin_user):
        assert admin_user.role == 'company_admin'

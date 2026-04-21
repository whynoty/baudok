"""
Tests for Material & Equipment Catalog — Feature 9.
"""
import io
import pytest
from django.urls import reverse


@pytest.mark.django_db
class TestMaterialItemCRUD:
    """GIVEN supervisor role WHEN managing materials SHOULD apply permissions and tenant scope."""

    def test_supervisor_can_create_material(self, api_client, supervisor_user, company):
        api_client.force_authenticate(user=supervisor_user)
        url = '/api/v1/catalog/materials/'
        data = {'name': 'Beton C25', 'unit': 'm³', 'category': 'Beton'}
        resp = api_client.post(url, data)
        assert resp.status_code == 201
        assert resp.data['name'] == 'Beton C25'
        assert resp.data['unit'] == 'm³'

    def test_worker_cannot_create_material(self, api_client, worker_user):
        api_client.force_authenticate(user=worker_user)
        resp = api_client.post('/api/v1/catalog/materials/', {'name': 'Test'})
        assert resp.status_code == 403

    def test_worker_can_list_materials(self, api_client, worker_user, company):
        from apps.reports.models import MaterialItem
        MaterialItem.objects.create(company=company, name='Holzbalken', unit='lm')
        api_client.force_authenticate(user=worker_user)
        resp = api_client.get('/api/v1/catalog/materials/')
        assert resp.status_code == 200
        assert any(m['name'] == 'Holzbalken' for m in resp.data)

    def test_search_filters_by_name(self, api_client, worker_user, company):
        from apps.reports.models import MaterialItem
        MaterialItem.objects.create(company=company, name='Ziegelstein')
        MaterialItem.objects.create(company=company, name='Betonstein')
        api_client.force_authenticate(user=worker_user)
        resp = api_client.get('/api/v1/catalog/materials/?search=Ziegel')
        assert resp.status_code == 200
        names = [m['name'] for m in resp.data]
        assert 'Ziegelstein' in names
        assert 'Betonstein' not in names

    def test_delete_softdeletes_not_destroys(self, api_client, supervisor_user, company):
        from apps.reports.models import MaterialItem
        item = MaterialItem.objects.create(company=company, name='Schalung')
        api_client.force_authenticate(user=supervisor_user)
        resp = api_client.delete(f'/api/v1/catalog/materials/{item.id}/')
        assert resp.status_code == 204
        item.refresh_from_db()
        assert item.is_active is False

    def test_cross_tenant_user_sees_only_own_materials(
        self, api_client, other_worker, other_company, company
    ):
        from apps.reports.models import MaterialItem
        MaterialItem.objects.create(company=company, name='EigenMaterial')
        MaterialItem.objects.create(company=other_company, name='FremdMaterial')
        api_client.force_authenticate(user=other_worker)
        resp = api_client.get('/api/v1/catalog/materials/')
        assert resp.status_code == 200
        names = [m['name'] for m in resp.data]
        assert 'FremdMaterial' in names
        assert 'EigenMaterial' not in names


@pytest.mark.django_db
class TestEquipmentItemCRUD:
    """GIVEN supervisor role WHEN managing equipment SHOULD apply permissions."""

    def test_supervisor_can_create_equipment(self, api_client, supervisor_user, company):
        api_client.force_authenticate(user=supervisor_user)
        resp = api_client.post(
            '/api/v1/catalog/equipment/',
            {'name': 'Bagger', 'equipment_type': 'Fahrzeug', 'daily_rate': '450.00'},
        )
        assert resp.status_code == 201
        assert resp.data['name'] == 'Bagger'

    def test_worker_cannot_create_equipment(self, api_client, worker_user):
        api_client.force_authenticate(user=worker_user)
        resp = api_client.post('/api/v1/catalog/equipment/', {'name': 'Kran'})
        assert resp.status_code == 403


@pytest.mark.django_db
class TestMaterialCSVImport:
    """GIVEN a CSV file WHEN imported SHOULD upsert items correctly."""

    def _make_csv(self, rows):
        header = 'name,unit,unit_cost,category\n'
        body = '\n'.join(','.join(str(v) for v in row) for row in rows)
        return io.BytesIO((header + body).encode('utf-8'))

    def test_import_creates_items(self, api_client, supervisor_user, company):
        api_client.force_authenticate(user=supervisor_user)
        csv_file = self._make_csv([
            ('Beton C30', 'm³', '85.00', 'Beton'),
            ('Armierungsstahl', 'kg', '1.20', 'Stahl'),
            ('Schalung', 'm²', '', 'Holz'),
        ])
        resp = api_client.post(
            '/api/v1/catalog/materials/import/',
            {'file': csv_file},
            format='multipart',
        )
        assert resp.status_code == 200
        assert resp.data['created'] == 3
        assert resp.data['updated'] == 0
        assert resp.data['skipped'] == 0

    def test_import_updates_existing_item(self, api_client, supervisor_user, company):
        from apps.reports.models import MaterialItem
        MaterialItem.objects.create(company=company, name='Beton C30', unit='m³')
        api_client.force_authenticate(user=supervisor_user)
        csv_file = self._make_csv([('Beton C30', 'm³', '95.00', 'Beton')])
        resp = api_client.post(
            '/api/v1/catalog/materials/import/',
            {'file': csv_file},
            format='multipart',
        )
        assert resp.status_code == 200
        assert resp.data['created'] == 0
        assert resp.data['updated'] == 1

    def test_import_skips_blank_name_rows(self, api_client, supervisor_user, company):
        api_client.force_authenticate(user=supervisor_user)
        csv_file = self._make_csv([('', '', '', ''), ('Kies', 't', '', 'Schüttgut')])
        resp = api_client.post(
            '/api/v1/catalog/materials/import/',
            {'file': csv_file},
            format='multipart',
        )
        assert resp.status_code == 200
        assert resp.data['created'] == 1
        assert resp.data['skipped'] == 1

    def test_worker_cannot_import(self, api_client, worker_user):
        api_client.force_authenticate(user=worker_user)
        csv_file = self._make_csv([('Sand', 't', '', '')])
        resp = api_client.post(
            '/api/v1/catalog/materials/import/',
            {'file': csv_file},
            format='multipart',
        )
        assert resp.status_code == 403

import csv
import io

from rest_framework import status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSupervisorOrAdmin
from .models import EquipmentItem, MaterialItem
from .serializers import EquipmentItemSerializer, MaterialItemSerializer


class MaterialItemViewSet(viewsets.ModelViewSet):
    """
    /api/v1/catalog/materials/

    GET  (all roles)  — list active items, optional ?search= and ?category= filters
    POST (supervisor/admin) — create
    PATCH (supervisor/admin) — partial update
    DELETE (supervisor/admin) — soft delete (sets is_active=False)
    """

    serializer_class = MaterialItemSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ('create', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsSupervisorOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = MaterialItem.objects.filter(
            company=self.request.user.company,
            is_active=True,
        )
        search = self.request.query_params.get('search', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(name__icontains=search) | Q(category__icontains=search))
        category = self.request.query_params.get('category', '').strip()
        if category:
            qs = qs.filter(category__iexact=category)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: set is_active=False instead of deleting the row."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class EquipmentItemViewSet(viewsets.ModelViewSet):
    """
    /api/v1/catalog/equipment/

    GET  (all roles)  — list active items, optional ?search= filter
    POST (supervisor/admin) — create
    PATCH (supervisor/admin) — partial update
    DELETE (supervisor/admin) — soft delete
    """

    serializer_class = EquipmentItemSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ('create', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsSupervisorOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = EquipmentItem.objects.filter(
            company=self.request.user.company,
            is_active=True,
        )
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: set is_active=False instead of deleting the row."""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class MaterialCSVImportView(APIView):
    """
    POST /api/v1/catalog/materials/import/

    Accepts multipart/form-data with a 'file' field containing a CSV.
    Expected columns: name, unit (optional), unit_cost (optional), category (optional).
    Rows with blank name are skipped.
    Upserts by (company, name) — updates existing, creates new.
    Returns { "created": N, "updated": M, "skipped": K }.
    Supervisor/admin only.
    """

    permission_classes = [IsAuthenticated, IsSupervisorOrAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'Keine Datei übergeben.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            text = uploaded_file.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'Datei muss UTF-8-kodiert sein.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reader = csv.DictReader(io.StringIO(text))

        # Normalise header names to lowercase stripped strings
        if reader.fieldnames is None:
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'CSV-Datei ist leer oder hat keine Kopfzeile.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_count = 0
        updated_count = 0
        skipped_count = 0
        company = request.user.company

        for row in reader:
            # Normalise keys (tolerate BOM, extra spaces, varying case)
            normalised = {k.strip().lower(): (v.strip() if v else '') for k, v in row.items()}
            name = normalised.get('name', '')
            if not name:
                skipped_count += 1
                continue

            unit = normalised.get('unit', '')
            category = normalised.get('category', '')
            raw_cost = normalised.get('unit_cost', '')
            unit_cost = None
            if raw_cost:
                try:
                    unit_cost = float(raw_cost.replace(',', '.'))
                except ValueError:
                    unit_cost = None

            obj, created = MaterialItem.objects.update_or_create(
                company=company,
                name=name,
                defaults={
                    'unit': unit,
                    'category': category,
                    'unit_cost': unit_cost,
                    'is_active': True,
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        return Response(
            {'created': created_count, 'updated': updated_count, 'skipped': skipped_count},
            status=status.HTTP_200_OK,
        )

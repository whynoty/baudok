import io
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSameCompany, IsSupervisorOrAdmin, IsOwnerOrSupervisorOrAdmin
from .export import generate_csv, generate_excel
from .filters import DailyReportFilter, ProjectFilter
from .models import DailyReport, EmailDelivery, Project, ReportEntry, ReportPhoto
from .serializers import (
    DailyReportSerializer,
    DailyReportUpdateSerializer,
    EmailDeliverySerializer,
    ProjectSerializer,
    ReportEntrySerializer,
    ReportPhotoSerializer,
    ReviewSerializer,
    SendEmailSerializer,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'per_page'
    max_page_size = 100


def _company_report_queryset(user):
    """Base queryset filtered by company and user role."""
    qs = DailyReport.objects.filter(company=user.company).select_related(
        'created_by', 'reviewed_by', 'project'
    ).prefetch_related('entries', 'photos')
    if user.role == 'worker':
        qs = qs.filter(created_by=user)
    return qs


# ---------------------------------------------------------------------------
# Photo views
# ---------------------------------------------------------------------------

class ReportPhotoViewSet(viewsets.ModelViewSet):
    """
    Nested viewset for Baustellenfotos attached to a DailyReport.

    All routes are nested under /reports/{report_pk}/photos/.
    Workers may only access photos belonging to their own reports.
    Cross-tenant access always returns 404 (report lookup filtered by company).
    """
    serializer_class = ReportPhotoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def _get_report(self):
        report_id = self.kwargs['report_pk']
        # Cross-tenant: get_object_or_404 filters by company → returns 404 for wrong tenant
        report = get_object_or_404(
            DailyReport,
            id=report_id,
            company=self.request.user.company,
        )
        if self.request.user.role == 'worker' and report.created_by != self.request.user:
            raise PermissionDenied()
        return report

    def get_queryset(self):
        report = self._get_report()
        return ReportPhoto.objects.filter(report=report)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def perform_create(self, serializer):
        report = self._get_report()
        serializer.save(report=report, uploaded_by=self.request.user)


# ---------------------------------------------------------------------------
# Project views
# ---------------------------------------------------------------------------

class ProjectListCreateView(APIView):
    """GET/POST /projects/"""

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsSupervisorOrAdmin()]
        return [IsAuthenticated()]

    def get(self, request):
        qs = Project.objects.filter(company=request.user.company)
        f = ProjectFilter(request.GET, queryset=qs)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(f.qs, request)
        serializer = ProjectSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = ProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(company=request.user.company, created_by=request.user)
        return Response({'data': serializer.data}, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    """GET/PATCH/DELETE /projects/{uuid}/"""

    def get_permissions(self):
        if self.request.method in ('PATCH', 'PUT', 'DELETE'):
            return [IsAuthenticated(), IsSupervisorOrAdmin()]
        return [IsAuthenticated()]

    def _get_project(self, request, pk):
        try:
            return Project.objects.get(id=pk, company=request.user.company)
        except Project.DoesNotExist:
            return None

    def get(self, request, pk):
        project = self._get_project(request, pk)
        if not project:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Projekt nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'data': ProjectSerializer(project).data})

    def patch(self, request, pk):
        project = self._get_project(request, pk)
        if not project:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Projekt nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ProjectSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'data': serializer.data})

    def delete(self, request, pk):
        project = self._get_project(request, pk)
        if not project:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Projekt nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Report views
# ---------------------------------------------------------------------------

class ReportListView(APIView):
    """GET /reports/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = _company_report_queryset(request.user)
        f = DailyReportFilter(request.GET, queryset=qs)
        paginator = StandardPagination()
        page = paginator.paginate_queryset(f.qs, request)
        serializer = DailyReportSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ReportDetailView(APIView):
    """GET/PATCH/DELETE /reports/{uuid}/"""
    permission_classes = [IsAuthenticated]

    def _get_report(self, request, pk):
        try:
            return _company_report_queryset(request.user).get(id=pk)
        except DailyReport.DoesNotExist:
            return None

    def get(self, request, pk):
        report = self._get_report(request, pk)
        if not report:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'data': DailyReportSerializer(report).data})

    def patch(self, request, pk):
        report = self._get_report(request, pk)
        if not report:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Workers can only edit their own; supervisors/admins can edit any in company
        if request.user.role == 'worker' and report.created_by != request.user:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'Keine Berechtigung.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = DailyReportUpdateSerializer(report, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'data': DailyReportSerializer(report).data})

    def delete(self, request, pk):
        report = self._get_report(request, pk)
        if not report:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user.role == 'worker' and report.created_by != request.user:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'Keine Berechtigung.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportReviewView(APIView):
    """POST /reports/{uuid}/review/"""
    permission_classes = [IsAuthenticated, IsSupervisorOrAdmin]

    def post(self, request, pk):
        try:
            report = DailyReport.objects.get(id=pk, company=request.user.company)
        except DailyReport.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report.status = 'reviewed'
        report.reviewed_by = request.user
        report.save(update_fields=['status', 'reviewed_by'])
        return Response({'data': DailyReportSerializer(report).data})


class ReportEntryListView(APIView):
    """GET /reports/{uuid}/entries/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            report = _company_report_queryset(request.user).get(id=pk)
        except DailyReport.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        entries = report.entries.all()
        return Response({'data': ReportEntrySerializer(entries, many=True).data})


class ReportEntryDetailView(APIView):
    """PATCH /reports/{report_uuid}/entries/{entry_uuid}/"""
    permission_classes = [IsAuthenticated]

    def _get_entry(self, request, report_pk, entry_pk):
        try:
            report = _company_report_queryset(request.user).get(id=report_pk)
        except DailyReport.DoesNotExist:
            return None, None
        try:
            return report, report.entries.get(id=entry_pk)
        except ReportEntry.DoesNotExist:
            return report, None

    def patch(self, request, report_pk, entry_pk):
        report, entry = self._get_entry(request, report_pk, entry_pk)
        if report is None or entry is None:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Eintrag nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if request.user.role == 'worker' and report.created_by != request.user:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'Keine Berechtigung.'}},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ReportEntrySerializer(entry, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'data': serializer.data})


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------

class PDFDownloadView(APIView):
    """GET /reports/{uuid}/pdf/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            report = _company_report_queryset(request.user).get(id=pk)
        except DailyReport.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # If PDF already exists, serve it
        if report.pdf_file:
            try:
                response = FileResponse(
                    report.pdf_file.open('rb'),
                    content_type='application/pdf',
                )
                response['Content-Disposition'] = (
                    f'attachment; filename="bericht-{report.report_date}.pdf"'
                )
                return response
            except Exception:
                pass  # Fall through to regenerate

        # Trigger async generation
        from apps.notifications.tasks import generate_report_pdf_task
        generate_report_pdf_task.delay(str(report.id))

        return Response(
            {
                'status': 'generating',
                'poll_url': f'/api/v1/reports/{pk}/pdf/',
            },
            status=status.HTTP_202_ACCEPTED,
        )


# ---------------------------------------------------------------------------
# Export (single report)
# ---------------------------------------------------------------------------

class CSVExportView(APIView):
    """GET /reports/{uuid}/export/csv/"""
    permission_classes = [IsAuthenticated, IsSupervisorOrAdmin]

    def get(self, request, pk):
        try:
            report = DailyReport.objects.get(id=pk, company=request.user.company)
        except DailyReport.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        csv_bytes = generate_csv([report])
        response = HttpResponse(csv_bytes, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = (
            f'attachment; filename="bericht-{report.report_date}.csv"'
        )
        return response


class ExcelExportView(APIView):
    """GET /reports/{uuid}/export/excel/"""
    permission_classes = [IsAuthenticated, IsSupervisorOrAdmin]

    def get(self, request, pk):
        try:
            report = DailyReport.objects.get(id=pk, company=request.user.company)
        except DailyReport.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        excel_bytes = generate_excel([report])
        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = (
            f'attachment; filename="bericht-{report.report_date}.xlsx"'
        )
        return response


# ---------------------------------------------------------------------------
# Send email
# ---------------------------------------------------------------------------

class SendEmailView(APIView):
    """POST /reports/{uuid}/send-email/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            report = _company_report_queryset(request.user).get(id=pk)
        except DailyReport.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = SendEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recipient_email = serializer.validated_data['recipient_email']

        from apps.notifications.tasks import send_report_email_task
        send_report_email_task.delay(str(report.id), recipient_email, str(request.user.id))

        return Response({'detail': f'E-Mail wird an {recipient_email} gesendet.'})


# ---------------------------------------------------------------------------
# Bulk export
# ---------------------------------------------------------------------------

class BulkExportView(APIView):
    """GET /export/reports/?project=&worker=&date_from=&date_to=&format=csv|excel"""
    permission_classes = [IsAuthenticated, IsSupervisorOrAdmin]

    def get(self, request):
        qs = DailyReport.objects.filter(company=request.user.company).select_related(
            'created_by', 'project'
        ).prefetch_related('entries')

        f = DailyReportFilter(request.GET, queryset=qs)
        qs = f.qs

        export_format = request.GET.get('format', 'csv').lower()

        if export_format == 'excel':
            excel_bytes = generate_excel(list(qs))
            response = HttpResponse(
                excel_bytes,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            response['Content-Disposition'] = 'attachment; filename="berichte-export.xlsx"'
            return response
        else:
            csv_bytes = generate_csv(list(qs))
            response = HttpResponse(csv_bytes, content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="berichte-export.csv"'
            return response

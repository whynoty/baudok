from django.urls import path

from .views import (
    CSVExportView,
    ExcelExportView,
    PDFDownloadView,
    ReportDetailView,
    ReportEntryDetailView,
    ReportEntryListView,
    ReportListView,
    ReportPhotoViewSet,
    ReportReviewView,
    SendEmailView,
)

urlpatterns = [
    path('', ReportListView.as_view(), name='report-list'),
    path('<uuid:pk>/', ReportDetailView.as_view(), name='report-detail'),
    path('<uuid:pk>/review/', ReportReviewView.as_view(), name='report-review'),
    path('<uuid:pk>/entries/', ReportEntryListView.as_view(), name='report-entries'),
    path('<uuid:report_pk>/entries/<uuid:entry_pk>/', ReportEntryDetailView.as_view(), name='report-entry-detail'),
    path('<uuid:pk>/pdf/', PDFDownloadView.as_view(), name='report-pdf'),
    path('<uuid:pk>/export/csv/', CSVExportView.as_view(), name='report-csv'),
    path('<uuid:pk>/export/excel/', ExcelExportView.as_view(), name='report-excel'),
    path('<uuid:pk>/send-email/', SendEmailView.as_view(), name='report-send-email'),
    # Photo endpoints
    path(
        '<uuid:report_pk>/photos/',
        ReportPhotoViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='report-photos',
    ),
    path(
        '<uuid:report_pk>/photos/<uuid:pk>/',
        ReportPhotoViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='report-photo-detail',
    ),
]

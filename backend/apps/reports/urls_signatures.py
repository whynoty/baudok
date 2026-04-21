from django.urls import path

from .views_signatures import SignatureListCreateView

urlpatterns = [
    path(
        '<uuid:report_id>/signatures/',
        SignatureListCreateView.as_view(),
        name='report-signatures',
    ),
]

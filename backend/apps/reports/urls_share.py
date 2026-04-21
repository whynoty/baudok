from django.urls import path

from .views_share import ShareLinkDeactivateView, ShareLinkListCreateView

urlpatterns = [
    path(
        'reports/<uuid:report_id>/share/',
        ShareLinkListCreateView.as_view(),
        name='report-share-list-create',
    ),
    path(
        'reports/<uuid:report_id>/share/<uuid:link_id>/',
        ShareLinkDeactivateView.as_view(),
        name='report-share-deactivate',
    ),
]

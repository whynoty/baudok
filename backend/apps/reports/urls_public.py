from django.urls import path

from .views_share import PublicShareView

urlpatterns = [
    path(
        'public/share/<str:token>/',
        PublicShareView.as_view(),
        name='public-share',
    ),
]

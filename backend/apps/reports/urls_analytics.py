from django.urls import path

from .views_analytics import AnalyticsView

urlpatterns = [
    path("", AnalyticsView.as_view(), name="analytics"),
]

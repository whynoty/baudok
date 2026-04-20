from django.urls import path

from .views import (
    AdminCompanyView,
    AdminStatsView,
    AdminUserDetailView,
    AdminUserListCreateView,
)

urlpatterns = [
    path('users/', AdminUserListCreateView.as_view(), name='admin-users'),
    path('users/<uuid:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('company/', AdminCompanyView.as_view(), name='admin-company'),
    path('stats/', AdminStatsView.as_view(), name='admin-stats'),
]

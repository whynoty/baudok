from django.urls import path

from .views import ProjectDetailView, ProjectListCreateView

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list'),
    path('<uuid:pk>/', ProjectDetailView.as_view(), name='project-detail'),
]

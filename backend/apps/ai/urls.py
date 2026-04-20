from django.urls import path

from .views import GenerateReportView, RegenerateReportView

urlpatterns = [
    path('generate/', GenerateReportView.as_view(), name='ai-generate'),
    path('regenerate/<uuid:pk>/', RegenerateReportView.as_view(), name='ai-regenerate'),
]

from django.urls import path

from .views import BulkExportView

urlpatterns = [
    path('reports/', BulkExportView.as_view(), name='bulk-export'),
]

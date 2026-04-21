from django.urls import path
from rest_framework.routers import DefaultRouter

from .views_catalog import EquipmentItemViewSet, MaterialCSVImportView, MaterialItemViewSet

router = DefaultRouter()
router.register('materials', MaterialItemViewSet, basename='material')
router.register('equipment', EquipmentItemViewSet, basename='equipment')

# The import endpoint must be listed before router.urls so Django matches
# 'materials/import/' before the router's 'materials/{pk}/' pattern.
urlpatterns = [
    path('materials/import/', MaterialCSVImportView.as_view(), name='material-import'),
] + router.urls

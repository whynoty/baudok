from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include([
        path('auth/', include('apps.accounts.urls')),
        path('admin-panel/', include('apps.accounts.urls_admin')),
        path('projects/', include('apps.reports.urls_projects')),
        path('reports/', include('apps.reports.urls_reports')),
        path('reports/', include('apps.reports.urls_signatures')),
        path('ai/', include('apps.ai.urls')),
        path('export/', include('apps.reports.urls_export')),
        path('templates/', include('apps.reports.urls_templates')),
        path('weather/', include('apps.reports.urls_weather')),
        path('analytics/', include('apps.reports.urls_analytics')),
        path('', include('apps.reports.urls_share')),
        path('', include('apps.reports.urls_public')),
    ])),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

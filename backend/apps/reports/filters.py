import django_filters

from .models import DailyReport, Project


class DailyReportFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='report_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='report_date', lookup_expr='lte')
    project = django_filters.UUIDFilter(field_name='project__id')
    worker = django_filters.UUIDFilter(field_name='created_by__id')
    status = django_filters.CharFilter(field_name='status')

    class Meta:
        model = DailyReport
        fields = ['date_from', 'date_to', 'project', 'worker', 'status']


class ProjectFilter(django_filters.FilterSet):
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = Project
        fields = ['is_active']

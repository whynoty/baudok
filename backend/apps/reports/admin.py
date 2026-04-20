from django.contrib import admin

from .models import DailyReport, EmailDelivery, Project, ReportEntry, ReportPhoto


class ReportEntryInline(admin.TabularInline):
    model = ReportEntry
    extra = 0
    fields = ['category', 'position', 'content', 'duration_hours', 'quantity']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'project_number', 'is_active', 'created_at']
    list_filter = ['is_active', 'company']
    search_fields = ['name', 'project_number', 'client_name']


@admin.register(DailyReport)
class DailyReportAdmin(admin.ModelAdmin):
    list_display = ['report_date', 'created_by', 'project', 'status', 'ai_tokens_used', 'created_at']
    list_filter = ['status', 'company']
    search_fields = ['created_by__email', 'raw_input_text']
    inlines = [ReportEntryInline]
    date_hierarchy = 'report_date'


@admin.register(ReportEntry)
class ReportEntryAdmin(admin.ModelAdmin):
    list_display = ['report', 'category', 'position', 'content']
    list_filter = ['category']


@admin.register(EmailDelivery)
class EmailDeliveryAdmin(admin.ModelAdmin):
    list_display = ['recipient_email', 'report', 'sent_by', 'sent_at', 'status']
    list_filter = ['status']


@admin.register(ReportPhoto)
class ReportPhotoAdmin(admin.ModelAdmin):
    list_display = ['report', 'caption', 'uploaded_by', 'created_at']
    list_filter = ['report__company']

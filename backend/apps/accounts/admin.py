from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Company, User


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'preferred_language', 'is_active', 'created_at']
    list_filter = ['is_active', 'preferred_language']
    search_fields = ['name', 'slug', 'tax_id']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'company', 'role', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active', 'company']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-date_joined']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Persönliche Daten', {'fields': ('first_name', 'last_name', 'phone', 'trade', 'preferred_language')}),
        ('Unternehmen & Rolle', {'fields': ('company', 'role')}),
        ('Berechtigungen', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Daten', {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'company', 'role'),
        }),
    )
    readonly_fields = ['date_joined', 'last_login']

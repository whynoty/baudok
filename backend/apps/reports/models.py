import secrets
import uuid
from datetime import date
from django.conf import settings
from django.db import models

from apps.accounts.models import Company, User


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    address = models.TextField()
    project_number = models.CharField(max_length=64, blank=True)
    client_name = models.CharField(max_length=255, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_projects'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Projekt'
        verbose_name_plural = 'Projekte'
        indexes = [
            models.Index(fields=['company', 'is_active']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class DailyReport(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Entwurf'),
        ('generated', 'Generiert'),
        ('reviewed', 'Geprüft'),
        ('sent', 'Versendet'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='reports')
    project = models.ForeignKey(
        Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports'
    )
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    reviewed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_reports'
    )
    report_date = models.DateField(default=date.today)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    weather = models.CharField(max_length=100, blank=True)
    temperature = models.SmallIntegerField(null=True, blank=True)
    raw_input_text = models.TextField()
    input_language = models.CharField(max_length=5, default='de')
    structured_data = models.JSONField(default=dict)
    pdf_file = models.FileField(upload_to='reports/pdf/', null=True, blank=True)
    pdf_generated_at = models.DateTimeField(null=True, blank=True)
    ai_model_used = models.CharField(max_length=64, blank=True)
    ai_tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tagesbericht'
        verbose_name_plural = 'Tagesberichte'
        ordering = ['-report_date', '-created_at']
        indexes = [
            models.Index(fields=['company', 'report_date']),
            models.Index(fields=['created_by', 'status']),
        ]

    def __str__(self):
        return f'Bericht {self.report_date} — {self.created_by.get_full_name()}'


class ReportEntry(models.Model):
    CATEGORY_CHOICES = [
        ('work_performed', 'Ausgeführte Arbeiten'),
        ('materials_used', 'Verwendetes Material'),
        ('equipment', 'Geräte/Maschinen'),
        ('personnel', 'Personal'),
        ('obstacle', 'Behinderungen/Probleme'),
        ('safety', 'Sicherheit'),
        ('note', 'Sonstige Notizen'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(DailyReport, on_delete=models.CASCADE, related_name='entries')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    position = models.PositiveSmallIntegerField(default=0)
    content = models.TextField()
    duration_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    quantity = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Berichtseintrag'
        verbose_name_plural = 'Berichtseinträge'
        ordering = ['position']

    def __str__(self):
        return f'{self.get_category_display()} — {self.content[:50]}'


class EmailDelivery(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(DailyReport, on_delete=models.CASCADE, related_name='deliveries')
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    recipient_email = models.EmailField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='sent')
    error_message = models.TextField(blank=True)

    class Meta:
        verbose_name = 'E-Mail-Versand'
        verbose_name_plural = 'E-Mail-Versände'
        ordering = ['-sent_at']

    def __str__(self):
        return f'{self.recipient_email} — {self.status} ({self.sent_at})'


class ReportPhoto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(DailyReport, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='reports/photos/%Y/%m/')
    caption = models.CharField(max_length=255, blank=True)
    taken_at = models.DateTimeField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = 'Baustellenfoto'
        verbose_name_plural = 'Baustellenfotos'
        ordering = ['position', 'created_at']

    def __str__(self):
        return f'Foto zu {self.report} — {self.caption or self.id}'


class ReportTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='report_templates')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_templates')
    name = models.CharField(max_length=255)
    trade = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=500, blank=True)
    raw_input_template = models.TextField()  # pre-filled raw input text
    is_company_wide = models.BooleanField(default=False)  # visible to all company workers if True
    usage_count = models.PositiveIntegerField(default=0)  # incremented each time template is used
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-usage_count', 'name']
        indexes = [models.Index(fields=['company', 'trade'])]

    def __str__(self):
        return f'{self.name} ({self.trade})'


class SignatureRecord(models.Model):
    ROLE_WORKER = 'worker'
    ROLE_SUPERVISOR = 'supervisor'
    ROLE_CHOICES = [(ROLE_WORKER, 'Worker'), (ROLE_SUPERVISOR, 'Supervisor')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey('DailyReport', on_delete=models.CASCADE, related_name='signatures')
    signer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='signatures',
    )
    signer_name = models.CharField(max_length=200)  # denormalized in case user is deleted
    signer_role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    signature_image = models.TextField()  # base64 PNG data URL from canvas
    signed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['signed_at']
        unique_together = [('report', 'signer_role')]  # one signature per role per report
        verbose_name = 'Unterschrift'
        verbose_name_plural = 'Unterschriften'

    def __str__(self):
        return f'{self.signer_name} ({self.get_signer_role_display()}) — {self.report}'


class MaterialItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE, related_name='material_items'
    )
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, blank=True)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = [('company', 'name')]
        verbose_name = 'Katalogartikel (Material)'
        verbose_name_plural = 'Katalogartikel (Materialien)'

    def __str__(self):
        return f'{self.name} ({self.company})'


class EquipmentItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(
        'accounts.Company', on_delete=models.CASCADE, related_name='equipment_items'
    )
    name = models.CharField(max_length=255)
    equipment_type = models.CharField(max_length=100, blank=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = [('company', 'name')]
        verbose_name = 'Katalogartikel (Gerät)'
        verbose_name_plural = 'Katalogartikel (Geräte)'

    def __str__(self):
        return f'{self.name} ({self.company})'


class ShareLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(
        'DailyReport', on_delete=models.CASCADE, related_name='share_links'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    note = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    accessed_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Freigabe-Link'
        verbose_name_plural = 'Freigabe-Links'

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'ShareLink {self.token[:8]}… → {self.report}'

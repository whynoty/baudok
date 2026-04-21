from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from .models import (
    DailyReport,
    EmailDelivery,
    Project,
    ReportEntry,
    ReportPhoto,
    ReportTemplate,
    ShareLink,
    SignatureRecord,
)


class ReportPhotoSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ReportPhoto
        fields = ['id', 'image', 'image_url', 'caption', 'taken_at', 'latitude', 'longitude', 'position', 'created_at']
        read_only_fields = ['id', 'created_at', 'image_url']

    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'address', 'project_number', 'client_name',
            'start_date', 'end_date', 'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ReportEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportEntry
        fields = ['id', 'category', 'position', 'content', 'duration_hours', 'quantity']
        read_only_fields = ['id']


class DailyReportSerializer(serializers.ModelSerializer):
    entries = ReportEntrySerializer(many=True, read_only=True)
    photos = ReportPhotoSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    project_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = DailyReport
        fields = [
            'id', 'project', 'project_id', 'created_by', 'reviewed_by',
            'report_date', 'status', 'weather', 'temperature',
            'raw_input_text', 'input_language', 'structured_data',
            'pdf_file', 'pdf_generated_at',
            'ai_model_used', 'ai_tokens_used',
            'created_at', 'updated_at',
            'entries', 'photos',
        ]
        read_only_fields = [
            'id', 'created_by', 'reviewed_by', 'status',
            'structured_data', 'pdf_file', 'pdf_generated_at',
            'ai_model_used', 'ai_tokens_used',
            'created_at', 'updated_at', 'entries', 'photos',
        ]


class DailyReportUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyReport
        fields = ['weather', 'temperature', 'raw_input_text']


class EmailDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailDelivery
        fields = ['id', 'recipient_email', 'sent_at', 'status', 'error_message']
        read_only_fields = ['id', 'sent_at', 'status', 'error_message']


class SendEmailSerializer(serializers.Serializer):
    recipient_email = serializers.EmailField()


class ReviewSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class ReportTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ReportTemplate
        fields = [
            'id', 'name', 'trade', 'description', 'raw_input_template',
            'is_company_wide', 'usage_count', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_by_name', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


class SignatureRecordSerializer(serializers.ModelSerializer):
    ip_address = serializers.IPAddressField(read_only=True)

    class Meta:
        model = SignatureRecord
        fields = ['id', 'signer_name', 'signer_role', 'signed_at', 'signature_image', 'ip_address']
        read_only_fields = ['id', 'signer_name', 'signer_role', 'signed_at', 'ip_address']


# ---------------------------------------------------------------------------
# ShareLink serializers
# ---------------------------------------------------------------------------


class ShareLinkCreateSerializer(serializers.Serializer):
    expires_days = serializers.IntegerField(default=30, min_value=1, max_value=365)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')


class ShareLinkSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ShareLink
        fields = [
            'id',
            'token',
            'url',
            'expires_at',
            'note',
            'is_active',
            'accessed_count',
            'created_at',
        ]
        read_only_fields = fields

    def get_url(self, obj):
        return f'/share/{obj.token}'


class PublicReportEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportEntry
        fields = ['category', 'content', 'duration_hours']


class PublicReportSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()
    worker_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    entries = serializers.SerializerMethodField()
    share_expires_at = serializers.SerializerMethodField()
    temperature = serializers.SerializerMethodField()

    class Meta:
        model = DailyReport
        fields = [
            'report_date',
            'project_name',
            'weather',
            'temperature',
            'worker_name',
            'company_name',
            'entries',
            'share_expires_at',
        ]

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None

    def get_worker_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_company_name(self, obj):
        return obj.company.name if obj.company else None

    def get_entries(self, obj):
        return PublicReportEntrySerializer(obj.entries.all(), many=True).data

    def get_share_expires_at(self, obj):
        share_link = self.context.get('share_link')
        if share_link:
            return share_link.expires_at
        return None

    def get_temperature(self, obj):
        if obj.temperature is not None:
            return f'{obj.temperature}°C'
        return None

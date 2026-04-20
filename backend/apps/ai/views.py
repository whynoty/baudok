import logging
from django.db import transaction
from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.reports.models import DailyReport, Project, ReportEntry
from apps.reports.serializers import DailyReportSerializer
from .client import BauDokAIClient
from .exceptions import AIParseError, AIClientError

logger = logging.getLogger(__name__)

# Map from structured_data keys to ReportEntry category codes
CATEGORY_MAP = {
    'work_performed': 'work_performed',
    'materials_used': 'materials_used',
    'equipment': 'equipment',
    'personnel': 'personnel',
    'obstacles': 'obstacle',
    'safety_notes': 'safety',
    'general_notes': 'note',
}


def _entry_content(category_key: str, item) -> str:
    """Convert a structured_data item dict into a readable content string."""
    if isinstance(item, str):
        return item

    if category_key == 'work_performed':
        parts = [item.get('description', '')]
        if item.get('location'):
            parts.append(f"Ort: {item['location']}")
        return ' — '.join(p for p in parts if p)

    elif category_key == 'materials_used':
        parts = [item.get('name', '')]
        if item.get('quantity'):
            parts.append(item['quantity'])
        if item.get('note'):
            parts.append(item['note'])
        return ', '.join(p for p in parts if p)

    elif category_key == 'equipment':
        return item.get('name', '')

    elif category_key == 'personnel':
        role = item.get('role', '')
        count = item.get('count', 1)
        return f"{count}x {role}" if role else str(count)

    elif category_key == 'obstacles':
        parts = [item.get('description', '')]
        if item.get('impact'):
            parts.append(f"Auswirkung: {item['impact']}")
        return ' — '.join(p for p in parts if p)

    elif category_key in ('safety_notes', 'general_notes'):
        if isinstance(item, dict):
            return item.get('note', item.get('description', str(item)))
        return str(item)

    return str(item)


def _entry_duration(category_key: str, item):
    if not isinstance(item, dict):
        return None
    hours = item.get('duration_hours') or item.get('hours')
    if hours is not None:
        try:
            return float(hours)
        except (TypeError, ValueError):
            pass
    return None


def _entry_quantity(category_key: str, item) -> str:
    if not isinstance(item, dict):
        return ''
    return str(item.get('quantity', '')) if item.get('quantity') else ''


def _create_entries_from_structured_data(report: DailyReport, structured_data: dict):
    """Create ReportEntry rows from the parsed structured_data dict."""
    entries = []
    position = 0

    for sd_key, category_code in CATEGORY_MAP.items():
        items = structured_data.get(sd_key, [])
        if not items:
            continue
        if isinstance(items, list):
            for item in items:
                content = _entry_content(sd_key, item)
                if not content:
                    continue
                entries.append(ReportEntry(
                    report=report,
                    category=category_code,
                    position=position,
                    content=content,
                    duration_hours=_entry_duration(sd_key, item),
                    quantity=_entry_quantity(sd_key, item),
                ))
                position += 1

    # Summary as a 'note' entry if present
    summary = structured_data.get('summary', '').strip()
    if summary:
        entries.append(ReportEntry(
            report=report,
            category='note',
            position=position,
            content=f'Zusammenfassung: {summary}',
        ))

    ReportEntry.objects.bulk_create(entries)


class GenerateReportView(APIView):
    """POST /ai/generate/"""
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        raw_input = serializers.CharField(min_length=10)
        project_id = serializers.UUIDField(required=False, allow_null=True)
        report_date = serializers.DateField()
        weather = serializers.CharField(required=False, allow_blank=True, default='')
        temperature = serializers.IntegerField(required=False, allow_null=True)

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Resolve project — must belong to same company
        project = None
        if data.get('project_id'):
            try:
                project = Project.objects.get(
                    id=data['project_id'],
                    company=request.user.company,
                )
            except Project.DoesNotExist:
                return Response(
                    {'error': {'code': 'NOT_FOUND', 'message': 'Projekt nicht gefunden.'}},
                    status=status.HTTP_404_NOT_FOUND,
                )

        try:
            ai_client = BauDokAIClient()
            structured_data, tokens_used = ai_client.generate_report(
                raw_input=data['raw_input'],
                report_date=str(data['report_date']),
                project_name=project.name if project else 'Unbekannt',
                worker_name=request.user.get_full_name(),
                trade=request.user.trade,
            )
        except AIParseError as exc:
            logger.error('AIParseError during generate: %s | raw: %s', exc, exc.raw[:300])
            return Response(
                {'error': {
                    'code': 'AI_PARSE_ERROR',
                    'message': 'Bericht konnte nicht generiert werden. Bitte versuchen Sie es erneut.',
                }},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except AIClientError as exc:
            logger.error('AIClientError: %s', exc)
            return Response(
                {'error': {
                    'code': 'AI_CLIENT_ERROR',
                    'message': 'KI-Dienst vorübergehend nicht verfügbar.',
                }},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        with transaction.atomic():
            report = DailyReport.objects.create(
                company=request.user.company,
                project=project,
                created_by=request.user,
                report_date=data['report_date'],
                status='generated',
                weather=data.get('weather', ''),
                temperature=data.get('temperature'),
                raw_input_text=data['raw_input'],
                structured_data=structured_data,
                ai_model_used='claude-sonnet-4-6',
                ai_tokens_used=tokens_used,
            )
            _create_entries_from_structured_data(report, structured_data)

        report.refresh_from_db()
        return Response(
            {'report': DailyReportSerializer(report).data},
            status=status.HTTP_201_CREATED,
        )


class RegenerateReportView(APIView):
    """POST /ai/regenerate/{report_id}/"""
    permission_classes = [IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        raw_input = serializers.CharField(min_length=10, required=False)

    def post(self, request, pk):
        try:
            report = DailyReport.objects.get(id=pk, company=request.user.company)
        except DailyReport.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Workers can only regenerate their own reports
        if request.user.role == 'worker' and report.created_by != request.user:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'Keine Berechtigung.'}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        raw_input = serializer.validated_data.get('raw_input') or report.raw_input_text

        try:
            ai_client = BauDokAIClient()
            structured_data, tokens_used = ai_client.generate_report(
                raw_input=raw_input,
                report_date=str(report.report_date),
                project_name=report.project.name if report.project else 'Unbekannt',
                worker_name=report.created_by.get_full_name(),
                trade=report.created_by.trade,
            )
        except AIParseError as exc:
            logger.error('AIParseError during regenerate: %s', exc)
            return Response(
                {'error': {
                    'code': 'AI_PARSE_ERROR',
                    'message': 'Bericht konnte nicht generiert werden. Bitte versuchen Sie es erneut.',
                }},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except AIClientError as exc:
            logger.error('AIClientError: %s', exc)
            return Response(
                {'error': {
                    'code': 'AI_CLIENT_ERROR',
                    'message': 'KI-Dienst vorübergehend nicht verfügbar.',
                }},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        with transaction.atomic():
            if raw_input != report.raw_input_text:
                report.raw_input_text = raw_input
            report.structured_data = structured_data
            report.ai_model_used = 'claude-sonnet-4-6'
            report.ai_tokens_used = tokens_used
            report.status = 'generated'
            report.pdf_file = None
            report.pdf_generated_at = None
            report.save()

            report.entries.all().delete()
            _create_entries_from_structured_data(report, structured_data)

        report.refresh_from_db()
        return Response({'report': DailyReportSerializer(report).data})

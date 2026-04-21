from datetime import timedelta

from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsSupervisorOrAdmin
from .models import DailyReport, ShareLink
from .serializers import (
    PublicReportSerializer,
    ShareLinkCreateSerializer,
    ShareLinkSerializer,
)


class ShareLinkListCreateView(APIView):
    """
    GET  /api/v1/reports/{report_id}/share/  — list all share links for a report
    POST /api/v1/reports/{report_id}/share/  — create a new share link

    Supervisor/admin only. Workers receive 403.
    Cross-tenant report lookup returns 404.
    """

    permission_classes = [IsAuthenticated, IsSupervisorOrAdmin]

    def _get_report(self, request, report_id):
        return get_object_or_404(
            DailyReport,
            id=report_id,
            company=request.user.company,
        )

    def get(self, request, report_id):
        report = self._get_report(request, report_id)
        links = ShareLink.objects.filter(report=report)
        return Response({'data': ShareLinkSerializer(links, many=True).data})

    def post(self, request, report_id):
        report = self._get_report(request, report_id)
        serializer = ShareLinkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        expires_days = serializer.validated_data['expires_days']
        note = serializer.validated_data.get('note', '')

        link = ShareLink.objects.create(
            report=report,
            created_by=request.user,
            expires_at=timezone.now() + timedelta(days=expires_days),
            note=note,
        )
        return Response(
            {'data': ShareLinkSerializer(link).data},
            status=status.HTTP_201_CREATED,
        )


class ShareLinkDeactivateView(APIView):
    """
    DELETE /api/v1/reports/{report_id}/share/{link_id}/

    Sets is_active=False instead of deleting the record.
    Supervisor/admin only. Cross-tenant returns 404.
    """

    permission_classes = [IsAuthenticated, IsSupervisorOrAdmin]

    def delete(self, request, report_id, link_id):
        report = get_object_or_404(
            DailyReport,
            id=report_id,
            company=request.user.company,
        )
        link = get_object_or_404(ShareLink, id=link_id, report=report)
        link.is_active = False
        link.save(update_fields=['is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicShareView(APIView):
    """
    GET /api/v1/public/share/{token}/

    No authentication required. Returns a read-only subset of the report.
    Returns 404 if token not found, link is inactive, or link is expired.
    Atomically increments accessed_count on every valid access.
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        now = timezone.now()

        try:
            link = ShareLink.objects.select_related(
                'report__created_by',
                'report__company',
                'report__project',
            ).get(token=token)
        except ShareLink.DoesNotExist:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Link nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not link.is_active or link.expires_at < now:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Link nicht gefunden oder abgelaufen.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Atomically increment the access counter
        ShareLink.objects.filter(pk=link.pk).update(
            accessed_count=F('accessed_count') + 1
        )

        report = link.report
        # Prefetch entries for the public serializer
        report.entries.all()  # warm the queryset; serializer will call it again

        serializer = PublicReportSerializer(
            report,
            context={'share_link': link, 'request': request},
        )
        return Response({'data': serializer.data})

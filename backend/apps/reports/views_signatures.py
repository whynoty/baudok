"""
Views for Feature 6: Digital Signature.

Endpoints:
  GET  /api/v1/reports/{report_id}/signatures/  — list signatures for a report
  POST /api/v1/reports/{report_id}/signatures/  — submit a canvas-based signature
"""

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DailyReport, SignatureRecord
from .serializers import SignatureRecordSerializer


def _get_client_ip(request):
    """Extract the real client IP from request headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def _role_for_user(user):
    """Map the app user role to the SignatureRecord signer_role."""
    if user.role in ('supervisor', 'company_admin'):
        return SignatureRecord.ROLE_SUPERVISOR
    return SignatureRecord.ROLE_WORKER


class SignatureListCreateView(APIView):
    """
    GET  — list all signatures for a report.
    POST — submit a new signature; role is derived automatically from the
           requesting user's account role.

    Cross-tenant access returns 404 (report lookup filtered by company).
    Workers can only sign their own reports; supervisors/admins can sign
    any report in their company.
    """

    permission_classes = [IsAuthenticated]

    def _get_report(self, request, report_id):
        """
        Return the DailyReport if it belongs to the user's company, else 404.
        Workers are additionally restricted to their own reports.
        """
        report = get_object_or_404(
            DailyReport,
            id=report_id,
            company=request.user.company,
        )
        if request.user.role == 'worker' and report.created_by != request.user:
            return None
        return report

    def get(self, request, report_id):
        report = self._get_report(request, report_id)
        if report is None:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        signatures = report.signatures.all()
        serializer = SignatureRecordSerializer(signatures, many=True)
        return Response({'data': serializer.data})

    def post(self, request, report_id):
        report = self._get_report(request, report_id)
        if report is None:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Bericht nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate signature_image
        signature_image = request.data.get('signature_image', '')
        if not signature_image or not str(signature_image).startswith('data:image/png;base64,'):
            return Response(
                {'error': 'Invalid signature_image format'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        signer_role = _role_for_user(request.user)

        # Enforce one signature per role per report
        if SignatureRecord.objects.filter(report=report, signer_role=signer_role).exists():
            return Response(
                {'error': 'Signature already exists for this role'},
                status=status.HTTP_409_CONFLICT,
            )

        record = SignatureRecord.objects.create(
            report=report,
            signer=request.user,
            signer_name=request.user.get_full_name(),
            signer_role=signer_role,
            signature_image=signature_image,
            ip_address=_get_client_ip(request),
        )
        serializer = SignatureRecordSerializer(record)
        return Response({'data': serializer.data}, status=status.HTTP_201_CREATED)

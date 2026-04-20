from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Company, User
from .permissions import IsCompanyAdmin
from .serializers import (
    AdminUserUpdateSerializer,
    CompanySerializer,
    PasswordChangeSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


# ---------------------------------------------------------------------------
# Auth views
# ---------------------------------------------------------------------------

class LoginView(TokenObtainPairView):
    """POST /auth/login/ — returns access + refresh tokens."""
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """POST /auth/logout/ — blacklists the refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': {'code': 'VALIDATION_ERROR', 'message': 'Refresh-Token ist erforderlich.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            return Response(
                {'error': {'code': 'INVALID_TOKEN', 'message': str(exc)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """GET/PATCH /auth/me/ — own profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({'data': serializer.data})

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'data': UserSerializer(request.user).data})


class PasswordChangeView(APIView):
    """POST /auth/password/change/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Passwort erfolgreich geändert.'})


# ---------------------------------------------------------------------------
# Admin panel views
# ---------------------------------------------------------------------------

class AdminUserListCreateView(APIView):
    """GET/POST /admin-panel/users/"""
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def get(self, request):
        users = User.objects.filter(company=request.user.company).select_related('company')
        serializer = UserSerializer(users, many=True)
        return Response({'data': serializer.data, 'meta': {'total': users.count()}})

    def post(self, request):
        serializer = UserCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({'data': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    """PATCH/DELETE /admin-panel/users/{uuid}/"""
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def _get_user(self, request, pk):
        try:
            return User.objects.get(id=pk, company=request.user.company)
        except User.DoesNotExist:
            return None

    def patch(self, request, pk):
        user = self._get_user(request, pk)
        if not user:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Benutzer nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'data': UserSerializer(user).data})

    def delete(self, request, pk):
        user = self._get_user(request, pk)
        if not user:
            return Response(
                {'error': {'code': 'NOT_FOUND', 'message': 'Benutzer nicht gefunden.'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        if user == request.user:
            return Response(
                {'error': {'code': 'FORBIDDEN', 'message': 'Sie können Ihren eigenen Account nicht löschen.'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCompanyView(APIView):
    """GET/PATCH /admin-panel/company/"""
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def get(self, request):
        serializer = CompanySerializer(request.user.company)
        return Response({'data': serializer.data})

    def patch(self, request):
        serializer = CompanySerializer(request.user.company, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'data': CompanySerializer(request.user.company).data})


class AdminStatsView(APIView):
    """GET /admin-panel/stats/"""
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def get(self, request):
        from apps.reports.models import DailyReport

        company = request.user.company
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        total_reports = DailyReport.objects.filter(company=company).count()
        reports_this_month = DailyReport.objects.filter(
            company=company, created_at__gte=month_start
        ).count()
        active_workers = User.objects.filter(company=company, is_active=True, role='worker').count()
        pending_review = DailyReport.objects.filter(company=company, status='generated').count()

        return Response({
            'data': {
                'total_reports': total_reports,
                'reports_this_month': reports_this_month,
                'active_workers': active_workers,
                'pending_review': pending_review,
            }
        })

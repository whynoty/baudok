"""
Views for push notification subscription management and preferences.
"""

import logging

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NotificationPreference, PushSubscription
from .serializers import NotificationPreferenceSerializer, PushSubscribeSerializer

logger = logging.getLogger(__name__)


class VapidPublicKeyView(APIView):
    """GET /api/v1/notifications/vapid-public-key/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({'public_key': settings.VAPID_PUBLIC_KEY})


class SubscribeView(APIView):
    """
    POST   /api/v1/notifications/subscribe/  — save / update a push subscription
    DELETE /api/v1/notifications/subscribe/  — deactivate all subscriptions for the user
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PushSubscribeSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request):
        PushSubscription.objects.filter(
            user=request.user,
            is_active=True,
        ).update(is_active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationPreferencesView(APIView):
    """
    GET   /api/v1/notifications/preferences/  — retrieve preferences (creates defaults if absent)
    PATCH /api/v1/notifications/preferences/  — update any subset of preference fields
    """
    permission_classes = [IsAuthenticated]

    def _get_or_create_prefs(self, user):
        prefs, _created = NotificationPreference.objects.get_or_create(user=user)
        return prefs

    def get(self, request):
        prefs = self._get_or_create_prefs(request.user)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    def patch(self, request):
        prefs = self._get_or_create_prefs(request.user)
        serializer = NotificationPreferenceSerializer(
            prefs,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

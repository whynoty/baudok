"""
Serializers for PushSubscription and NotificationPreference.
"""

from rest_framework import serializers

from .models import NotificationPreference, PushSubscription


class PushSubscriptionKeysSerializer(serializers.Serializer):
    p256dh = serializers.CharField()
    auth = serializers.CharField()


class PushSubscribeSerializer(serializers.Serializer):
    endpoint = serializers.CharField()
    keys = PushSubscriptionKeysSerializer()

    def create(self, validated_data):
        keys = validated_data['keys']
        user = self.context['request'].user
        user_agent = self.context['request'].META.get('HTTP_USER_AGENT', '')

        sub, _created = PushSubscription.objects.update_or_create(
            endpoint=validated_data['endpoint'],
            defaults={
                'user': user,
                'p256dh': keys['p256dh'],
                'auth': keys['auth'],
                'user_agent': user_agent[:500],
                'is_active': True,
            },
        )
        return sub


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'daily_reminder',
            'reminder_time',
            'supervisor_alerts',
            'push_enabled',
            'email_fallback',
        ]

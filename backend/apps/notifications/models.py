"""
Models for push notification subscriptions and user notification preferences.
"""

import uuid
from django.conf import settings
from django.db import models


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
    )
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()   # public key
    auth = models.TextField()     # auth secret
    user_agent = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Push-Abonnement'
        verbose_name_plural = 'Push-Abonnements'

    def __str__(self):
        return f'{self.user.email} — {self.endpoint[:60]}'


class NotificationPreference(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_prefs',
    )
    daily_reminder = models.BooleanField(default=True)
    reminder_time = models.TimeField(default='17:00')  # local time for daily reminder
    supervisor_alerts = models.BooleanField(default=True)  # alert on new report needing review
    push_enabled = models.BooleanField(default=True)
    email_fallback = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Benachrichtigungseinstellung'
        verbose_name_plural = 'Benachrichtigungseinstellungen'

    def __str__(self):
        return f'Prefs({self.user.email})'

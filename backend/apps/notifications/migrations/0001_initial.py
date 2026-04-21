# Generated migration for apps.notifications — Feature 8: Push Notifications

import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PushSubscription',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('endpoint', models.TextField(unique=True)),
                ('p256dh', models.TextField()),
                ('auth', models.TextField()),
                ('user_agent', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_active', models.BooleanField(default=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='push_subscriptions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Push-Abonnement',
                'verbose_name_plural': 'Push-Abonnements',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('daily_reminder', models.BooleanField(default=True)),
                ('reminder_time', models.TimeField(default='17:00')),
                ('supervisor_alerts', models.BooleanField(default=True)),
                ('push_enabled', models.BooleanField(default=True)),
                ('email_fallback', models.BooleanField(default=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_prefs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Benachrichtigungseinstellung',
                'verbose_name_plural': 'Benachrichtigungseinstellungen',
            },
        ),
    ]

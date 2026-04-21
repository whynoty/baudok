import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0004_signaturerecord'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ShareLink',
            fields=[
                (
                    'id',
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                (
                    'token',
                    models.CharField(db_index=True, max_length=64, unique=True),
                ),
                ('expires_at', models.DateTimeField()),
                ('note', models.CharField(blank=True, max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('accessed_count', models.IntegerField(default=0)),
                (
                    'created_by',
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    'report',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='share_links',
                        to='reports.dailyreport',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Freigabe-Link',
                'verbose_name_plural': 'Freigabe-Links',
                'ordering': ['-created_at'],
            },
        ),
    ]

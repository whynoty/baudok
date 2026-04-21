# Generated manually for Feature 6: Digital Signature

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('reports', '0003_reporttemplate'),
    ]

    operations = [
        migrations.CreateModel(
            name='SignatureRecord',
            fields=[
                (
                    'id',
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ('signer_name', models.CharField(max_length=200)),
                (
                    'signer_role',
                    models.CharField(
                        choices=[('worker', 'Worker'), ('supervisor', 'Supervisor')],
                        max_length=20,
                    ),
                ),
                ('signature_image', models.TextField()),
                ('signed_at', models.DateTimeField(auto_now_add=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                (
                    'report',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='signatures',
                        to='reports.dailyreport',
                    ),
                ),
                (
                    'signer',
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='signatures',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'verbose_name': 'Unterschrift',
                'verbose_name_plural': 'Unterschriften',
                'ordering': ['signed_at'],
                'unique_together': {('report', 'signer_role')},
            },
        ),
    ]

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
        ('reports', '0005_sharelink'),
    ]

    operations = [
        migrations.CreateModel(
            name='MaterialItem',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('unit', models.CharField(blank=True, max_length=50)),
                ('unit_cost', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('category', models.CharField(blank=True, max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='material_items',
                    to='accounts.company',
                )),
            ],
            options={
                'verbose_name': 'Katalogartikel (Material)',
                'verbose_name_plural': 'Katalogartikel (Materialien)',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='EquipmentItem',
            fields=[
                ('id', models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('equipment_type', models.CharField(blank=True, max_length=100)),
                ('daily_rate', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='equipment_items',
                    to='accounts.company',
                )),
            ],
            options={
                'verbose_name': 'Katalogartikel (Gerät)',
                'verbose_name_plural': 'Katalogartikel (Geräte)',
                'ordering': ['name'],
            },
        ),
        migrations.AddConstraint(
            model_name='materialitem',
            constraint=models.UniqueConstraint(fields=['company', 'name'], name='unique_material_per_company'),
        ),
        migrations.AddConstraint(
            model_name='equipmentitem',
            constraint=models.UniqueConstraint(fields=['company', 'name'], name='unique_equipment_per_company'),
        ),
    ]

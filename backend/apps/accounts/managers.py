from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Die E-Mail-Adresse ist erforderlich.')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser muss is_staff=True haben.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser muss is_superuser=True haben.')

        # Superusers still need a company — create or use a default one
        from apps.accounts.models import Company
        company, _ = Company.objects.get_or_create(
            slug='system',
            defaults={'name': 'System', 'slug': 'system'},
        )
        extra_fields.setdefault('company_id', company.pk)

        return self.create_user(email, password, **extra_fields)

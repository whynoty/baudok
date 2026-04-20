from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Company, User


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'slug', 'address', 'tax_id', 'preferred_language', 'logo', 'is_active']
        read_only_fields = ['id']


class CompanyMinimalSerializer(serializers.ModelSerializer):
    """Embedded company representation used inside UserSerializer."""

    class Meta:
        model = Company
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    company = CompanyMinimalSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role',
            'trade', 'preferred_language', 'phone', 'company', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined', 'company']


class UserCreateSerializer(serializers.ModelSerializer):
    """Used by company_admin when creating a new user in their company."""
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            'id', 'email', 'password', 'first_name', 'last_name',
            'role', 'trade', 'preferred_language', 'phone',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        company = self.context['request'].user.company
        password = validated_data.pop('password')
        user = User(**validated_data, company=company)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'trade', 'preferred_language', 'phone']


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Das alte Passwort ist falsch.')
        return value


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Admin can also update role and active status."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'trade', 'preferred_language', 'phone', 'role', 'is_active']

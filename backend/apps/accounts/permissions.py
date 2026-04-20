from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsSameCompany(BasePermission):
    """
    Object-level permission that ensures the target resource belongs to
    the same company as the requesting user. Returns 404-style denial
    (handled at view level) for cross-tenant access.
    """

    def has_object_permission(self, request, view, obj):
        # Resolve company from the object
        company = getattr(obj, 'company', None)
        if company is None:
            # For User objects, the company is the direct FK
            created_by = getattr(obj, 'created_by', None)
            if created_by:
                company = getattr(created_by, 'company', None)

        if hasattr(company, 'company'):
            company = company.company

        return company == request.user.company


class IsCompanyAdmin(BasePermission):
    """Allows access only to users with role='company_admin'."""

    message = 'Nur Unternehmensadmins haben Zugriff auf diesen Bereich.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'company_admin'
        )


class IsSupervisorOrAdmin(BasePermission):
    """Allows access to supervisors and company admins."""

    message = 'Nur Vorgesetzte oder Admins haben Zugriff auf diesen Bereich.'

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('supervisor', 'company_admin')
        )


class IsOwnerOrSupervisorOrAdmin(BasePermission):
    """
    Object-level: owner can always access their own resources.
    Supervisors and admins can access any resource in their company.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role in ('supervisor', 'company_admin'):
            # Must still be same company
            company = getattr(obj, 'company', None)
            if company is None and hasattr(obj, 'created_by'):
                company = getattr(obj.created_by, 'company', None)
            return company == user.company

        # Workers can only access their own objects
        created_by = getattr(obj, 'created_by', None)
        if created_by:
            return created_by == user
        return obj == user

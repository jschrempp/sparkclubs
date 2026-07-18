"""Custom permissions for role-based access control."""

from typing import Any

from django.http import HttpRequest
from rest_framework import permissions
from rest_framework.views import APIView


class IsSuperAdmin(permissions.BasePermission):
    """Only super admins can access."""

    def has_permission(self, request: HttpRequest, view: APIView) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.user_type == "super_admin")


class IsSiteAdmin(permissions.BasePermission):
    """Site admins and super admins can access."""

    def has_permission(self, request: HttpRequest, view: APIView) -> bool:
        return bool(
            request.user and request.user.is_authenticated and request.user.user_type in ["site_admin", "super_admin"]
        )


class IsMemberOrAdmin(permissions.BasePermission):
    """Members and admins can access (excludes pending users)."""

    def has_permission(self, request: HttpRequest, view: APIView) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.user_type != "pending")


class IsClubAdmin(permissions.BasePermission):
    """Check if user is admin of the club."""

    def has_object_permission(self, request: HttpRequest, view: APIView, obj: Any) -> bool:
        # Site admins have access to all clubs
        if request.user.is_site_admin():
            return True

        # Get the club from the object
        if hasattr(obj, "club"):
            club = obj.club
        else:
            club = obj

        return request.user.is_club_admin(club)


class IsClubMember(permissions.BasePermission):
    """Check if user is an active member of the club."""

    def has_object_permission(self, request: HttpRequest, view: APIView, obj: Any) -> bool:
        from .models import ClubMembership

        # Site admins have access to all clubs
        if request.user.is_site_admin():
            return True

        # Get the club from the object
        if hasattr(obj, "club"):
            club = obj.club
        else:
            club = obj

        return ClubMembership.objects.filter(club=club, user=request.user, status="active").exists()

"""API views for Spark Clubs application."""

from typing import Any, Optional

from django.conf import settings
from django.db.models import Q
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .models import User, Club, ClubMembership, Topic, TopicInterest, Event, EventAttendance, EventDateOption, EventDateVote, SystemSettings
from .serializers import (
    UserSerializer,
    AdminUserSerializer,
    UserCreateSerializer,
    ClubSerializer,
    ClubMembershipSerializer,
    TopicSerializer,
    TopicInterestSerializer,
    EventSerializer,
    EventAttendanceSerializer,
    EventDateOptionSerializer,
    SystemSettingsSerializer,
)
from .permissions import IsSuperAdmin, IsSiteAdmin, IsMemberOrAdmin, IsClubAdmin, IsClubMember
from .authentication import generate_token_pair, set_refresh_cookie, clear_refresh_cookie, REFRESH_COOKIE_NAME
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


def _validate_password_strength(password: str) -> Optional[str]:
    """Return an error string if password doesn't meet requirements, else None."""
    import re

    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return "Password must contain at least one digit"
    if not re.search(r"[^A-Za-z0-9]", password):
        return "Password must contain at least one special character"
    return None


# ────────────────────────────── Auth Views ──────────────────────────────


class GoogleAuthView(APIView):
    """Handle Google OAuth authentication."""

    permission_classes = [AllowAny]

    def post(self, request: HttpRequest) -> Response:
        if not settings.USE_GOOGLE_OAUTH:
            return Response({"error": "Google OAuth is not enabled"}, status=status.HTTP_400_BAD_REQUEST)

        token = request.data.get("token")
        if not token:
            return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        google_id = idinfo["sub"]
        email = idinfo["email"]
        user = User.objects.filter(Q(google_id=google_id) | Q(email=email)).first()

        if user:
            user.last_login = timezone.now()
            if not user.google_id:
                user.google_id = google_id
            user.save()

            access_token, refresh_token = generate_token_pair(user)
            response = Response({"token": access_token, "user": UserSerializer(user).data})
            set_refresh_cookie(response, refresh_token)
            return response

        return Response({"needs_registration": True, "google_id": google_id, "email": email})


class LoginView(APIView):
    """Handle traditional email/password login."""

    permission_classes = [AllowAny]

    def post(self, request: HttpRequest) -> Response:
        if settings.USE_GOOGLE_OAUTH:
            return Response(
                {"error": "Traditional login is not enabled. Please use Google OAuth."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = request.data.get("email")
        password = request.data.get("password")
        if not email or not password:
            return Response({"error": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if user and user.check_password(password):
            user.last_login = timezone.now()
            user.save()

            access_token, refresh_token = generate_token_pair(user)
            response = Response({"token": access_token, "user": UserSerializer(user).data})
            set_refresh_cookie(response, refresh_token)
            return response

        return Response({"error": "Invalid email or password"}, status=status.HTTP_401_UNAUTHORIZED)


class RegisterView(APIView):
    """Register a new user."""

    permission_classes = [AllowAny]

    def post(self, request: HttpRequest) -> Response:
        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid registration data", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=serializer.validated_data["email"]).exists():
            return Response({"error": "A user with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.USE_GOOGLE_OAUTH and not serializer.validated_data.get("password"):
            return Response({"error": "Password is required"}, status=status.HTTP_400_BAD_REQUEST)

        password = serializer.validated_data.get("password")
        if password:
            error = _validate_password_strength(password)
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        system_settings = SystemSettings.get_settings()
        user_type = "member" if system_settings.auto_approve_users else "pending"
        user = serializer.save(user_type=user_type)

        access_token, refresh_token = generate_token_pair(user)
        response = Response({"token": access_token, "user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        set_refresh_cookie(response, refresh_token)
        return response


class TokenRefreshView(APIView):
    """Issue a new access token using the HttpOnly refresh cookie (rotates token)."""

    permission_classes = [AllowAny]

    def post(self, request: HttpRequest) -> Response:
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh_token:
            return Response({"error": "No refresh token provided"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            old_refresh = RefreshToken(refresh_token)
            user = User.objects.get(id=old_refresh["user_id"])
            if not user.is_active:
                return Response({"error": "User is inactive"}, status=status.HTTP_401_UNAUTHORIZED)

            access_token, new_refresh_token = generate_token_pair(user)
            try:
                old_refresh.blacklist()
            except AttributeError:
                pass
        except (TokenError, User.DoesNotExist) as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({"token": access_token})
        set_refresh_cookie(response, new_refresh_token)
        return response


class LogoutView(APIView):
    """Blacklist the current refresh token and clear the cookie."""

    permission_classes = [AllowAny]

    def post(self, request: HttpRequest) -> Response:
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except (TokenError, AttributeError):
                pass

        response = Response({"message": "Logged out successfully"})
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    """Get current user's profile."""

    def get(self, request: HttpRequest) -> Response:
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """Allow authenticated user to change their own password."""

    def post(self, request: HttpRequest) -> Response:
        current_password = request.data.get("current_password")
        new_password = request.data.get("new_password")

        if not current_password or not new_password:
            return Response(
                {"error": "current_password and new_password are required"}, status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(current_password):
            return Response({"error": "Current password is incorrect"}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({"error": "New password must be at least 8 characters"}, status=status.HTTP_400_BAD_REQUEST)

        error = _validate_password_strength(new_password)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()
        return Response({"message": "Password changed successfully"})


class MyMembershipsView(APIView):
    """Get current user's club memberships."""

    def get(self, request: HttpRequest) -> Response:
        memberships = ClubMembership.objects.filter(user=request.user).select_related("club")
        serializer = ClubMembershipSerializer(memberships, many=True)
        return Response(serializer.data)


class MyEventsView(APIView):
    """Get events where the current user has RSVP'd 'attending'."""

    def get(self, request: HttpRequest) -> Response:
        attendances = EventAttendance.objects.filter(user=request.user, rsvp_status="attending").select_related(
            "event", "event__club", "event__host"
        )
        events = [attendance.event for attendance in attendances]
        now = timezone.now()
        events = [event for event in events if event.start_datetime >= now]
        events.sort(key=lambda e: e.start_datetime)

        serializer = EventSerializer(events, many=True)
        return Response(serializer.data)


# User Management Views
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User model."""

    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self) -> list[Any]:
        if self.action in ["update_user_type", "list"]:
            return [IsSiteAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self) -> type:
        """Use AdminUserSerializer for admin list view."""
        if self.action == "list" and self.request.user.is_site_admin():
            return AdminUserSerializer
        return UserSerializer

    def get_queryset(self) -> Any:
        """Filter users based on permissions and optimize queries."""
        user = self.request.user

        if user.is_site_admin():
            # Optimize query with prefetch_related for memberships
            if self.action == "list":
                return User.objects.prefetch_related("memberships__club").all()
            return User.objects.all()

        # Regular users can only see their own profile
        return User.objects.filter(id=user.id)

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def update_user_type(self, request: HttpRequest, pk: Any = None) -> Response:
        """Update user type (site admin only)."""
        user = self.get_object()
        new_type = request.data.get("user_type")

        if not new_type or new_type not in dict(User.USER_TYPE_CHOICES):
            return Response({"error": "Invalid user type"}, status=status.HTTP_400_BAD_REQUEST)

        # Site admins cannot modify super admins
        if user.user_type == "super_admin" and not request.user.is_super_admin():
            return Response({"error": "Cannot modify super admin"}, status=status.HTTP_403_FORBIDDEN)

        # Users cannot change their own type
        if user.id == request.user.id:
            return Response({"error": "Cannot change your own user type"}, status=status.HTTP_403_FORBIDDEN)

        # Only super admins can promote to super admin
        if new_type == "super_admin" and not request.user.is_super_admin():
            return Response({"error": "Only super admins can promote to super admin"}, status=status.HTTP_403_FORBIDDEN)

        user.user_type = new_type
        user.save()

        return Response(UserSerializer(user).data)

    @action(detail=True, methods=["post"], permission_classes=[IsSiteAdmin])
    def increase_club_limit(self, request: HttpRequest, pk: Any = None) -> Response:
        """Increase a user's club creation limit by 5 (site admin only)."""
        user = self.get_object()

        # Increase limit by 5
        user.club_creation_limit += 5
        user.save()

        return Response(
            {
                "message": f"Club creation limit increased to {user.club_creation_limit}",
                "club_creation_limit": user.club_creation_limit,
            }
        )


# Club Management Views
class ClubViewSet(viewsets.ModelViewSet):
    """ViewSet for Club model."""

    queryset = Club.objects.all()
    serializer_class = ClubSerializer

    def get_queryset(self) -> Any:
        """Filter clubs based on permissions and visibility."""
        user = self.request.user

        base = Club.objects.prefetch_related("memberships")

        # Site admins can see all clubs (active and inactive, public and private)
        if user.is_site_admin():
            return base.all()

        # Regular members can see:
        # 1. All public active clubs
        # 2. Private clubs where they are a member
        active_clubs = base.filter(is_active=True)

        # Get public clubs
        public_clubs = active_clubs.filter(is_public=True)

        # Get private clubs where user is a member
        private_member_clubs = active_clubs.filter(
            is_public=False, memberships__user=user, memberships__status="active"
        )

        # Combine both querysets
        return (public_clubs | private_member_clubs).distinct()

    def get_permissions(self) -> list[Any]:
        if self.action in ["create"]:
            return [IsAuthenticated()]
        elif self.action in ["destroy"]:
            return [IsSuperAdmin()]
        elif self.action in ["update", "partial_update"]:
            return [IsClubAdmin()]
        return [IsMemberOrAdmin()]

    def perform_create(self, serializer: ClubSerializer) -> None:
        """Set created_by when creating a club and validate creation limit."""
        user = self.request.user

        # Check for duplicate club name
        club_name = serializer.validated_data.get("name")
        if Club.objects.filter(name__iexact=club_name).exists():
            raise ValidationError(
                {"name": f'A club with the name "{club_name}" already exists. Please choose a different name.'}
            )

        # Site admins and super admins have no limit
        if not user.is_site_admin():
            # Check how many clubs this user has created
            created_count = Club.objects.filter(created_by=user).count()
            limit = user.club_creation_limit
            if created_count >= limit:
                raise ValidationError(
                    {
                        "error": f"You have reached your maximum limit of {limit} clubs. "
                        "You cannot create more clubs. Contact a site administrator to increase your limit."
                    }
                )

        # Save the club
        club = serializer.save(created_by=user)

        # Automatically add creator as admin member
        ClubMembership.objects.create(club=club, user=user, status="active", is_admin=True)

    def perform_update(self, serializer: ClubSerializer) -> None:
        """Validate club name uniqueness when updating."""
        club_name = serializer.validated_data.get("name")
        club_instance = self.get_object()

        # Check if the new name conflicts with another club
        if club_name and Club.objects.filter(name__iexact=club_name).exclude(id=club_instance.id).exists():
            raise ValidationError(
                {"name": f'A club with the name "{club_name}" already exists. Please choose a different name.'}
            )

        serializer.save()

    @action(detail=True, methods=["get"])
    def members(self, request: HttpRequest, pk: Any = None) -> Response:
        """Get club members."""
        club = self.get_object()

        # Check permissions
        if not request.user.is_club_admin(club):
            # Regular members can only see active members
            memberships = club.memberships.filter(status="active")
        else:
            # Admins can see all members
            memberships = club.memberships.all()

        serializer = ClubMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def join(self, request: HttpRequest, pk: Any = None) -> Response:
        """Request to join a club."""
        club = self.get_object()
        return self._create_or_reactivate_membership(request, club)

    @action(detail=False, methods=["post"], url_path="join-by-token/(?P<token>[^/]+)")
    def join_by_token(self, request: HttpRequest, token: Optional[str] = None) -> Response:
        """Request to join a club via its private invite token (from an invite link).

        Uses an opaque token instead of the numeric club id so invite links
        can't be guessed/enumerated, and works for private clubs too. Treats
        an existing membership as success (idempotent) so the caller always
        gets back a club id to redirect to.
        """
        club = get_object_or_404(Club, invite_token=token, is_active=True)
        return self._create_or_reactivate_membership(request, club, idempotent=True)

    def _create_or_reactivate_membership(self, request: HttpRequest, club: Club, idempotent: bool = False) -> Response:
        """Shared logic for join / join_by_token."""
        # Check if already a member
        existing = ClubMembership.objects.filter(club=club, user=request.user).first()
        if existing:
            # If the membership was removed, allow them to rejoin by creating a new pending request
            if existing.status == "removed":
                # Check if auto-approval is enabled
                system_settings = SystemSettings.get_settings()
                existing.status = "active" if system_settings.auto_approve_club_memberships else "pending"
                existing.save()
                return Response(ClubMembershipSerializer(existing).data, status=status.HTTP_200_OK)
            elif idempotent:
                # Invite links are safe to reuse - just return the existing membership
                return Response(ClubMembershipSerializer(existing).data, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"error": "Already a member or have a pending request"}, status=status.HTTP_400_BAD_REQUEST
                )

        # Check if auto-approval is enabled
        system_settings = SystemSettings.get_settings()
        membership_status = "active" if system_settings.auto_approve_club_memberships else "pending"

        membership = ClubMembership.objects.create(club=club, user=request.user, status=membership_status)

        return Response(ClubMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def leave(self, request: HttpRequest, pk: Any = None) -> Response:
        """Leave a club."""
        club = self.get_object()

        membership = ClubMembership.objects.filter(club=club, user=request.user).first()

        if not membership:
            return Response({"error": "Not a member of this club"}, status=status.HTTP_400_BAD_REQUEST)

        membership.status = "removed"
        membership.save()

        return Response({"message": "Successfully left the club"})


class ClubMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet for ClubMembership model."""

    queryset = ClubMembership.objects.all()
    serializer_class = ClubMembershipSerializer
    permission_classes = [IsClubAdmin]

    @action(detail=True, methods=["post"])
    def approve(self, request: HttpRequest, pk: Any = None) -> Response:
        """Approve a pending membership."""
        membership = self.get_object()

        if membership.status != "pending":
            return Response({"error": "Membership is not pending"}, status=status.HTTP_400_BAD_REQUEST)

        membership.status = "active"
        membership.save()

        return Response(ClubMembershipSerializer(membership).data)

    @action(detail=True, methods=["post"])
    def remove(self, request: HttpRequest, pk: Any = None) -> Response:
        """Remove a member from the club."""
        membership = self.get_object()
        membership.status = "removed"
        membership.save()

        return Response(ClubMembershipSerializer(membership).data)

    @action(detail=True, methods=["post"])
    def set_admin(self, request: HttpRequest, pk: Any = None) -> Response:
        """Set or unset club admin status."""
        membership = self.get_object()
        is_admin = request.data.get("is_admin", False)

        membership.is_admin = is_admin
        membership.save()

        return Response(ClubMembershipSerializer(membership).data)

    @action(detail=True, methods=["post"])
    def set_host_order(self, request: HttpRequest, pk: Any = None) -> Response:
        """Set host rotation order."""
        membership = self.get_object()
        host_order = request.data.get("host_order")

        membership.host_order = host_order
        membership.save()

        return Response(ClubMembershipSerializer(membership).data)


# Topic Management Views
class TopicViewSet(viewsets.ModelViewSet):
    """ViewSet for Topic model."""

    queryset = Topic.objects.all()
    serializer_class = TopicSerializer

    def get_permissions(self) -> list[Any]:
        if self.action in ["create"]:
            return [IsClubMember()]
        elif self.action in ["update", "partial_update", "destroy"]:
            # Club admins or topic creators can modify their own topics
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def check_object_permissions(self, request: HttpRequest, obj: Topic) -> None:
        """Allow club admins OR the topic creator to update/delete."""
        if self.action in ["update", "partial_update", "destroy"]:
            if not request.user.is_club_admin(obj.club) and obj.created_by_id != request.user.id:
                self.permission_denied(request, message="Only club admins or the topic creator can modify this topic.")
        super().check_object_permissions(request, obj)

    def get_queryset(self) -> Any:
        """Filter topics based on permissions and club."""
        user = self.request.user
        club_id = self.request.query_params.get("club")

        queryset = Topic.objects.select_related("created_by", "club").prefetch_related("interests")

        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Non-admins can only see active/inactive topics
        if not user.is_site_admin():
            # Check which clubs user is admin of
            admin_clubs = ClubMembership.objects.filter(user=user, is_admin=True, status="active").values_list(
                "club_id", flat=True
            )

            # Show all topics in clubs where user is admin
            # Show only active/inactive in other clubs
            queryset = queryset.filter(Q(club_id__in=admin_clubs) | Q(status__in=["active", "inactive"]))

        return queryset

    def perform_create(self, serializer: TopicSerializer) -> None:
        """Set created_by when creating a topic."""
        # Check if title already exists in club
        club = serializer.validated_data["club"]
        title = serializer.validated_data["title"]

        if Topic.objects.filter(club=club, title__iexact=title).exists():
            raise ValidationError({"title": "A topic with this title already exists in this club"})

        # Auto-approve if club has auto-approve enabled
        if club.auto_approve_topics:
            serializer.validated_data["status"] = "active"

        # Save the club topic
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def set_interest(self, request: HttpRequest, pk: Any = None) -> Response:
        """Set or update user's interest in a topic."""
        topic = self.get_object()
        interest_type = request.data.get("interest_type")

        if not interest_type:
            return Response({"error": "interest_type is required"}, status=status.HTTP_400_BAD_REQUEST)

        if interest_type not in ["interested", "able_to_lead", "not_interested", "unspecified"]:
            return Response(
                {"error": "Invalid interest type. Must be: interested, able_to_lead, not_interested, or unspecified"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user is member of the club
        if not ClubMembership.objects.filter(club=topic.club, user=request.user, status="active").exists():
            return Response({"error": "Not a member of this club"}, status=status.HTTP_403_FORBIDDEN)

        # Update or create the interest - user can only have one interest type per topic
        interest, created = TopicInterest.objects.update_or_create(
            topic=topic, user=request.user, defaults={"interest_type": interest_type}
        )

        return Response(
            {
                "interest": TopicInterestSerializer(interest).data,
                "created": created,
                "message": "Interest updated successfully" if not created else "Interest set successfully",
            }
        )

    @action(detail=True, methods=["delete", "post"])
    def remove_interest(self, request: HttpRequest, pk: Any = None) -> Response:
        """Remove user's interest in a topic."""
        topic = self.get_object()

        deleted_count, _ = TopicInterest.objects.filter(topic=topic, user=request.user).delete()

        if deleted_count == 0:
            return Response({"message": "No interest to remove"}, status=status.HTTP_200_OK)

        return Response({"message": "Interest removed successfully"})

    @action(detail=True, methods=["get"])
    def interested_users(self, request: HttpRequest, pk: Any = None) -> Response:
        """Get users interested in a topic (admin only)."""
        topic = self.get_object()

        if not request.user.is_club_admin(topic.club):
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        interests = topic.interests.select_related("user").all()
        serializer = TopicInterestSerializer(interests, many=True)
        return Response(serializer.data)


# Event Management Views
class EventViewSet(viewsets.ModelViewSet):
    """ViewSet for Event model."""

    queryset = Event.objects.all()
    serializer_class = EventSerializer

    def get_permissions(self) -> list[Any]:
        if self.action in ["create", "update", "partial_update"]:
            return [IsClubAdmin()]
        return [IsClubMember()]

    def get_queryset(self) -> Any:
        """Filter events based on club and optional status."""
        club_id = self.request.query_params.get("club")
        status_filter = self.request.query_params.get("status")

        queryset = Event.objects.select_related("club", "host").prefetch_related(
            "event_topics__topic", "attendances", "date_options__votes"
        )

        if club_id:
            queryset = queryset.filter(club_id=club_id)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer: EventSerializer) -> None:
        """Set created_by when creating an event."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def rsvp(self, request: HttpRequest, pk: Any = None) -> Response:
        """RSVP to an event."""
        event = self.get_object()
        rsvp_status = request.data.get("rsvp_status", "attending")

        # Check if event is in the future
        if event.start_datetime < timezone.now():
            return Response({"error": "Cannot RSVP to past events"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is member of the club
        if not ClubMembership.objects.filter(club=event.club, user=request.user, status="active").exists():
            return Response({"error": "Not a member of this club"}, status=status.HTTP_403_FORBIDDEN)

        attendance, created = EventAttendance.objects.update_or_create(
            event=event, user=request.user, defaults={"rsvp_status": rsvp_status}
        )

        return Response(EventAttendanceSerializer(attendance).data)

    @action(detail=True, methods=["delete"])
    def cancel_rsvp(self, request: HttpRequest, pk: Any = None) -> Response:
        """Cancel RSVP to an event."""
        event = self.get_object()

        EventAttendance.objects.filter(event=event, user=request.user).delete()

        return Response({"message": "RSVP cancelled"})

    @action(detail=True, methods=["get"])
    def attendees(self, request: HttpRequest, pk: Any = None) -> Response:
        """Get event attendees."""
        event = self.get_object()

        attendances = event.attendances.filter(rsvp_status="attending")
        serializer = EventAttendanceSerializer(attendances, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def vote_date(self, request: HttpRequest, pk: Any = None) -> Response:
        """Vote for a date option on a date_voting event."""
        event = self.get_object()

        if event.status != "date_voting":
            return Response({"error": "Date voting is not active for this event"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is member of the club
        if not ClubMembership.objects.filter(club=event.club, user=request.user, status="active").exists():
            return Response({"error": "Not a member of this club"}, status=status.HTTP_403_FORBIDDEN)

        date_option_id = request.data.get("date_option_id")
        if not date_option_id:
            return Response({"error": "date_option_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        date_option = get_object_or_404(EventDateOption, id=date_option_id, event=event)

        # Toggle vote: if already voted, remove; otherwise add
        existing = EventDateVote.objects.filter(date_option=date_option, user=request.user).first()
        if existing:
            existing.delete()
            return Response({"message": "Vote removed", "voted": False})
        else:
            EventDateVote.objects.create(date_option=date_option, user=request.user)
            return Response({"message": "Vote recorded", "voted": True})

    @action(detail=True, methods=["post"])
    def select_date(self, request: HttpRequest, pk: Any = None) -> Response:
        """Club admin selects a winning date, moving event from date_voting to pending."""
        event = self.get_object()

        if event.status != "date_voting":
            return Response({"error": "Event is not in date voting status"}, status=status.HTTP_400_BAD_REQUEST)

        # Check admin permission
        if not ClubMembership.objects.filter(club=event.club, user=request.user, status="active", is_admin=True).exists():
            return Response({"error": "Only club admins can select a date"}, status=status.HTTP_403_FORBIDDEN)

        date_option_id = request.data.get("date_option_id")
        if not date_option_id:
            return Response({"error": "date_option_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        date_option = get_object_or_404(EventDateOption, id=date_option_id, event=event)

        event.start_datetime = date_option.start_datetime
        event.end_datetime = date_option.end_datetime
        event.status = "pending"
        event.save()

        # Clear all date options and votes
        event.date_options.all().delete()

        serializer = self.get_serializer(event)
        return Response(serializer.data)


# ────────────────────────── System Settings Views ─────────────────────────


class SystemSettingsView(APIView):
    """Get or update system settings (super admin only)."""

    def _check_super_admin(self, request: HttpRequest) -> Optional[Response]:
        if request.user.user_type != "super_admin":
            return Response(
                {"error": "Permission denied. Super admin access required."}, status=status.HTTP_403_FORBIDDEN
            )
        return None

    def get(self, request: HttpRequest) -> Response:
        denied = self._check_super_admin(request)
        if denied:
            return denied

        settings_obj = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def patch(self, request: HttpRequest) -> Response:
        denied = self._check_super_admin(request)
        if denied:
            return denied

        settings_obj = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings_obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(serializer.data)

        return Response(
            {"error": "Invalid settings data", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

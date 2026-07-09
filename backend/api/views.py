"""API views for Spark Clubs application."""
from datetime import datetime
import json
import csv
import re
from io import StringIO
from django.conf import settings
from django.db.models import Q, Count
from django.http import HttpResponse
from django.utils import timezone
from django.contrib.auth import authenticate
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from .models import User, Club, ClubMembership, Topic, TopicInterest, Event, EventTopic, EventAttendance, SystemSettings
from .serializers import (
    UserSerializer, AdminUserSerializer, UserCreateSerializer, ClubSerializer, ClubMembershipSerializer,
    TopicSerializer, TopicInterestSerializer, EventSerializer, EventTopicSerializer, EventAttendanceSerializer,
    SystemSettingsSerializer
)
from .permissions import IsSuperAdmin, IsSiteAdmin, IsMemberOrAdmin, IsClubAdmin, IsClubMember
from .authentication import generate_jwt_token


def _validate_password_strength(password):
    """Return an error string if password doesn't meet requirements, else None."""
    import re
    if len(password) < 8:
        return 'Password must be at least 8 characters'
    if not re.search(r'[A-Z]', password):
        return 'Password must contain at least one uppercase letter'
    if not re.search(r'[a-z]', password):
        return 'Password must contain at least one lowercase letter'
    if not re.search(r'\d', password):
        return 'Password must contain at least one digit'
    if not re.search(r'[^A-Za-z0-9]', password):
        return 'Password must contain at least one special character'
    return None


# Authentication Views
@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """Handle Google OAuth authentication."""
    if not settings.USE_GOOGLE_OAUTH:
        return Response(
            {'error': 'Google OAuth is not enabled'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    token = request.data.get('token')
    
    if not token:
        return Response({'error': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
        
        google_id = idinfo['sub']
        email = idinfo['email']
        
        # Check if user exists
        user = User.objects.filter(Q(google_id=google_id) | Q(email=email)).first()
        
        if user:
            # Update last login
            user.last_login = timezone.now()
            if not user.google_id:
                user.google_id = google_id
            user.save()
            
            # Generate JWT token
            jwt_token = generate_jwt_token(user)
            
            return Response({
                'token': jwt_token,
                'user': UserSerializer(user).data
            })
        else:
            # Return Google info for registration
            return Response({
                'needs_registration': True,
                'google_id': google_id,
                'email': email,
            })
    
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Handle traditional email/password login."""
    if settings.USE_GOOGLE_OAUTH:
        return Response(
            {'error': 'Traditional login is not enabled. Please use Google OAuth.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response(
            {'error': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Authenticate user
    user = User.objects.filter(email__iexact=email).first()
    
    if user and user.check_password(password):
        # Update last login
        user.last_login = timezone.now()
        user.save()
        
        # Generate JWT token
        jwt_token = generate_jwt_token(user)
        
        return Response({
            'token': jwt_token,
            'user': UserSerializer(user).data
        })
    
    return Response(
        {'error': 'Invalid email or password'},
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user."""
    serializer = UserCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        # Check if email already exists
        if User.objects.filter(email=serializer.validated_data['email']).exists():
            return Response(
                {'error': 'A user with this email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure password is provided when Google OAuth is disabled
        if not settings.USE_GOOGLE_OAUTH and not serializer.validated_data.get('password'):
            return Response(
                {'error': 'Password is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        password = serializer.validated_data.get('password')
        if password:
            error = _validate_password_strength(password)
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if auto-approval is enabled
        system_settings = SystemSettings.get_settings()
        if system_settings.auto_approve_users:
            # Auto-approve: set user_type to member
            user = serializer.save(user_type='member')
        else:
            # Default: user remains pending
            user = serializer.save()
        
        jwt_token = generate_jwt_token(user)
        
        return Response({
            'token': jwt_token,
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def me(request):
    """Get current user's profile."""
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
def change_password(request):
    """Allow authenticated user to change their own password."""
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password or not new_password:
        return Response(
            {'error': 'current_password and new_password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not request.user.check_password(current_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < 8:
        return Response(
            {'error': 'New password must be at least 8 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )

    error = _validate_password_strength(new_password)
    if error:
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()
    return Response({'message': 'Password changed successfully'})


@api_view(['GET'])
def my_memberships(request):
    """Get current user's club memberships."""
    memberships = ClubMembership.objects.filter(user=request.user).select_related('club')
    serializer = ClubMembershipSerializer(memberships, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def my_events(request):
    """Get events where the current user has RSVP'd 'attending'."""
    # Get user's attending events
    attendances = EventAttendance.objects.filter(
        user=request.user,
        rsvp_status='attending'
    ).select_related('event', 'event__club', 'event__book', 'event__host')
    
    # Extract events and filter to future events only (optional)
    events = [attendance.event for attendance in attendances]
    
    # Filter to future events (optional - you can remove this to show all events)
    now = timezone.now()
    events = [event for event in events if event.start_datetime >= now]
    
    # Sort by start date (upcoming events first)
    events.sort(key=lambda e: e.start_datetime)
    
    serializer = EventSerializer(events, many=True)
    return Response(serializer.data)


# User Management Views
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User model."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        if self.action in ['update_user_type', 'list']:
            return [IsSiteAdmin()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        """Use AdminUserSerializer for admin list view."""
        if self.action == 'list' and self.request.user.is_site_admin():
            return AdminUserSerializer
        return UserSerializer
    
    def get_queryset(self):
        """Filter users based on permissions and optimize queries."""
        user = self.request.user
        
        if user.is_site_admin():
            # Optimize query with prefetch_related for memberships
            if self.action == 'list':
                return User.objects.prefetch_related(
                    'memberships__club'
                ).all()
            return User.objects.all()
        
        # Regular users can only see their own profile
        return User.objects.filter(id=user.id)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSiteAdmin])
    def update_user_type(self, request, pk=None):
        """Update user type (site admin only)."""
        user = self.get_object()
        new_type = request.data.get('user_type')
        
        if not new_type or new_type not in dict(User.USER_TYPE_CHOICES):
            return Response(
                {'error': 'Invalid user type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Site admins cannot modify super admins
        if user.user_type == 'super_admin' and not request.user.is_super_admin():
            return Response(
                {'error': 'Cannot modify super admin'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Users cannot change their own type
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot change your own user type'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Only super admins can promote to super admin
        if new_type == 'super_admin' and not request.user.is_super_admin():
            return Response(
                {'error': 'Only super admins can promote to super admin'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user.user_type = new_type
        user.save()
        
        return Response(UserSerializer(user).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsSiteAdmin])
    def increase_club_limit(self, request, pk=None):
        """Increase a user's club creation limit by 5 (site admin only)."""
        user = self.get_object()
        
        # Increase limit by 5
        user.club_creation_limit += 5
        user.save()
        
        return Response({
            'message': f'Club creation limit increased to {user.club_creation_limit}',
            'club_creation_limit': user.club_creation_limit
        })


# Club Management Views
class ClubViewSet(viewsets.ModelViewSet):
    """ViewSet for Club model."""
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    
    def get_queryset(self):
        """Filter clubs based on permissions and visibility."""
        user = self.request.user
        
        # Site admins can see all clubs (active and inactive, public and private)
        if user.is_site_admin():
            return Club.objects.all()
        
        # Regular members can see:
        # 1. All public active clubs
        # 2. Private clubs where they are a member
        active_clubs = Club.objects.filter(is_active=True)
        
        # Get public clubs
        public_clubs = active_clubs.filter(is_public=True)
        
        # Get private clubs where user is a member
        private_member_clubs = active_clubs.filter(
            is_public=False,
            memberships__user=user,
            memberships__status='active'
        )
        
        # Combine both querysets
        return (public_clubs | private_member_clubs).distinct()
    
    def get_permissions(self):
        if self.action in ['create']:
            return [IsAuthenticated()]
        elif self.action in ['destroy']:
            return [IsSuperAdmin()]
        elif self.action in ['update', 'partial_update']:
            return [IsClubAdmin()]
        return [IsMemberOrAdmin()]
    
    def perform_create(self, serializer):
        """Set created_by when creating a club and validate creation limit."""
        user = self.request.user
        
        # Check for duplicate club name
        club_name = serializer.validated_data.get('name')
        if Club.objects.filter(name__iexact=club_name).exists():
            raise ValidationError({
                'name': f'A club with the name "{club_name}" already exists. Please choose a different name.'
            })
        
        # Site admins and super admins have no limit
        if not user.is_site_admin():
            # Check how many clubs this user has created
            created_count = Club.objects.filter(created_by=user).count()
            limit = user.club_creation_limit
            if created_count >= limit:
                raise ValidationError({
                    'error': f'You have reached your maximum limit of {limit} clubs. '
                             'You cannot create more clubs. Contact a site administrator to increase your limit.'
                })
        
        # Save the club
        club = serializer.save(created_by=user)
        
        # Automatically add creator as admin member
        ClubMembership.objects.create(
            club=club,
            user=user,
            status='active',
            is_admin=True
        )
    
    def perform_update(self, serializer):
        """Validate club name uniqueness when updating."""
        club_name = serializer.validated_data.get('name')
        club_instance = self.get_object()
        
        # Check if the new name conflicts with another club
        if club_name and Club.objects.filter(name__iexact=club_name).exclude(id=club_instance.id).exists():
            raise ValidationError({
                'name': f'A club with the name "{club_name}" already exists. Please choose a different name.'
            })
        
        serializer.save()
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get club members."""
        club = self.get_object()
        
        # Check permissions
        if not request.user.is_club_admin(club):
            # Regular members can only see active members
            memberships = club.memberships.filter(status='active')
        else:
            # Admins can see all members
            memberships = club.memberships.all()
        
        serializer = ClubMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Request to join a club."""
        club = self.get_object()
        
        # Check if already a member
        existing = ClubMembership.objects.filter(club=club, user=request.user).first()
        if existing:
            # If the membership was removed, allow them to rejoin by creating a new pending request
            if existing.status == 'removed':
                # Check if auto-approval is enabled
                system_settings = SystemSettings.get_settings()
                existing.status = 'active' if system_settings.auto_approve_club_memberships else 'pending'
                existing.save()
                return Response(
                    ClubMembershipSerializer(existing).data,
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'error': 'Already a member or have a pending request'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check if auto-approval is enabled
        system_settings = SystemSettings.get_settings()
        membership_status = 'active' if system_settings.auto_approve_club_memberships else 'pending'
        
        membership = ClubMembership.objects.create(
            club=club,
            user=request.user,
            status=membership_status
        )
        
        return Response(
            ClubMembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a club."""
        club = self.get_object()
        
        membership = ClubMembership.objects.filter(
            club=club, user=request.user
        ).first()
        
        if not membership:
            return Response(
                {'error': 'Not a member of this club'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        membership.status = 'removed'
        membership.save()
        
        return Response({'message': 'Successfully left the club'})


class ClubMembershipViewSet(viewsets.ModelViewSet):
    """ViewSet for ClubMembership model."""
    queryset = ClubMembership.objects.all()
    serializer_class = ClubMembershipSerializer
    permission_classes = [IsClubAdmin]
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending membership."""
        membership = self.get_object()
        
        if membership.status != 'pending':
            return Response(
                {'error': 'Membership is not pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        membership.status = 'active'
        membership.save()
        
        return Response(ClubMembershipSerializer(membership).data)
    
    @action(detail=True, methods=['post'])
    def remove(self, request, pk=None):
        """Remove a member from the club."""
        membership = self.get_object()
        membership.status = 'removed'
        membership.save()
        
        return Response(ClubMembershipSerializer(membership).data)
    
    @action(detail=True, methods=['post'])
    def set_admin(self, request, pk=None):
        """Set or unset club admin status."""
        membership = self.get_object()
        is_admin = request.data.get('is_admin', False)
        
        membership.is_admin = is_admin
        membership.save()
        
        return Response(ClubMembershipSerializer(membership).data)
    
    @action(detail=True, methods=['post'])
    def set_host_order(self, request, pk=None):
        """Set host rotation order."""
        membership = self.get_object()
        host_order = request.data.get('host_order')
        
        membership.host_order = host_order
        membership.save()
        
        return Response(ClubMembershipSerializer(membership).data)


# Topic Management Views
class TopicViewSet(viewsets.ModelViewSet):
    """ViewSet for Topic model."""
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    
    def get_permissions(self):
        if self.action in ['create']:
            return [IsClubMember()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsClubAdmin()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filter topics based on permissions and club."""
        user = self.request.user
        club_id = self.request.query_params.get('club')
        
        queryset = Topic.objects.all()
        
        if club_id:
            queryset = queryset.filter(club_id=club_id)
        
        # Non-admins can only see active/inactive topics
        if not user.is_site_admin():
            # Check which clubs user is admin of
            admin_clubs = ClubMembership.objects.filter(
                user=user, is_admin=True, status='active'
            ).values_list('club_id', flat=True)
            
            # Show all topics in clubs where user is admin
            # Show only active/inactive in other clubs
            queryset = queryset.filter(
                Q(club_id__in=admin_clubs) |
                Q(status__in=['active', 'inactive'])
            )
        
        return queryset
    
    def perform_create(self, serializer):
        """Set created_by when creating a topic."""
        # Check if title already exists in club
        club = serializer.validated_data['club']
        title = serializer.validated_data['title']
        
        if Topic.objects.filter(club=club, title__iexact=title).exists():
            raise ValidationError({
                'title': 'A topic with this title already exists in this club'
            })
        
        # Auto-approve if club has auto-approve enabled
        if club.auto_approve_topics:
            serializer.validated_data['status'] = 'active'
        
        # Save the club topic
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def set_interest(self, request, pk=None):
        """Set or update user's interest in a topic."""
        topic = self.get_object()
        interest_type = request.data.get('interest_type')
        
        if not interest_type:
            return Response(
                {'error': 'interest_type is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if interest_type not in ['interested', 'able_to_lead', 'not_interested', 'unspecified']:
            return Response(
                {'error': 'Invalid interest type. Must be: interested, able_to_lead, not_interested, or unspecified'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is member of the club
        if not ClubMembership.objects.filter(
            club=topic.club, user=request.user, status='active'
        ).exists():
            return Response(
                {'error': 'Not a member of this club'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update or create the interest - user can only have one interest type per topic
        interest, created = TopicInterest.objects.update_or_create(
            topic=topic,
            user=request.user,
            defaults={'interest_type': interest_type}
        )
        
        return Response({
            'interest': TopicInterestSerializer(interest).data,
            'created': created,
            'message': 'Interest updated successfully' if not created else 'Interest set successfully'
        })
    
    @action(detail=True, methods=['delete', 'post'])
    def remove_interest(self, request, pk=None):
        """Remove user's interest in a topic."""
        topic = self.get_object()
        
        deleted_count, _ = TopicInterest.objects.filter(
            topic=topic,
            user=request.user
        ).delete()
        
        if deleted_count == 0:
            return Response(
                {'message': 'No interest to remove'},
                status=status.HTTP_200_OK
            )
        
        return Response({'message': 'Interest removed successfully'})
    
    @action(detail=True, methods=['get'])
    def interested_users(self, request, pk=None):
        """Get users interested in a topic (admin only)."""
        topic = self.get_object()
        
        if not request.user.is_club_admin(topic.club):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        interests = topic.interests.all()
        serializer = TopicInterestSerializer(interests, many=True)
        return Response(serializer.data)


# Event Management Views  
class EventViewSet(viewsets.ModelViewSet):
    """ViewSet for Event model."""
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsClubAdmin()]
        return [IsClubMember()]
    
    def get_queryset(self):
        """Filter events based on club."""
        club_id = self.request.query_params.get('club')
        status_filter = self.request.query_params.get('status', 'active')
        
        queryset = Event.objects.all()
        
        if club_id:
            queryset = queryset.filter(club_id=club_id)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Set created_by when creating an event."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def rsvp(self, request, pk=None):
        """RSVP to an event."""
        event = self.get_object()
        rsvp_status = request.data.get('rsvp_status', 'attending')
        
        # Check if event is in the future
        if event.start_datetime < timezone.now():
            return Response(
                {'error': 'Cannot RSVP to past events'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is member of the club
        if not ClubMembership.objects.filter(
            club=event.club, user=request.user, status='active'
        ).exists():
            return Response(
                {'error': 'Not a member of this club'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        attendance, created = EventAttendance.objects.update_or_create(
            event=event,
            user=request.user,
            defaults={'rsvp_status': rsvp_status}
        )
        
        return Response(EventAttendanceSerializer(attendance).data)
    
    @action(detail=True, methods=['delete'])
    def cancel_rsvp(self, request, pk=None):
        """Cancel RSVP to an event."""
        event = self.get_object()
        
        EventAttendance.objects.filter(
            event=event,
            user=request.user
        ).delete()
        
        return Response({'message': 'RSVP cancelled'})
    
    @action(detail=True, methods=['get'])
    def attendees(self, request, pk=None):
        """Get event attendees."""
        event = self.get_object()
        
        attendances = event.attendances.filter(rsvp_status='attending')
        serializer = EventAttendanceSerializer(attendances, many=True)
        return Response(serializer.data)


# System Settings Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_system_settings(request):
    """Get system settings (super admin only)."""
    if request.user.user_type != 'super_admin':
        return Response(
            {'error': 'Permission denied. Super admin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    settings_obj = SystemSettings.get_settings()
    serializer = SystemSettingsSerializer(settings_obj)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_system_settings(request):
    """Update system settings (super admin only)."""
    if request.user.user_type != 'super_admin':
        return Response(
            {'error': 'Permission denied. Super admin access required.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    settings_obj = SystemSettings.get_settings()
    serializer = SystemSettingsSerializer(settings_obj, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

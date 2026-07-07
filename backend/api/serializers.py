"""Serializers for API models."""
from rest_framework import serializers
from .models import User, Club, ClubMembership, Topic, TopicInterest, Event, EventTopic, EventAttendance, SystemSettings


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'zip_code', 'bio', 
                  'user_type', 'created_at', 'updated_at', 'last_login']
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']


class UserMembershipSerializer(serializers.Serializer):
    """Nested serializer for user's club memberships in admin view."""
    club_id = serializers.IntegerField()
    club_name = serializers.CharField()
    status = serializers.CharField()
    is_admin = serializers.BooleanField()
    joined_at = serializers.DateTimeField()


class AdminUserSerializer(serializers.ModelSerializer):
    """Enhanced serializer for User model with club memberships (admin view)."""
    club_memberships = serializers.SerializerMethodField()
    clubs_created_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'zip_code', 'bio', 
                  'user_type', 'club_creation_limit', 'created_at', 'updated_at', 'last_login', 
                  'club_memberships', 'clubs_created_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']
    
    def get_club_memberships(self, obj):
        """Get all club memberships for the user with club details."""
        memberships = obj.memberships.select_related('club').all()
        return [
            {
                'club_id': membership.club.id,
                'club_name': membership.club.name,
                'status': membership.status,
                'is_admin': membership.is_admin,
                'joined_at': membership.joined_at
            }
            for membership in memberships
        ]
    
    def get_clubs_created_count(self, obj):
        """Get count of clubs this user has created."""
        return obj.created_clubs.count()


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'zip_code', 'bio', 'google_id', 'password']
        
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        
        if password:
            user.set_password(password)
        else:
            # Set unusable password for OAuth users
            user.set_unusable_password()
        
        user.save()
        return user


class ClubSerializer(serializers.ModelSerializer):
    """Serializer for Club model."""
    member_count = serializers.SerializerMethodField()
    admin_count = serializers.SerializerMethodField()
    user_membership = serializers.SerializerMethodField()
    
    class Meta:
        model = Club
        fields = ['id', 'name', 'description', 'zip_code', 'is_active', 'is_public', 'auto_approve_books',
                  'created_by', 'created_at', 'member_count', 'admin_count', 'user_membership']
        read_only_fields = ['id', 'created_at', 'created_by']
    
    def get_member_count(self, obj):
        return obj.memberships.filter(status='active').count()
    
    def get_admin_count(self, obj):
        return obj.memberships.filter(status='active', is_admin=True).count()
    
    def get_user_membership(self, obj):
        """Return the current user's membership status for this club."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        membership = obj.memberships.filter(user=request.user).first()
        if membership:
            return {
                'id': membership.id,
                'status': membership.status,
                'is_admin': membership.is_admin,
                'joined_at': membership.joined_at
            }
        return None


class ClubMembershipSerializer(serializers.ModelSerializer):
    """Serializer for ClubMembership model."""
    user_name = serializers.SerializerMethodField()
    club_name = serializers.CharField(source='club.name', read_only=True)
    club_description = serializers.CharField(source='club.description', read_only=True)
    club_zip_code = serializers.CharField(source='club.zip_code', read_only=True)
    
    class Meta:
        model = ClubMembership
        fields = ['id', 'club', 'user', 'user_name', 'club_name',
                  'club_description', 'club_zip_code',
                  'status', 'is_admin', 'host_order', 'joined_at', 'updated_at']
        read_only_fields = ['id', 'joined_at', 'updated_at']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"


class TopicSerializer(serializers.ModelSerializer):
    """Serializer for Topic model."""
    created_by_name = serializers.SerializerMethodField()
    interest_counts = serializers.SerializerMethodField()
    user_interest = serializers.SerializerMethodField()
    
    class Meta:
        model = Topic
        fields = ['id', 'club', 'title', 'author', 'tabs', 
                  'status', 'created_by', 'created_by_name', 'created_at', 
                  'updated_at', 'interest_counts', 'user_interest']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}"
        return None
    
    def get_interest_counts(self, obj):
        return {
            'interested': obj.interests.filter(interest_type='interested').count(),
            'able_to_lead': obj.interests.filter(interest_type='able_to_lead').count(),
            'not_interested': obj.interests.filter(interest_type='not_interested').count(),
            'unspecified': obj.interests.filter(interest_type='unspecified').count(),
        }
    
    def get_user_interest(self, obj):
        """Return the current user's interest type for this topic, if any."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        interest = obj.interests.filter(user=request.user).first()
        if interest:
            return interest.interest_type
        return None


class TopicInterestSerializer(serializers.ModelSerializer):
    """Serializer for TopicInterest model."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    topic_title = serializers.CharField(source='topic.title', read_only=True)
    
    class Meta:
        model = TopicInterest
        fields = ['id', 'topic', 'user', 'user_email', 'user_name', 'topic_title',
                  'interest_type', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"


class EventSerializer(serializers.ModelSerializer):
    """Serializer for Event model."""
    host_name = serializers.SerializerMethodField()
    topics = serializers.SerializerMethodField()
    club_name = serializers.CharField(source='club.name', read_only=True)
    attendance_count = serializers.SerializerMethodField()
    topic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text='List of topic IDs to associate with this event'
    )
    
    class Meta:
        model = Event
        fields = ['id', 'club', 'title', 'start_datetime', 'end_datetime',
                  'location', 'host', 'host_name', 'topics', 'topic_ids', 'club_name',
                  'status', 'created_by', 'created_at', 'updated_at', 'attendance_count']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_host_name(self, obj):
        if obj.host:
            return f"{obj.host.first_name} {obj.host.last_name}"
        return None
    
    def get_topics(self, obj):
        """Get list of topics associated with this event."""
        event_topics = obj.event_topics.select_related('topic').all()
        return [
            {
                'id': et.topic.id,
                'title': et.topic.title,
                'author': et.topic.author,
            }
            for et in event_topics
        ]
    
    def get_attendance_count(self, obj):
        return obj.attendances.filter(rsvp_status='attending').count()
    
    def validate(self, data):
        """Validate that end_datetime is after start_datetime."""
        if data.get('end_datetime') and data.get('start_datetime'):
            if data['end_datetime'] <= data['start_datetime']:
                raise serializers.ValidationError({
                    'end_datetime': 'End time must be after start time.'
                })
        return data
    
    def create(self, validated_data):
        """Create event and associate topics."""
        topic_ids = validated_data.pop('topic_ids', [])
        event = Event.objects.create(**validated_data)
        
        # Create EventTopic relationships
        for topic_id in topic_ids:
            EventTopic.objects.create(event=event, topic_id=topic_id)
        
        return event
    
    def update(self, instance, validated_data):
        """Update event and associated topics."""
        topic_ids = validated_data.pop('topic_ids', None)
        
        # Update event fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update topics if provided
        if topic_ids is not None:
            # Remove existing topics
            instance.event_topics.all().delete()
            # Add new topics
            for topic_id in topic_ids:
                EventTopic.objects.create(event=instance, topic_id=topic_id)
        
        return instance


class EventTopicSerializer(serializers.ModelSerializer):
    """Serializer for EventTopic model."""
    event_title = serializers.CharField(source='event.title', read_only=True)
    topic_title = serializers.CharField(source='topic.title', read_only=True)
    
    class Meta:
        model = EventTopic
        fields = ['id', 'event', 'topic', 'event_title', 'topic_title', 'created_at']
        read_only_fields = ['id', 'created_at']


class EventAttendanceSerializer(serializers.ModelSerializer):
    """Serializer for EventAttendance model."""
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    event_title = serializers.CharField(source='event.title', read_only=True)
    
    class Meta:
        model = EventAttendance
        fields = ['id', 'event', 'user', 'user_email', 'user_name', 'event_title',
                  'rsvp_status', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for SystemSettings model."""
    
    class Meta:
        model = SystemSettings
        fields = ['setting_id', 'auto_approve_users', 'auto_approve_club_memberships', 'updated_at', 'updated_by']
        read_only_fields = ['setting_id', 'updated_at', 'updated_by']

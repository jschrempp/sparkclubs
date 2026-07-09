from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication."""
    
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('user_type', 'super_admin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model with email as username."""
    
    USER_TYPE_CHOICES = [
        ('pending', 'Pending'),
        ('member', 'Member'),
        ('site_admin', 'Site Admin'),
        ('super_admin', 'Super Admin'),
    ]
    
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    zip_code = models.CharField(
        max_length=5,
        validators=[RegexValidator(r'^\d{5}$', 'Enter a valid 5-digit zip code.')]
    )
    bio = models.TextField(max_length=500, blank=True, null=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='pending')
    google_id = models.CharField(max_length=255, unique=True, blank=True, null=True)
    club_creation_limit = models.IntegerField(default=5, help_text='Maximum number of clubs this user can create')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Django admin fields
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'zip_code']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.email
    
    def is_super_admin(self):
        return self.user_type == 'super_admin'
    
    def is_site_admin(self):
        return self.user_type in ['site_admin', 'super_admin']
    
    def is_club_admin(self, club):
        """Check if user is admin of a specific club."""
        if self.is_site_admin():
            return True
        return ClubMembership.objects.filter(
            club=club, user=self, is_admin=True, status='active'
        ).exists()


class Club(models.Model):
    """Spark discussion club model."""
    
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField()
    zip_code = models.CharField(
        max_length=5,
        validators=[RegexValidator(r'^\d{5}$', 'Enter a valid 5-digit zip code.')]
    )
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_clubs')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=True, help_text='Public clubs are visible to all users. Private clubs are only visible to members.')
    auto_approve_topics = models.BooleanField(default=False, help_text='Automatically approve topics when added. When disabled, club admins must manually approve topics.')
    
    class Meta:
        db_table = 'clubs'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ClubMembership(models.Model):
    """Membership relationship between users and clubs."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('removed', 'Removed'),
    ]
    
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_admin = models.BooleanField(default=False)
    host_order = models.IntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'club_memberships'
        unique_together = [['club', 'user']]
        ordering = ['host_order', 'joined_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.club.name} ({self.status})"


class Topic(models.Model):
    """Discussion topic model for clubs."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('hidden', 'Hidden'),
    ]
    
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='topics')
    title = models.CharField(max_length=500)
    description = models.CharField(max_length=200)
    tabs = models.CharField(max_length=128, blank=True, null=True, help_text='Tags for categorizing topics')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_topics')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'topics'
        unique_together = [['club', 'title']]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['club', 'status']),
            models.Index(fields=['title']),
            models.Index(fields=['description']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.description}"


class TopicInterest(models.Model):
    """Track member interest in discussion topics."""
    
    INTEREST_TYPE_CHOICES = [
        ('interested', 'Interested'),
        ('able_to_lead', 'Able to Lead'),
        ('not_interested', 'Not Interested'),
        ('unspecified', 'Unspecified'),
    ]
    
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='interests')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topic_interests')
    interest_type = models.CharField(max_length=20, choices=INTEREST_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'topic_interests'
        unique_together = [['topic', 'user']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.interest_type} - {self.topic.title}"


class Event(models.Model):
    """Event model for club meetings and gatherings."""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('cancelled', 'Cancelled'),
    ]
    
    club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=200)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    location = models.TextField()
    host = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='hosted_events')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_events')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'events'
        ordering = ['-start_datetime']
        indexes = [
            models.Index(fields=['club', 'status']),
            models.Index(fields=['start_datetime']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.club.name}"


class EventTopic(models.Model):
    """Many-to-many relationship between events and topics."""
    
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='event_topics')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='topic_events')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'event_topics'
        unique_together = [['event', 'topic']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.event.title} - {self.topic.title}"


class EventAttendance(models.Model):
    """Track event attendance and RSVPs."""
    
    RSVP_CHOICES = [
        ('attending', 'Attending'),
        ('maybe', 'Maybe'),
        ('not_attending', 'Not Attending'),
    ]
    
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='attendances')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_attendances')
    rsvp_status = models.CharField(max_length=20, choices=RSVP_CHOICES, default='attending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'event_attendances'
        unique_together = [['event', 'user']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.event.title} ({self.rsvp_status})"


class SystemSettings(models.Model):
    """System-wide settings that can be configured by super admins."""
    
    # Singleton pattern - only one row should exist
    setting_id = models.IntegerField(default=1, unique=True)
    auto_approve_users = models.BooleanField(
        default=False,
        help_text='Automatically approve new user registrations (set user_type to member instead of pending)'
    )
    auto_approve_club_memberships = models.BooleanField(
        default=False,
        help_text='Automatically approve club membership requests (set status to active instead of pending)'
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='settings_updates')
    
    class Meta:
        db_table = 'system_settings'
        verbose_name = 'System Settings'
        verbose_name_plural = 'System Settings'
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton)
        self.setting_id = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, created = cls.objects.get_or_create(setting_id=1)
        return settings
    
    def __str__(self):
        return "System Settings"

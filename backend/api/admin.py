from django.contrib import admin
from .models import User, Club, ClubMembership, Topic, TopicInterest, Event, EventTopic, EventAttendance, SystemSettings

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'user_type', 'created_at')
    list_filter = ('user_type', 'created_at')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-created_at',)
    fieldsets = (
        ('User Information', {
            'fields': ('email', 'first_name', 'last_name', 'zip_code', 'bio')
        }),
        ('Authentication', {
            'fields': ('password', 'google_id')
        }),
        ('Permissions', {
            'fields': ('user_type', 'is_staff', 'is_active', 'is_superuser')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at', 'last_login'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at', 'last_login')

@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ('name', 'zip_code', 'is_public', 'is_active', 'created_at')
    list_filter = ('is_public', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)
    fieldsets = (
        ('Club Information', {
            'fields': ('name', 'description', 'zip_code')
        }),
        ('Settings', {
            'fields': ('is_public', 'is_active', 'created_by')
        }),
        ('Dates', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at', 'created_by')

@admin.register(ClubMembership)
class ClubMembershipAdmin(admin.ModelAdmin):
    list_display = ('club', 'user', 'status', 'is_admin', 'joined_at')
    list_filter = ('status', 'is_admin', 'joined_at')
    search_fields = ('club__name', 'user__email')
    ordering = ('-joined_at',)

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('title', 'description', 'club', 'status', 'tabs', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('title', 'description', 'tabs')
    ordering = ('-created_at',)

@admin.register(TopicInterest)
class TopicInterestAdmin(admin.ModelAdmin):
    list_display = ('topic', 'user', 'interest_type', 'created_at')
    list_filter = ('interest_type', 'created_at')
    search_fields = ('topic__title', 'user__email')
    ordering = ('-created_at',)

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'club', 'start_datetime', 'status', 'host')
    list_filter = ('status', 'start_datetime')
    search_fields = ('title', 'location', 'club__name')
    ordering = ('-start_datetime',)

@admin.register(EventAttendance)
class EventAttendanceAdmin(admin.ModelAdmin):
    list_display = ('event', 'user', 'rsvp_status', 'created_at')
    list_filter = ('rsvp_status', 'created_at')
    search_fields = ('event__title', 'user__email')
    ordering = ('-created_at',)

@admin.register(EventTopic)
class EventTopicAdmin(admin.ModelAdmin):
    list_display = ('event', 'topic', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('event__title', 'topic__title')
    ordering = ('-created_at',)

@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('setting_id', 'auto_approve_users', 'auto_approve_club_memberships', 'updated_at')
    readonly_fields = ('setting_id', 'updated_at')
    
    def has_add_permission(self, request):
        # Only allow one instance
        return not SystemSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Prevent deletion
        return False

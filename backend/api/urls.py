"""URL configuration for API."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'clubs', views.ClubViewSet, basename='club')
router.register(r'memberships', views.ClubMembershipViewSet, basename='membership')
router.register(r'topics', views.TopicViewSet, basename='topic')
router.register(r'events', views.EventViewSet, basename='event')

urlpatterns = [
    # Authentication
    path('auth/google/', views.google_auth, name='google-auth'),
    path('auth/login/', views.login, name='login'),
    path('auth/register/', views.register, name='register'),
    path('auth/refresh/', views.token_refresh, name='token-refresh'),
    path('auth/logout/', views.logout, name='logout'),
    path('auth/me/', views.me, name='me'),
    path('auth/change-password/', views.change_password, name='change-password'),
    path('auth/my-memberships/', views.my_memberships, name='my-memberships'),
    path('auth/my-events/', views.my_events, name='my-events'),
    
    # System settings (super admin only)
    path('system-settings/', views.get_system_settings, name='system-settings'),
    path('system-settings/update/', views.update_system_settings, name='update-system-settings'),
    
    # Router URLs
    path('', include(router.urls)),
]

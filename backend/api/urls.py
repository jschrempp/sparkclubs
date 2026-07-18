"""URL configuration for API."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"clubs", views.ClubViewSet, basename="club")
router.register(r"memberships", views.ClubMembershipViewSet, basename="membership")
router.register(r"topics", views.TopicViewSet, basename="topic")
router.register(r"events", views.EventViewSet, basename="event")

urlpatterns = [
    # Authentication
    path("auth/google/", views.GoogleAuthView.as_view(), name="google-auth"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/refresh/", views.TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("auth/change-password/", views.ChangePasswordView.as_view(), name="change-password"),
    path("auth/my-memberships/", views.MyMembershipsView.as_view(), name="my-memberships"),
    path("auth/my-events/", views.MyEventsView.as_view(), name="my-events"),
    # System settings (super admin only)
    path("system-settings/", views.SystemSettingsView.as_view(), name="system-settings"),
    # Router URLs
    path("", include(router.urls)),
]

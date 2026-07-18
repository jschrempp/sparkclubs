"""JWT helpers built on djangorestframework-simplejwt.

Access tokens are short-lived and returned in the JSON response body so the
frontend can hold them in memory. Refresh tokens are long-lived and are
never exposed in a JSON body - they are only ever set/read via an HttpOnly,
Secure, SameSite=Strict cookie, and are rotated (single-use) on every
refresh per SIMPLE_JWT settings.
"""
from typing import Tuple

from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User

REFRESH_COOKIE_NAME = 'refresh_token'
REFRESH_COOKIE_PATH = '/api/auth/'


def generate_token_pair(user: User) -> Tuple[str, str]:
    """Return (access_token, refresh_token) strings for the given user."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def set_refresh_cookie(response, refresh_token: str) -> None:
    """Attach the refresh token to the response as an HttpOnly cookie."""
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite='Strict',
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response) -> None:
    """Remove the refresh token cookie (used on logout)."""
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)

"""Celery tasks for async email sending via Resend."""

from celery import shared_task
from django.conf import settings
import resend
import logging

logger = logging.getLogger(__name__)

# Initialize Resend with API key on module load
resend.api_key = settings.RESEND_API_KEY


@shared_task(rate_limit="30/m", max_retries=3, default_retry_delay=60)
def send_join_request_alert(club_id: int, requesting_user_id: int, admin_ids: list[int]) -> None:
    """Notify all club admins that someone wants to join their club.

    Only sent when auto_approve_club_memberships is False (manual approval needed).
    """
    if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY:
        logger.info("Email disabled or no Resend API key — skipping join request alert")
        return

    from .models import Club, User

    try:
        club = Club.objects.only("id", "name").get(id=club_id)
        requesting_user = User.objects.only("id", "first_name", "last_name", "email").get(id=requesting_user_id)
        admins = list(User.objects.filter(id__in=admin_ids, is_active=True, email_notifications_enabled=True))

        if not admins:
            logger.info(f"No active admins to notify for club '{club.name}'")
            return

        admin_emails = [{"to": a.email} for a in admins]
        requester_name = f"{requesting_user.first_name} {requesting_user.last_name}"

        resend.Emails.send({
            "from": f"Spark Clubs <{settings.DEFAULT_FROM_EMAIL}>",
            "to": admin_emails,
            "subject": f"{requester_name} wants to join {club.name}",
            "html": f"""
<h2>New Join Request</h2>
<p><strong>{requester_name}</strong> ({requesting_user.email}) has requested to join <strong>{club.name}</strong>.</p>
<p>Please review this request in your club dashboard.</p>
<p><a href="{settings.FRONTEND_URL}/clubs/{club.id}/members">Review membership requests →</a></p>
<hr>
<p style="color:#888;font-size:12px">Spark Clubs — Sent because you are an admin of {club.name}.</p>
""",
        })

        logger.info(f"Join request alert sent to {len(admins)} admin(s) for club '{club.name}'")

    except Exception as e:
        logger.error(f"Failed to send join request alert for club {club_id}: {e}")
        raise  # Celery will retry based on retry settings


@shared_task(rate_limit="30/m", max_retries=3, default_retry_delay=60)
def send_membership_approved_alert(membership_id: int) -> None:
    """Notify a member that their join request was approved."""
    if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY:
        logger.info("Email disabled or no Resend API key — skipping approval alert")
        return

    from .models import ClubMembership

    try:
        membership = ClubMembership.objects.select_related("club", "user").only(
            "club__id", "club__name", "user__first_name", "user__email", "user__email_notifications_enabled"
        ).get(id=membership_id)

        user = membership.user
        if not user.is_active or not user.email_notifications_enabled:
            logger.info(f"Skipping approval alert for {user.email} — inactive or opted out")
            return

        club = membership.club

        resend.Emails.send({
            "from": f"Spark Clubs <{settings.DEFAULT_FROM_EMAIL}>",
            "to": [user.email],
            "subject": f"You've been approved for {club.name}!",
            "html": f"""
<h2>Welcome to {club.name}!</h2>
<p>Hi {user.first_name}, your request to join <strong>{club.name}</strong> has been approved.</p>
<p>You can now participate in discussions, RSVP to events, and suggest topics.</p>
<p><a href="{settings.FRONTEND_URL}/clubs/{club.id}">Go to {club.name} →</a></p>
<hr>
<p style="color:#888;font-size:12px">Spark Clubs</p>
""",
        })

        logger.info(f"Approval alert sent to {user.email} for club '{club.name}'")

    except Exception as e:
        logger.error(f"Failed to send approval alert for membership {membership_id}: {e}")
        raise


@shared_task(rate_limit="30/m", max_retries=3, default_retry_delay=60)
def send_member_removed_alert(club_name: str, user_email: str, user_first_name: str) -> None:
    """Notify a member that they were removed from a club."""
    if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY:
        logger.info("Email disabled or no Resend API key — skipping removal alert")
        return

    try:
        resend.Emails.send({
            "from": f"Spark Clubs <{settings.DEFAULT_FROM_EMAIL}>",
            "to": [user_email],
            "subject": f"You have been removed from {club_name}",
            "html": f"""
<h2>Membership Update</h2>
<p>Hi {user_first_name}, your membership in <strong>{club_name}</strong> has been removed.</p>
<p>If you believe this was a mistake, please contact the club administrator.</p>
<p><a href="{settings.FRONTEND_URL}/clubs">Browse other clubs →</a></p>
<hr>
<p style="color:#888;font-size:12px">Spark Clubs</p>
""",
        })

        logger.info(f"Removal alert sent to {user_email} for club '{club_name}'")

    except Exception as e:
        logger.error(f"Failed to send removal alert to {user_email}: {e}")
        raise


@shared_task(rate_limit="10/m", max_retries=2, default_retry_delay=30)
def send_test_email(to_email: str, subject: str, body: str) -> None:
    """Send a test email (used by site admins to verify email configuration)."""
    if not settings.RESEND_API_KEY:
        logger.error("No Resend API key configured — cannot send test email")
        raise ValueError("Resend API key is not configured")

    try:
        resend.Emails.send({
            "from": f"Spark Clubs <{settings.DEFAULT_FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": f"""
<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>Test Email from Spark Clubs</h2>
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
    <p style="white-space:pre-wrap;margin:0">{body}</p>
  </div>
  <hr>
  <p style="color:#888;font-size:12px">This is a test email sent by a Spark Clubs site administrator.</p>
</div>
""",
        })

        logger.info(f"Test email sent to {to_email}")

    except Exception as e:
        logger.error(f"Failed to send test email to {to_email}: {e}")
        raise

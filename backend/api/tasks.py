"""Celery tasks for async email sending via Resend."""

from celery import shared_task
from django.conf import settings
import resend
import logging

logger = logging.getLogger(__name__)

# Initialize Resend with API key on module load
resend.api_key = settings.RESEND_API_KEY


def _build_email_params(**overrides: object) -> dict[str, object]:
    """Build a Resend email params dict with common defaults (from, reply_to)."""
    params: dict[str, object] = {
        "from": f"Spark Clubs <{settings.DEFAULT_FROM_EMAIL}>",
    }
    if settings.DEFAULT_REPLY_TO_EMAIL:
        params["reply_to"] = settings.DEFAULT_REPLY_TO_EMAIL
    params.update(overrides)
    return params


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

        resend.Emails.send(_build_email_params(
            to=admin_emails,
            subject=f"{requester_name} wants to join {club.name}",
            html=f"""
<h2>New Join Request</h2>
<p><strong>{requester_name}</strong> ({requesting_user.email}) has requested to join <strong>{club.name}</strong>.</p>
<p>Please review this request in your club dashboard.</p>
<p><a href="{settings.FRONTEND_URL}/clubs/{club.id}/members">Review membership requests →</a></p>
<hr>
<p style="color:#888;font-size:12px">Spark Clubs — Sent because you are an admin of {club.name}.<br>
<a href="{settings.FRONTEND_URL}/profile">Manage notification preferences →</a></p>
""",
        ))

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

        resend.Emails.send(_build_email_params(
            to=[user.email],
            subject=f"You've been approved for {club.name}!",
            html=f"""
<h2>Welcome to {club.name}!</h2>
<p>Hi {user.first_name}, your request to join <strong>{club.name}</strong> has been approved.</p>
<p>You can now participate in discussions, RSVP to events, and suggest topics.</p>
<p><a href="{settings.FRONTEND_URL}/clubs/{club.id}">Go to {club.name} →</a></p>
<hr>
<p style="color:#888;font-size:12px">Spark Clubs<br>
<a href="{settings.FRONTEND_URL}/profile">Manage notification preferences →</a></p>
""",
        ))

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
        resend.Emails.send(_build_email_params(
            to=[user_email],
            subject=f"You have been removed from {club_name}",
            html=f"""
<h2>Membership Update</h2>
<p>Hi {user_first_name}, your membership in <strong>{club_name}</strong> has been removed.</p>
<p>If you believe this was a mistake, please contact the club administrator.</p>
<p><a href="{settings.FRONTEND_URL}/clubs">Browse other clubs →</a></p>
<hr>
<p style="color:#888;font-size:12px">Spark Clubs<br>
<a href="{settings.FRONTEND_URL}/profile">Manage notification preferences →</a></p>
""",
        ))

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
        resend.Emails.send(_build_email_params(
            to=[to_email],
            subject=subject,
            html=f"""
<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>Test Email from Spark Clubs</h2>
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
    <p style="white-space:pre-wrap;margin:0">{body}</p>
  </div>
  <hr>
  <p style="color:#888;font-size:12px">This is a test email sent by a Spark Clubs site administrator.</p>
</div>
""",
        ))

        logger.info(f"Test email sent to {to_email}")

    except Exception as e:
        logger.error(f"Failed to send test email to {to_email}: {e}")
        raise


@shared_task(rate_limit="30/m", max_retries=3, default_retry_delay=60)
def send_activation_email(user_id: int, activation_token: str) -> None:
    """Send an account activation email with a verification link."""
    if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY:
        logger.info("Email disabled or no Resend API key — skipping activation email")
        return

    from .models import User

    try:
        user = User.objects.only("id", "first_name", "email", "email_notifications_enabled").get(id=user_id)

        if not user.is_active:
            logger.info(f"Skipping activation email for {user.email} — user is inactive")
            return

        activation_url = f"{settings.FRONTEND_URL}/verify-email?token={activation_token}"

        resend.Emails.send(_build_email_params(
            to=[user.email],
            subject="Verify your email address — Spark Clubs",
            html=f"""
<h2>Welcome to Spark Clubs!</h2>
<p>Hi {user.first_name},</p>
<p>Thanks for creating an account. Please verify your email address by clicking the link below:</p>
<p style="margin:24px 0">
  <a href="{activation_url}"
     style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
    Verify Email Address
  </a>
</p>
<p>Or copy and paste this link into your browser:</p>
<p style="color:#4F46E5;word-break:break-all">{activation_url}</p>
<p>This link will expire in 48 hours.</p>
<hr>
<p style="color:#888;font-size:12px">
  If you didn't create an account on Spark Clubs, you can safely ignore this email.
</p>
""",
        ))

        logger.info(f"Activation email sent to {user.email}")

    except Exception as e:
        logger.error(f"Failed to send activation email to user {user_id}: {e}")
        raise


@shared_task(rate_limit="30/m", max_retries=3, default_retry_delay=60)
def send_club_created_alert(club_id: int, creator_id: int) -> None:
    """Notify all site admins that a new club has been created."""
    if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY:
        logger.info("Email disabled or no Resend API key — skipping club created alert")
        return

    from .models import Club, User

    try:
        club = Club.objects.only("id", "name", "zip_code").get(id=club_id)
        creator = User.objects.only("id", "first_name", "last_name", "email").get(id=creator_id)
        admins = list(User.objects.filter(
            user_type__in=["site_admin", "super_admin"],
            is_active=True,
            email_notifications_enabled=True,
        ))

        if not admins:
            logger.info(f"No active site admins to notify for new club '{club.name}'")
            return

        admin_emails = [{"to": a.email} for a in admins]
        creator_name = f"{creator.first_name} {creator.last_name}"

        resend.Emails.send(_build_email_params(
            to=admin_emails,
            subject=f"New club created: {club.name}",
            html=f"""
<h2>New Club Created</h2>
<p><strong>{creator_name}</strong> ({creator.email}) created a new club:</p>
<ul>
  <li><strong>Name:</strong> {club.name}</li>
  <li><strong>Zip Code:</strong> {club.zip_code}</li>
</ul>
<p><a href="{settings.FRONTEND_URL}/clubs/{club.id}">View {club.name} →</a></p>
<hr>
<p style="color:#888;font-size:12px">Spark Clubs — Sent because you are a site administrator.<br>
<a href="{settings.FRONTEND_URL}/profile">Manage notification preferences →</a></p>
""",
        ))

        logger.info(f"Club created alert sent to {len(admins)} site admin(s) for club '{club.name}'")

    except Exception as e:
        logger.error(f"Failed to send club created alert for club {club_id}: {e}")
        raise


@shared_task(rate_limit="30/m", max_retries=3, default_retry_delay=60)
def send_topic_pending_alert(topic_id: int) -> None:
    """Notify all club admins that a topic is awaiting approval (pending status)."""
    if not settings.EMAIL_ENABLED or not settings.RESEND_API_KEY:
        logger.info("Email disabled or no Resend API key — skipping topic pending alert")
        return

    from .models import Topic, User

    try:
        topic = Topic.objects.select_related("club", "created_by").only(
            "id", "title", "club__id", "club__name", "created_by__first_name", "created_by__last_name", "created_by__email",
        ).get(id=topic_id)

        club = topic.club
        admins = list(User.objects.filter(
            memberships__club=club,
            memberships__is_admin=True,
            memberships__status="active",
            is_active=True,
            email_notifications_enabled=True,
        ).distinct())

        if not admins:
            logger.info(f"No active admins to notify for pending topic in club '{club.name}'")
            return

        admin_emails = [{"to": a.email} for a in admins]
        author_name = f"{topic.created_by.first_name} {topic.created_by.last_name}" if topic.created_by else "Unknown"

        resend.Emails.send(_build_email_params(
            to=admin_emails,
            subject=f"Topic awaiting approval in {club.name}: {topic.title}",
            html=f"""
<h2>Topic Needs Review</h2>
<p>A new topic in <strong>{club.name}</strong> is awaiting approval:</p>
<ul>
  <li><strong>Title:</strong> {topic.title}</li>
  <li><strong>Proposed by:</strong> {author_name}</li>
</ul>
<p><a href="{settings.FRONTEND_URL}/clubs/{club.id}">Review topics in {club.name} →</a></p>
<hr>
<p style="color:#888;font-size:12px">Spark Clubs — Sent because you are an admin of {club.name}.<br>
<a href="{settings.FRONTEND_URL}/profile">Manage notification preferences →</a></p>
""",
        ))

        logger.info(f"Topic pending alert sent to {len(admins)} admin(s) for topic '{topic.title}' in club '{club.name}'")

    except Exception as e:
        logger.error(f"Failed to send topic pending alert for topic {topic_id}: {e}")
        raise

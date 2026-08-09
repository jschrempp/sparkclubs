# Generated migration for email verification feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0017_add_email_notifications_enabled"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="activation_token",
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="user",
            name="activation_token_created_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="user",
            name="user_type",
            field=models.CharField(
                choices=[
                    ("awaiting_verification", "Awaiting Verification"),
                    ("pending", "Pending"),
                    ("member", "Member"),
                    ("site_admin", "Site Admin"),
                    ("super_admin", "Super Admin"),
                ],
                default="awaiting_verification",
                max_length=20,
            ),
        ),
    ]
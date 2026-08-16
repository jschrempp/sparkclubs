# Add opaque public_id fields to Club, ClubMembership, Topic, Event, and
# EventDateOption so API URLs use unguessable tokens instead of auto-increment pk.

import secrets

from django.db import migrations, models


def _generate_tokens(model_cls, field_name):
    """Generate a unique token for each existing row lacking one."""
    existing = set(model_cls.objects.values_list(field_name, flat=True))
    for row in model_cls.objects.all():
        while True:
            token = secrets.token_urlsafe(16)
            if token not in existing:
                existing.add(token)
                row.__dict__[field_name] = token
                break
        row.save(update_fields=[field_name])


def backfill(apps, schema_editor):
    Club = apps.get_model("api", "Club")
    ClubMembership = apps.get_model("api", "ClubMembership")
    Topic = apps.get_model("api", "Topic")
    Event = apps.get_model("api", "Event")
    EventDateOption = apps.get_model("api", "EventDateOption")

    for model in (Club, ClubMembership, Topic, Event, EventDateOption):
        _generate_tokens(model, "public_id")


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_add_email_verification"),
    ]

    operations = [
        migrations.AddField(
            model_name="club",
            name="public_id",
            field=models.CharField(blank=True, max_length=22),
        ),
        migrations.AddField(
            model_name="clubmembership",
            name="public_id",
            field=models.CharField(blank=True, max_length=22),
        ),
        migrations.AddField(
            model_name="topic",
            name="public_id",
            field=models.CharField(blank=True, max_length=22),
        ),
        migrations.AddField(
            model_name="event",
            name="public_id",
            field=models.CharField(blank=True, max_length=22),
        ),
        migrations.AddField(
            model_name="eventdateoption",
            name="public_id",
            field=models.CharField(blank=True, max_length=22),
        ),
        migrations.RunPython(backfill, noop),
        migrations.AlterField(
            model_name="club",
            name="public_id",
            field=models.CharField(
                blank=True,
                max_length=22,
                unique=True,
                help_text="Opaque public identifier used in API URLs instead of the auto-increment pk.",
            ),
        ),
        migrations.AlterField(
            model_name="clubmembership",
            name="public_id",
            field=models.CharField(
                blank=True,
                max_length=22,
                unique=True,
                help_text="Opaque public identifier used in API URLs instead of the auto-increment pk.",
            ),
        ),
        migrations.AlterField(
            model_name="topic",
            name="public_id",
            field=models.CharField(
                blank=True,
                max_length=22,
                unique=True,
                help_text="Opaque public identifier used in API URLs instead of the auto-increment pk.",
            ),
        ),
        migrations.AlterField(
            model_name="event",
            name="public_id",
            field=models.CharField(
                blank=True,
                max_length=22,
                unique=True,
                help_text="Opaque public identifier used in API URLs instead of the auto-increment pk.",
            ),
        ),
        migrations.AlterField(
            model_name="eventdateoption",
            name="public_id",
            field=models.CharField(
                blank=True,
                max_length=22,
                unique=True,
                help_text="Opaque public identifier used in API calls instead of the auto-increment pk.",
            ),
        ),
    ]

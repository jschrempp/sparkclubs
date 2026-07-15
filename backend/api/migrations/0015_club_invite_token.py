# Generated migration to add an opaque, unguessable invite token to Club,
# used for invite links (/join/<token>) instead of the numeric club id.

import secrets

from django.db import migrations, models


def populate_invite_tokens(apps, schema_editor):
    Club = apps.get_model('api', 'Club')
    existing_tokens = set()
    for club in Club.objects.all():
        token = secrets.token_urlsafe(16)
        while token in existing_tokens:
            token = secrets.token_urlsafe(16)
        existing_tokens.add(token)
        club.invite_token = token
        club.save(update_fields=['invite_token'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_rename_topic_author_to_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='club',
            name='invite_token',
            field=models.CharField(blank=True, default='', help_text='Opaque token used in invite links (/join/<token>) instead of the numeric id, so club ids cannot be guessed or enumerated.', max_length=32),
        ),
        migrations.RunPython(populate_invite_tokens, noop_reverse),
        migrations.AlterField(
            model_name='club',
            name='invite_token',
            field=models.CharField(blank=True, help_text='Opaque token used in invite links (/join/<token>) instead of the numeric id, so club ids cannot be guessed or enumerated.', max_length=32, unique=True),
        ),
    ]

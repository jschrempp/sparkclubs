# Generated manually for club is_public field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0009_systemsettings_auto_approve_club_memberships'),
    ]

    operations = [
        migrations.AddField(
            model_name='club',
            name='is_public',
            field=models.BooleanField(default=True, help_text='Public clubs are visible to all users. Private clubs are only visible to members.'),
        ),
    ]

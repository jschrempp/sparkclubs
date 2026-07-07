# Generated manually for club_creation_limit field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_club_is_public'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='club_creation_limit',
            field=models.IntegerField(default=5, help_text='Maximum number of clubs this user can create'),
        ),
    ]

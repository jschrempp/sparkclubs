# Generated manually for auto_approve_books field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_user_club_creation_limit'),
    ]

    operations = [
        migrations.AddField(
            model_name='club',
            name='auto_approve_books',
            field=models.BooleanField(default=False, help_text='Automatically approve books when added. When disabled, club admins must manually approve books.'),
        ),
    ]

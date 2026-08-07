# Generated migration to add email_notifications_enabled to User

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_add_date_voting'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_notifications_enabled',
            field=models.BooleanField(default=True, help_text='Whether the user wants to receive email alerts'),
        ),
    ]
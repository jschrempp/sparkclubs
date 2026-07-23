# Generated migration to add date_voting status to Event and
# EventDateOption / EventDateVote models for date polling.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_club_invite_token'),
    ]

    operations = [
        migrations.AlterField(
            model_name='event',
            name='start_datetime',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='event',
            name='end_datetime',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='event',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('date_voting', 'Date Voting'),
                    ('active', 'Active'),
                    ('inactive', 'Inactive'),
                    ('cancelled', 'Cancelled'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='EventDateOption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_datetime', models.DateTimeField()),
                ('end_datetime', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='date_options', to='api.event')),
            ],
            options={
                'db_table': 'event_date_options',
                'ordering': ['start_datetime'],
            },
        ),
        migrations.CreateModel(
            name='EventDateVote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('date_option', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='api.eventdateoption')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='date_votes', to='api.user')),
            ],
            options={
                'db_table': 'event_date_votes',
                'unique_together': {('date_option', 'user')},
            },
        ),
    ]
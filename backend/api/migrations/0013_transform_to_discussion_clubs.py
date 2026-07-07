# Generated migration for transforming book clubs to discussion clubs

from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_club_auto_approve_books'),
    ]

    operations = [
        # Rename Book model to Topic
        migrations.RenameModel(
            old_name='Book',
            new_name='Topic',
        ),
        
        # Update Topic table name
        migrations.AlterModelTable(
            name='topic',
            table='topics',
        ),
        
        # Remove book-specific fields from Topic
        migrations.RemoveField(
            model_name='topic',
            name='is_fiction',
        ),
        migrations.RemoveField(
            model_name='topic',
            name='genre',
        ),
        migrations.RemoveField(
            model_name='topic',
            name='description',
        ),
        
        # Add tabs field to Topic
        migrations.AddField(
            model_name='topic',
            name='tabs',
            field=models.CharField(blank=True, help_text='Tags for categorizing topics', max_length=128, null=True),
        ),
        
        # Rename BookInterest to TopicInterest
        migrations.RenameModel(
            old_name='BookInterest',
            new_name='TopicInterest',
        ),
        
        # Update TopicInterest table name
        migrations.AlterModelTable(
            name='topicinterest',
            table='topic_interests',
        ),
        
        # Rename foreign key from book to topic in TopicInterest
        migrations.RenameField(
            model_name='topicinterest',
            old_name='book',
            new_name='topic',
        ),
        
        # Update interest_type choices in TopicInterest
        migrations.AlterField(
            model_name='topicinterest',
            name='interest_type',
            field=models.CharField(
                choices=[
                    ('interested', 'Interested'),
                    ('able_to_lead', 'Able to Lead'),
                    ('not_interested', 'Not Interested'),
                    ('unspecified', 'Unspecified'),
                ],
                max_length=20
            ),
        ),
        
        # Rename related_name in Topic foreign keys
        migrations.AlterField(
            model_name='topic',
            name='club',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='topics', to='api.club'),
        ),
        migrations.AlterField(
            model_name='topic',
            name='created_by',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_topics', to=settings.AUTH_USER_MODEL),
        ),
        
        # Update TopicInterest foreign keys
        migrations.AlterField(
            model_name='topicinterest',
            name='topic',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interests', to='api.topic'),
        ),
        migrations.AlterField(
            model_name='topicinterest',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='topic_interests', to=settings.AUTH_USER_MODEL),
        ),
        
        # Remove book field from Event and add EventTopic model
        migrations.RemoveField(
            model_name='event',
            name='book',
        ),
        
        # Create EventTopic model for many-to-many relationship
        migrations.CreateModel(
            name='EventTopic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='event_topics', to='api.event')),
                ('topic', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='topic_events', to='api.topic')),
            ],
            options={
                'db_table': 'event_topics',
                'ordering': ['-created_at'],
            },
        ),
        
        # Add unique constraint to EventTopic
        migrations.AddConstraint(
            model_name='eventtopic',
            constraint=models.UniqueConstraint(fields=['event', 'topic'], name='unique_event_topic'),
        ),
        
        # Delete UserBookList model
        migrations.DeleteModel(
            name='UserBookList',
        ),
        
        # Rename auto_approve_books to auto_approve_topics in Club
        migrations.RenameField(
            model_name='club',
            old_name='auto_approve_books',
            new_name='auto_approve_topics',
        ),
    ]

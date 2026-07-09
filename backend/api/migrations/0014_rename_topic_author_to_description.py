# Generated migration to rename Topic.author field to Topic.description

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_transform_to_discussion_clubs'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='topic',
            name='books_author_1c43f5_idx',
        ),
        migrations.RenameField(
            model_name='topic',
            old_name='author',
            new_name='description',
        ),
        migrations.AddIndex(
            model_name='topic',
            index=models.Index(fields=['description'], name='topics_description_idx'),
        ),
    ]

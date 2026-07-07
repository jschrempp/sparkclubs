# Generated migration for BookInterest unique_together change

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_book_description'),
    ]

    operations = [
        # First, remove the old unique constraint
        migrations.AlterUniqueTogether(
            name='bookinterest',
            unique_together=set(),
        ),
        # Add updated_at field
        migrations.AddField(
            model_name='bookinterest',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        # Remove duplicate interests - keep only the most recent one per user/book
        migrations.RunSQL(
            """
            DELETE FROM book_interests
            WHERE id NOT IN (
                SELECT MAX(id)
                FROM book_interests
                GROUP BY book_id, user_id
            );
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Add the new unique constraint
        migrations.AlterUniqueTogether(
            name='bookinterest',
            unique_together={('book', 'user')},
        ),
    ]

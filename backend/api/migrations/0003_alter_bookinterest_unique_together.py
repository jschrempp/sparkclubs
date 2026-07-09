# Generated migration for BookInterest unique_together change
# Rewritten to be fully idempotent for MySQL (handles partial previous runs)

from django.db import migrations, models


def setup_book_interests(apps, schema_editor):
    """
    Idempotently:
      1. Remove the old 3-column unique constraint (book, user, interest_type)
      2. Add updated_at column if missing
      3. Delete duplicate rows (keep highest id per book/user)
      4. Add new 2-column unique constraint (book, user)
    """
    from django.db import connection
    with connection.cursor() as cursor:
        # Step 1: drop old 3-column unique index if still present
        cursor.execute("""
            SELECT index_name
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'book_interests'
              AND non_unique = 0
              AND index_name != 'PRIMARY'
            GROUP BY index_name
            HAVING COUNT(*) >= 3
        """)
        for (idx_name,) in cursor.fetchall():
            cursor.execute(f"ALTER TABLE book_interests DROP INDEX `{idx_name}`")

        # Step 2: add updated_at only if it doesn't exist
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'book_interests'
              AND column_name = 'updated_at'
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                ALTER TABLE book_interests
                ADD COLUMN updated_at DATETIME(6) NOT NULL
                DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
            """)

        # Step 3: remove duplicates — keep highest id per (book_id, user_id)
        cursor.execute("""
            DELETE FROM book_interests
            WHERE id NOT IN (
                SELECT id FROM (
                    SELECT MAX(id) AS id
                    FROM book_interests
                    GROUP BY book_id, user_id
                ) AS tmp
            )
        """)

        # Step 4: add new 2-column unique constraint only if no unique index exists yet
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = 'book_interests'
              AND non_unique = 0
              AND index_name != 'PRIMARY'
        """)
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                ALTER TABLE book_interests
                ADD UNIQUE KEY book_interests_book_id_user_id_uniq (book_id, user_id)
            """)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_book_description'),
    ]

    operations = [
        # Use SeparateDatabaseAndState so the DB work is idempotent
        # while Django's migration state graph stays correct.
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    setup_book_interests,
                    reverse_code=migrations.RunPython.noop,
                ),
            ],
            state_operations=[
                migrations.AlterUniqueTogether(
                    name='bookinterest',
                    unique_together=set(),
                ),
                migrations.AddField(
                    model_name='bookinterest',
                    name='updated_at',
                    field=models.DateTimeField(auto_now=True),
                ),
                migrations.AlterUniqueTogether(
                    name='bookinterest',
                    unique_together={('book', 'user')},
                ),
            ],
        ),
    ]

"""
Management command to erase all books and clubs from the database.
This removes all club memberships and events/attendances, but keeps user accounts intact.
"""
from django.core.management.base import BaseCommand
from api.models import Club, Book, BookInterest, Event, EventAttendance, ClubMembership


class Command(BaseCommand):
    help = 'Erase all books, clubs, and club memberships from the database while preserving user accounts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm the deletion (required to prevent accidental deletions)',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'WARNING: This command will delete ALL clubs, books, events, and club memberships. '
                    'User accounts will be preserved.\n'
                    'To confirm, run: python manage.py erase_clubs_and_books --confirm'
                )
            )
            return

        # Confirm one more time
        self.stdout.write(
            self.style.WARNING(
                'This is your final warning. All clubs, books, and memberships will be permanently deleted.'
            )
        )
        response = input('Type "yes" to confirm: ')
        
        if response.lower() != 'yes':
            self.stdout.write(self.style.WARNING('Deletion cancelled.'))
            return

        try:
            # Delete in correct order to respect foreign key constraints
            book_interest_count = BookInterest.objects.count()
            event_attendance_count = EventAttendance.objects.count()
            event_count = Event.objects.count()
            book_count = Book.objects.count()
            membership_count = ClubMembership.objects.count()
            club_count = Club.objects.count()

            # Delete all book interests
            BookInterest.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Deleted {book_interest_count} book interest records')
            )

            # Delete all event attendances
            EventAttendance.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Deleted {event_attendance_count} event attendance records')
            )

            # Delete all events
            Event.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Deleted {event_count} events')
            )

            # Delete all books
            Book.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Deleted {book_count} books')
            )

            # Delete all club memberships
            ClubMembership.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Deleted {membership_count} club memberships')
            )

            # Delete all clubs
            Club.objects.all().delete()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Deleted {club_count} clubs')
            )

            self.stdout.write(
                self.style.SUCCESS(
                    '\n✓ All clubs, books, and memberships have been successfully erased. '
                    'User accounts remain intact.'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error during deletion: {str(e)}')
            )

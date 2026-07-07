"""
Management command to load test data into the database.
Creates test users, clubs, books, and events for development/testing purposes.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import User, Club, ClubMembership, Book, BookInterest, Event, EventAttendance, UserBookList
import random


class Command(BaseCommand):
    help = 'Load test data into the database (15+ members, 3 clubs, 25 books, 2 events)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before loading test data',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            UserBookList.objects.all().delete()
            BookInterest.objects.all().delete()
            EventAttendance.objects.all().delete()
            Event.objects.all().delete()
            Book.objects.all().delete()
            ClubMembership.objects.all().delete()
            Club.objects.all().delete()
            User.objects.filter(user_type='member').delete()
            self.stdout.write(self.style.SUCCESS('✓ Existing data cleared'))

        # Create test users
        self.stdout.write('Creating test users...')
        users = []
        
        # Create a super admin if one doesn't exist
        super_admin = User.objects.filter(user_type='super_admin').first()
        if not super_admin:
            super_admin = User.objects.create_user(
                email='admin@bookclub.com',
                password='admin123',
                first_name='Super',
                last_name='Admin',
                zip_code='10001',
                bio='System administrator',
                user_type='super_admin'
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created super admin: admin@bookclub.com (password: admin123)'))
        
        # Create site admin if one doesn't exist
        site_admin = User.objects.filter(email='siteadmin@bookclub.com').first()
        if not site_admin:
            site_admin = User.objects.create_user(
                email='siteadmin@bookclub.com',
                password='admin123',
                first_name='Site',
                last_name='Administrator',
                zip_code='10002',
                bio='Site administrator managing all clubs',
                user_type='site_admin'
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created site admin: siteadmin@bookclub.com (password: admin123)'))
        
        users.append(site_admin)

        # Create 15 regular members
        first_names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah',
                       'Isaac', 'Julia', 'Kevin', 'Laura', 'Michael', 'Nancy', 'Oliver']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
                      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson']
        
        zip_codes = ['10001', '10002', '10003', '90001', '90002', '60601', '60602', '02101', '02102', '94102']
        
        for i in range(15):
            email = f'member{i+1}@bookclub.com'
            user = User.objects.filter(email=email).first()
            if not user:
                user = User.objects.create_user(
                    email=email,
                    password='member123',
                    first_name=first_names[i % len(first_names)],
                    last_name=last_names[i % len(last_names)],
                    zip_code=random.choice(zip_codes),
                    bio=f'Book lover and avid reader. Member #{i+1}',
                    user_type='member'
                )
            users.append(user)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(users)} users'))

        # Create 3 clubs
        self.stdout.write('Creating clubs...')
        clubs_data = [
            {
                'name': 'Classic Literature Club',
                'description': 'A club for readers who love timeless classics and literary fiction',
                'zip_code': '10001',
            },
            {
                'name': 'Sci-Fi & Fantasy Readers',
                'description': 'Exploring worlds of science fiction and fantasy together',
                'zip_code': '90001',
            },
            {
                'name': 'Mystery & Thriller Enthusiasts',
                'description': 'For those who love suspense, mystery, and thrillers',
                'zip_code': '60601',
            },
        ]
        
        clubs = []
        for club_data in clubs_data:
            club = Club.objects.create(
                **club_data,
                created_by=super_admin,
                is_active=True,
                is_public=True
            )
            clubs.append(club)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(clubs)} clubs (all public)'))

        # Create club memberships
        self.stdout.write('Creating club memberships...')
        membership_count = 0
        
        # Filter out site_admin from regular member assignments to avoid duplicates
        regular_members = [u for u in users if u.email != 'siteadmin@bookclub.com']
        
        for i, club in enumerate(clubs):
            # Assign 5-7 members to each club
            num_members = random.randint(5, 7)
            club_users = random.sample(regular_members, num_members)
            
            for j, user in enumerate(club_users):
                is_admin = j == 0  # First member is admin
                host_order = j + 1 if j < 3 else None  # First 3 members in rotation
                
                ClubMembership.objects.create(
                    club=club,
                    user=user,
                    status='active',
                    is_admin=is_admin,
                    host_order=host_order
                )
                membership_count += 1
            
            # Add super admin and site admin as admins to all clubs
            ClubMembership.objects.create(
                club=club,
                user=super_admin,
                status='active',
                is_admin=True
            )
            ClubMembership.objects.create(
                club=club,
                user=site_admin,
                status='active',
                is_admin=True
            )
            membership_count += 2
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {membership_count} club memberships'))

        # Create user book lists first (before club books)
        self.stdout.write('Creating personal book lists...')
        personal_books_data = [
            {'title': 'Atomic Habits', 'author': 'James Clear', 'is_fiction': False, 'genre': 'Self-Help'},
            {'title': 'Educated', 'author': 'Tara Westover', 'is_fiction': False, 'genre': 'Memoir'},
            {'title': 'The Midnight Library', 'author': 'Matt Haig', 'is_fiction': True, 'genre': 'Contemporary'},
            {'title': 'Project Hail Mary', 'author': 'Andy Weir', 'is_fiction': True, 'genre': 'Sci-Fi'},
            {'title': 'Sapiens', 'author': 'Yuval Noah Harari', 'is_fiction': False, 'genre': 'History'},
            {'title': 'The Seven Husbands of Evelyn Hugo', 'author': 'Taylor Jenkins Reid', 'is_fiction': True, 'genre': 'Historical Fiction'},
            {'title': 'Where the Crawdads Sing', 'author': 'Delia Owens', 'is_fiction': True, 'genre': 'Mystery'},
            {'title': 'The Subtle Art of Not Giving a F*ck', 'author': 'Mark Manson', 'is_fiction': False, 'genre': 'Self-Help'},
            {'title': 'Circe', 'author': 'Madeline Miller', 'is_fiction': True, 'genre': 'Mythology'},
            {'title': 'The Alchemist', 'author': 'Paulo Coelho', 'is_fiction': True, 'genre': 'Philosophical'},
            {'title': 'Becoming', 'author': 'Michelle Obama', 'is_fiction': False, 'genre': 'Memoir'},
            {'title': 'The Song of Achilles', 'author': 'Madeline Miller', 'is_fiction': True, 'genre': 'Mythology'},
            {'title': 'Thinking, Fast and Slow', 'author': 'Daniel Kahneman', 'is_fiction': False, 'genre': 'Psychology'},
            {'title': 'The House in the Cerulean Sea', 'author': 'TJ Klune', 'is_fiction': True, 'genre': 'Fantasy'},
            {'title': 'The Four Winds', 'author': 'Kristin Hannah', 'is_fiction': True, 'genre': 'Historical Fiction'},
            # Add some classic books to personal lists that will later be added to clubs
            {'title': 'Pride and Prejudice', 'author': 'Jane Austen', 'is_fiction': True, 'genre': 'Classic'},
            {'title': 'To Kill a Mockingbird', 'author': 'Harper Lee', 'is_fiction': True, 'genre': 'Classic'},
            {'title': '1984', 'author': 'George Orwell', 'is_fiction': True, 'genre': 'Dystopian'},
            {'title': 'Dune', 'author': 'Frank Herbert', 'is_fiction': True, 'genre': 'Sci-Fi'},
            {'title': 'The Hobbit', 'author': 'J.R.R. Tolkien', 'is_fiction': True, 'genre': 'Fantasy'},
        ]
        
        user_books_count = 0
        statuses = ['want_to_read', 'currently_reading', 'finished']
        sentiments = ['did_not_like', 'neutral', 'liked_it', 'great_book', None, None]  # None more common
        
        # Give each user 3-8 books in their personal list
        for user in users[:10]:  # First 10 users get personal book lists
            num_books = random.randint(3, 8)
            selected_books = random.sample(personal_books_data, num_books)
            
            for i, book_data in enumerate(selected_books):
                status = random.choice(statuses)
                rating = random.randint(1, 5) if status == 'finished' else None
                sentiment = random.choice(sentiments) if status in ['currently_reading', 'finished'] else None
                notes_options = [
                    'Really enjoying this one!',
                    'Highly recommended by a friend.',
                    'Can\'t put it down!',
                    'Looking forward to reading this.',
                    'One of my all-time favorites.',
                    None,
                    None,  # More chances for no notes
                ]
                # Make some books hidden (about 20% chance)
                is_hidden = random.random() < 0.2
                
                UserBookList.objects.create(
                    user=user,
                    title=book_data['title'],
                    author=book_data['author'],
                    is_fiction=book_data['is_fiction'],
                    genre=book_data['genre'],
                    status=status,
                    sentiment=sentiment,
                    rating=rating,
                    notes=random.choice(notes_options),
                    is_hidden=is_hidden
                )
                user_books_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {user_books_count} personal book list entries'))

        # Create 25 club books (some matching personal book lists)
        self.stdout.write('Creating club books...')
        books_data = [
            # Classic Literature Club books
            {'title': 'Pride and Prejudice', 'author': 'Jane Austen', 'is_fiction': True, 'genre': 'Classic', 
             'description': 'A romantic novel of manners set in Georgian England.', 'status': 'active'},
            {'title': 'To Kill a Mockingbird', 'author': 'Harper Lee', 'is_fiction': True, 'genre': 'Classic',
             'description': 'A gripping tale of racial injustice and childhood innocence.', 'status': 'active'},
            {'title': '1984', 'author': 'George Orwell', 'is_fiction': True, 'genre': 'Dystopian',
             'description': 'A dystopian novel warning about totalitarianism.', 'status': 'active'},
            {'title': 'The Great Gatsby', 'author': 'F. Scott Fitzgerald', 'is_fiction': True, 'genre': 'Classic',
             'description': 'A tale of wealth, love, and the American Dream.', 'status': 'active'},
            {'title': 'Moby-Dick', 'author': 'Herman Melville', 'is_fiction': True, 'genre': 'Adventure',
             'description': 'The epic tale of Captain Ahab\'s quest for revenge.', 'status': 'pending'},
            {'title': 'Jane Eyre', 'author': 'Charlotte Brontë', 'is_fiction': True, 'genre': 'Gothic',
             'description': 'A young governess falls in love with her brooding employer.', 'status': 'active'},
            {'title': 'Wuthering Heights', 'author': 'Emily Brontë', 'is_fiction': True, 'genre': 'Gothic',
             'description': 'A passionate and destructive love story.', 'status': 'inactive'},
            {'title': 'The Catcher in the Rye', 'author': 'J.D. Salinger', 'is_fiction': True, 'genre': 'Classic',
             'description': 'A teenager\'s journey through alienation and identity.', 'status': 'active'},
            
            # Sci-Fi & Fantasy books
            {'title': 'Dune', 'author': 'Frank Herbert', 'is_fiction': True, 'genre': 'Sci-Fi',
             'description': 'A science fiction epic set on the desert planet Arrakis.', 'status': 'active'},
            {'title': 'The Hobbit', 'author': 'J.R.R. Tolkien', 'is_fiction': True, 'genre': 'Fantasy',
             'description': 'Bilbo Baggins\' unexpected journey to reclaim treasure.', 'status': 'active'},
            {'title': 'Foundation', 'author': 'Isaac Asimov', 'is_fiction': True, 'genre': 'Sci-Fi',
             'description': 'The collapse and rebirth of galactic civilization.', 'status': 'active'},
            {'title': 'A Game of Thrones', 'author': 'George R.R. Martin', 'is_fiction': True, 'genre': 'Fantasy',
             'description': 'Political intrigue and power struggles in Westeros.', 'status': 'active'},
            {'title': 'The Left Hand of Darkness', 'author': 'Ursula K. Le Guin', 'is_fiction': True, 'genre': 'Sci-Fi',
             'description': 'An envoy\'s mission to a world of ambisexual beings.', 'status': 'pending'},
            {'title': 'Neuromancer', 'author': 'William Gibson', 'is_fiction': True, 'genre': 'Cyberpunk',
             'description': 'A hacker is pulled into a dangerous cyber-heist.', 'status': 'active'},
            {'title': 'The Name of the Wind', 'author': 'Patrick Rothfuss', 'is_fiction': True, 'genre': 'Fantasy',
             'description': 'The legend of a magician and musician named Kvothe.', 'status': 'active'},
            {'title': 'Snow Crash', 'author': 'Neal Stephenson', 'is_fiction': True, 'genre': 'Cyberpunk',
             'description': 'A pizza delivery driver uncovers a virtual reality threat.', 'status': 'active'},
            {'title': 'The Martian', 'author': 'Andy Weir', 'is_fiction': True, 'genre': 'Sci-Fi',
             'description': 'An astronaut\'s fight for survival on Mars.', 'status': 'inactive'},
            
            # Mystery & Thriller books
            {'title': 'The Girl with the Dragon Tattoo', 'author': 'Stieg Larsson', 'is_fiction': True, 'genre': 'Thriller',
             'description': 'A journalist and hacker investigate a disappearance.', 'status': 'active'},
            {'title': 'Gone Girl', 'author': 'Gillian Flynn', 'is_fiction': True, 'genre': 'Thriller',
             'description': 'A wife disappears on her anniversary with sinister implications.', 'status': 'active'},
            {'title': 'The Da Vinci Code', 'author': 'Dan Brown', 'is_fiction': True, 'genre': 'Thriller',
             'description': 'A symbologist unravels religious mysteries in Europe.', 'status': 'active'},
            {'title': 'Big Little Lies', 'author': 'Liane Moriarty', 'is_fiction': True, 'genre': 'Mystery',
             'description': 'Secrets and lies among suburban mothers lead to murder.', 'status': 'active'},
            {'title': 'The Silent Patient', 'author': 'Alex Michaelides', 'is_fiction': True, 'genre': 'Thriller',
             'description': 'A woman shoots her husband then never speaks again.', 'status': 'pending'},
            {'title': 'In the Woods', 'author': 'Tana French', 'is_fiction': True, 'genre': 'Mystery',
             'description': 'A detective investigates a murder tied to his past.', 'status': 'active'},
            {'title': 'The Woman in the Window', 'author': 'A.J. Finn', 'is_fiction': True, 'genre': 'Thriller',
             'description': 'An agoraphobic woman witnesses a crime from her window.', 'status': 'active'},
            {'title': 'Sharp Objects', 'author': 'Gillian Flynn', 'is_fiction': True, 'genre': 'Thriller',
             'description': 'A reporter returns home to cover a series of murders.', 'status': 'active'},
        ]
        
        books = []
        for i, book_data in enumerate(books_data):
            club = clubs[i // 9]  # Distribute books across clubs (8-9 books per club)
            # Try to find a club member who has this book in their personal list
            club_members = ClubMembership.objects.filter(club=club, status='active')
            creator = None
            
            # Check if any club member has this book in their personal list
            for membership in club_members:
                if UserBookList.objects.filter(
                    user=membership.user,
                    title=book_data['title'],
                    author=book_data['author']
                ).exists():
                    creator = membership.user
                    break
            
            # If no member has it in their list, pick a random member
            if not creator:
                creator = random.choice([m.user for m in club_members])
            
            book = Book.objects.create(
                **book_data,
                club=club,
                created_by=creator
            )
            books.append(book)
            
            # Add some book interests
            if book.status == 'active':
                interested_users = random.sample(
                    [m.user for m in ClubMembership.objects.filter(club=club, status='active')],
                    k=random.randint(1, 3)
                )
                for user in interested_users:
                    BookInterest.objects.create(
                        book=book,
                        user=user,
                        interest_type=random.choice(['interested', 'reading', 'finished'])
                    )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(books)} club books'))

        # Create 2 events
        self.stdout.write('Creating events...')
        events_data = [
            {
                'club': clubs[0],
                'book': books[0],
                'title': 'Discussion: Pride and Prejudice',
                'start_datetime': timezone.now() + timedelta(days=7, hours=19),
                'end_datetime': timezone.now() + timedelta(days=7, hours=21),
                'location': 'Central Library - Room 101',
                'status': 'active',
            },
            {
                'club': clubs[1],
                'book': books[8],
                'title': 'Dune Movie Night & Discussion',
                'start_datetime': timezone.now() + timedelta(days=14, hours=18),
                'end_datetime': timezone.now() + timedelta(days=14, hours=22),
                'location': 'Sci-Fi Cafe Downtown',
                'status': 'active',
            },
        ]
        
        for event_data in events_data:
            club = event_data['club']
            members = ClubMembership.objects.filter(club=club, status='active', host_order__isnull=False)
            host = members.first().user if members.exists() else club.created_by
            
            event = Event.objects.create(
                **event_data,
                host=host,
                created_by=host
            )
            
            # Add some RSVPs
            club_members = [m.user for m in ClubMembership.objects.filter(club=club, status='active')]
            rsvp_users = random.sample(club_members, k=min(len(club_members), random.randint(2, 4)))
            
            for user in rsvp_users:
                EventAttendance.objects.create(
                    event=event,
                    user=user,
                    rsvp_status=random.choice(['attending', 'maybe', 'not_attending'])
                )
        
        self.stdout.write(self.style.SUCCESS(f'✓ Created {len(events_data)} events'))

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✓ Test data loaded successfully!'))
        self.stdout.write('='*60)
        self.stdout.write(f'Users created: {len(users) + 1}')
        self.stdout.write(f'Clubs created: {len(clubs)}')
        self.stdout.write(f'Books created: {len(books)}')
        self.stdout.write(f'Events created: {len(events_data)}')
        self.stdout.write(f'Personal book lists: {user_books_count} entries')
        self.stdout.write('\nTest accounts:')
        self.stdout.write('  Super Admin: admin@bookclub.com / admin123')
        self.stdout.write('  Site Admin: siteadmin@bookclub.com / admin123')
        self.stdout.write('  Members: member1@bookclub.com through member15@bookclub.com / member123')
        self.stdout.write('='*60 + '\n')

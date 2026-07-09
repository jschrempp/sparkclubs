"""
Management command to create a default super admin user if none exists.
Safe to run on every startup — does nothing if a super admin already exists.
"""
import os
from django.core.management.base import BaseCommand
from api.models import User


class Command(BaseCommand):
    help = 'Create a default super admin user if none exists'

    def handle(self, *args, **options):
        if User.objects.filter(user_type='super_admin').exists():
            self.stdout.write('Super admin already exists, skipping.')
            return

        email = os.environ.get('DEFAULT_ADMIN_EMAIL', 'admin@sparkclubs.com')
        password = os.environ.get('DEFAULT_ADMIN_PASSWORD', 'changeme123!')

        User.objects.create_user(
            email=email,
            password=password,
            first_name='Admin',
            last_name='User',
            zip_code='00000',
            bio='Default site administrator',
            user_type='super_admin',
        )
        self.stdout.write(self.style.SUCCESS(
            f'Created default super admin: {email}'
        ))

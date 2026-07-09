#!/bin/bash
# Collect static files
python manage.py collectstatic --no-input --clear

# Run migrations
python manage.py migrate --no-input

# Create default super admin if none exists
python manage.py create_default_superadmin

# Start gunicorn
exec gunicorn sparkclubs.wsgi --bind 0.0.0.0:$PORT

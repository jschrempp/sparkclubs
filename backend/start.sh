#!/bin/bash
# Collect static files
python manage.py collectstatic --no-input --clear

# Run migrations
python manage.py migrate --no-input

# Start gunicorn
exec gunicorn bookclubs.wsgi --bind 0.0.0.0:$PORT

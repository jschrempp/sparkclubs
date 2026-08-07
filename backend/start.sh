#!/bin/bash
# Collect static files
python manage.py collectstatic --no-input --clear

# Run migrations
python manage.py migrate --no-input

# Create default super admin if none exists
python manage.py create_default_superadmin

# Start Celery worker in the background (if Redis is configured)
if [ -n "$REDIS_URL" ] || [ -n "$CELERY_BROKER_URL" ]; then
  echo "Starting Celery worker..."
  celery -A sparkclubs worker --loglevel=info --concurrency=1 &
fi

# Start gunicorn
exec gunicorn sparkclubs.wsgi --bind 0.0.0.0:$PORT

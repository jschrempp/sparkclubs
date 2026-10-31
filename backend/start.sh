#!/bin/bash
# Collect static files
python manage.py collectstatic --no-input --clear

# Run migrations
python manage.py migrate --no-input

# Create default super admin if none exists
python manage.py create_default_superadmin

# Start Celery worker in the background (if Redis is configured).
# Use a thread pool so the whole worker lives in a single process; a
# prefork pool forks a second full Django process (main + child),
# roughly doubling idle memory for no benefit at this scale.
if [ -n "$REDIS_URL" ] || [ -n "$CELERY_BROKER_URL" ]; then
  echo "Starting Celery worker..."
  python -m celery -A sparkclubs worker \
    --pool=threads \
    --concurrency=4 \
    --loglevel=warning \
    --without-gossip \
    --without-mingle &
  CELERY_PID=$!
  echo "Celery worker started with PID $CELERY_PID"
fi

# Start gunicorn with an explicit, small worker count.
# Gunicorn defaults to (2 * CPU cores) + 1 workers; inside a container
# the detected core count can be the host's, which spawns many
# memory-hungry Django processes. Pin the count and serve concurrency
# with threads (and --preload to share the app across workers).
: "${WEB_CONCURRENCY:=2}"
: "${WEB_THREADS:=4}"

exec gunicorn sparkclubs.wsgi \
  --bind 0.0.0.0:$PORT \
  --workers "$WEB_CONCURRENCY" \
  --threads "$WEB_THREADS" \
  --worker-class gthread \
  --preload \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --timeout 120 \
  --graceful-timeout 30

"""Celery configuration for Spark Clubs."""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sparkclubs.settings')

app = Celery('sparkclubs')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
"""Celery configuration for Spark Clubs."""
import os

# Use PyMySQL as MySQLdb replacement — must happen before Celery imports Django models
import pymysql
pymysql.install_as_MySQLdb()

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sparkclubs.settings')

app = Celery('sparkclubs')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
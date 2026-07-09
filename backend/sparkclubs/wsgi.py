"""
WSGI config for sparkclubs project.
"""

import os

# Use PyMySQL as MySQLdb replacement
import pymysql
pymysql.install_as_MySQLdb()

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sparkclubs.settings')

application = get_wsgi_application()

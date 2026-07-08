"""
WSGI config for bookclubs project.
"""

import os

# Use PyMySQL as MySQLdb replacement
import pymysql
pymysql.install_as_MySQLdb()

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bookclubs.settings')

application = get_wsgi_application()

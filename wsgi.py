#!/usr/bin/env python3
"""
WSGI entry point for Sypnex OS - Production ready with gunicorn
"""

# Import the Flask app - that's all gunicorn needs
from app import app

# The WSGI application that gunicorn will use
application = app

if __name__ == '__main__':
    # This is only used for development
    app.run(debug=False, host='0.0.0.0', port=5000)

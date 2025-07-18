#!/usr/bin/env python3
"""
Development runner for Flask app with controlled file watching
"""
import os
import sys

# Set environment variables to control Flask's reloader
os.environ['FLASK_ENV'] = 'development'
os.environ['FLASK_DEBUG'] = '1'

# Optionally, you can set this to control which files Flask watches
# os.environ['FLASK_EXTRA_FILES'] = 'app.py,*.py,*.html,*.css,*.js'

# Import and run the app
from app import app, managers

if __name__ == '__main__':
    print("🚀 Starting Flask development server...")
    print("📁 Excluding .db files from hot reloading")
    print("🌐 Server will be available at http://localhost:5000")
    
    # Use SocketIO for WebSocket support with controlled file watching
    import os
    
    # Get all Python files in the project for reloading
    extra_files = []
    for root, dirs, files in os.walk('.'):
        # Skip .db files and backup directories
        if '.db' in root or 'backup_databases' in root or 'scheduler_logs' in root:
            continue
        for file in files:
            if file.endswith(('.py', '.html', '.css', '.js')):
                extra_files.append(os.path.join(root, file))
    
    managers['websocket_manager'].socketio.run(app, debug=True, host='0.0.0.0', port=5000, extra_files=extra_files) 
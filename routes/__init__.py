"""
Routes package for Sypnex OS application
"""
from flask import request, jsonify, redirect, url_for
from .core import register_core_routes
from .user_apps import register_user_app_routes
from .preferences import register_preference_routes
from .services import register_service_routes
from .virtual_files import register_virtual_file_routes
from .system import register_system_routes
from .app_updates import register_app_updates_routes
from .app_discovery import register_app_discovery_routes
from .auth import register_auth_routes
from .metrics import register_metrics_routes
from .flow_runner import register_flow_runner_routes
from .crypto import register_crypto_routes
from config.app_config import validate_session_token

def register_all_routes(app, managers, builtin_apps):
    """Register all routes with the Flask application"""
    
    # Register authentication routes first
    register_auth_routes(app, managers)
    
    # Global authentication check for main application routes
    @app.before_request
    def check_authentication():
        # Skip auth for login routes, static files, and API auth endpoints
        excluded_paths = [
            '/login', '/logout', '/static/', '/api/auth/',
            '/favicon.ico', '/flasgger_static/', '/apidocs/', '/apispec_1.json'
        ]
        
        # Check if current path should be excluded from auth
        if any(request.path.startswith(path) for path in excluded_paths):
            return None
        
        # For API endpoints, validate session token
        if request.path.startswith('/api/'):
            # Get token from header or cookie (removed URL parameter fallback)
            token = (request.headers.get('X-Session-Token') or 
                    request.cookies.get('session_token'))
            
            username = validate_session_token(token) if token else None
            
            if not username:
                return jsonify({'error': 'Authentication required'}), 401
            
            # Store username in request context for use in routes
            request.current_user = username
            return None
        
        # For main application routes (like /), check authentication
        if request.path == '/' or request.path.startswith('/index'):
            token = (request.headers.get('X-Session-Token') or 
                    request.cookies.get('session_token'))
            
            username = validate_session_token(token) if token else None
            
            if not username:
                return redirect(url_for('login_page'))
            
            # Store username in request context
            request.current_user = username
    
    # Register core routes
    register_core_routes(app, managers, builtin_apps)
        
    # Register user app routes
    register_user_app_routes(app, managers)
    
    # Register preference routes
    register_preference_routes(app, managers)
    
    # Register service routes
    register_service_routes(app, managers)
    
    # Register virtual file routes
    register_virtual_file_routes(app, managers)
    
    # Register system routes
    register_system_routes(app, managers)
    
    # Register metrics routes
    register_metrics_routes(app, managers)
    
    # Register app updates routes
    register_app_updates_routes(app, managers)
    
    # Register app discovery routes
    register_app_discovery_routes(app, managers) 
    
    # Register Flow Runner proxy routes
    register_flow_runner_routes(app, managers) 
    
    # Register crypto routes
    register_crypto_routes(app, managers) 
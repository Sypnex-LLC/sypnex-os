"""
Routes package for Sypnex OS application
"""
from flask import request, jsonify
from .core import register_core_routes
from .user_apps import register_user_app_routes
from .preferences import register_preference_routes
from .services import register_service_routes
from .virtual_files import register_virtual_file_routes
from .system import register_system_routes
from .app_updates import register_app_updates_routes
from .app_discovery import register_app_discovery_routes

def register_all_routes(app, managers, builtin_apps):
    """Register all routes with the Flask application"""
    
    # Global token validation for ALL API requests
    @app.before_request
    def validate_test_token():
        # Only validate API endpoints (anything starting with /api/)
        if request.path.startswith('/api/'):
            # Check for token in header first, then URL parameter
            token = request.headers.get('X-Test-Token') or request.args.get('token')
            
            if token != 'testabc':
                return jsonify({'error': 'Invalid or missing test token'}), 401
    
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
    
    # Register app updates routes
    register_app_updates_routes(app, managers)
    
    # Register app discovery routes
    register_app_discovery_routes(app, managers) 
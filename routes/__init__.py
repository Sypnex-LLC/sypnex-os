"""
Routes package for Sypnex OS application
"""
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
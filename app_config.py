"""
Configuration and constants for the Sypnex OS application
"""
from flask import Flask
from flask_cors import CORS
from user_app_manager import UserAppManager
from user_preferences import UserPreferences
from websocket_manager import WebSocketManager
from terminal_manager import TerminalManager
from service_manager import get_service_manager
from virtual_file_manager import get_virtual_file_manager
from system_boot_manager import get_system_boot_manager
from logs_manager import LogsManager
from app_utils import load_user_requirements
import os
import shutil

# Built-in apps (not plugins)
BUILTIN_APPS = {
    'user-app-manager': {
        'id': 'user-app-manager',
        'name': 'User App Manager',
        'icon': 'fas fa-user-cog',
        'description': 'Manage and discover user-created applications',
        'keywords': ['user', 'app', 'manage', 'discover', 'custom'],
        'template': 'apps/user-app-manager.html'
    },
    'system-settings': {
        'id': 'system-settings',
        'name': 'System Settings',
        'icon': 'fas fa-cog',
        'description': 'Configure system preferences and manage OS settings',
        'keywords': ['settings', 'preferences', 'system', 'config', 'options'],
        'template': 'apps/system-settings.html'
    },
    'websocket-server': {
        'id': 'websocket-server',
        'name': 'WebSocket Server',
        'icon': 'fas fa-network-wired',
        'description': 'Real-time WebSocket communication server',
        'keywords': ['websocket', 'real-time', 'communication', 'socket', 'server'],
        'template': 'apps/websocket-server.html'
    },
    'terminal': {
        'id': 'terminal',
        'name': 'Terminal',
        'icon': 'fas fa-terminal',
        'description': 'Command line interface with extensible command system',
        'keywords': ['terminal', 'command', 'cli', 'shell'],
        'template': 'apps/terminal.html'
    },
    'virtual-file-system': {
        'id': 'virtual-file-system',
        'name': 'Virtual File System',
        'icon': 'fas fa-folder-open',
        'description': 'Manage virtual files and folders stored in SQLite database',
        'keywords': ['file', 'folder', 'storage', 'database', 'virtual'],
        'template': 'apps/virtual-file-system.html'
    },
    'resource-manager': {
        'id': 'resource-manager',
        'name': 'Resource Manager',
        'icon': 'fas fa-tachometer-alt',
        'description': 'Monitor system resources and running applications in real-time',
        'keywords': ['resource', 'task', 'manager', 'system', 'monitor'],
        'template': 'apps/resource-manager.html'
    }
}

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, 
         resources={
             r"/api/*": {
                 "origins": ["http://localhost:5000", "http://127.0.0.1:5000", "*"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
             },
             r"/apidocs/*": {
                 "origins": ["http://localhost:5000", "http://127.0.0.1:5000", "*"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
             },
             r"/apispec_1.json": {
                 "origins": ["http://localhost:5000", "http://127.0.0.1:5000", "*"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
             },
             r"/flasgger_static/*": {
                 "origins": ["http://localhost:5000", "http://127.0.0.1:5000", "*"],
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
             }
         },
         supports_credentials=True
    )
    
    return app

def ensure_runtime_databases_exist():
    """Copy template databases to runtime if they don't exist"""
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    databases = [
        ('user_preferences', 'User preferences'),
        ('virtual_files', 'Virtual file system')
    ]
    
    for db_name, description in databases:
        runtime_path = f'data/{db_name}.db'
        template_path = f'defaults/databases/{db_name}.template'
        
        if not os.path.exists(runtime_path) and os.path.exists(template_path):
            shutil.copy2(template_path, runtime_path)
            print(f"📋 Initialized {description} database from template")

def initialize_managers():
    """Initialize all system managers"""
    # Ensure runtime databases exist from templates before any manager initialization
    ensure_runtime_databases_exist()
    
    # Initialize VFS and logs first (these are foundational)
    virtual_file_manager = get_virtual_file_manager()
    logs_manager = LogsManager(virtual_file_manager)
    
    # Initialize core managers with logger dependency
    user_app_manager = UserAppManager(logs_manager)
    user_preferences = UserPreferences(logs_manager)
    websocket_manager = WebSocketManager(logs_manager)
    
    # Terminal manager depends on other managers, so initialize it last
    terminal_manager = TerminalManager(user_app_manager, websocket_manager, logs_manager)

    # Initialize service manager with logger
    service_manager = get_service_manager(logs_manager)
    
    return {
        'user_app_manager': user_app_manager,
        'user_preferences': user_preferences,
        'websocket_manager': websocket_manager,
        'terminal_manager': terminal_manager,
        'service_manager': service_manager,
        'virtual_file_manager': virtual_file_manager,
        'logs_manager': logs_manager
    }

def initialize_system(managers):
    """Initialize the system with all managers"""
    print("🔄 Initializing system components...")
    
    # Initialize system boot manager and reset counters
    boot_manager = get_system_boot_manager()
    boot_manager.initialize_system()
    
    # # Set default system preferences
    # set_default_preferences(managers['user_preferences'])
    
    # # Load user requirements
    # load_user_requirements(managers['virtual_file_manager'])
   
    # Discover user apps
    managers['user_app_manager'].discover_user_apps()
    
    print("✅ System initialization complete")
    return managers

# def set_default_preferences(user_preferences):
#     """Set default system preferences if they don't exist"""
#     print("🔧 Setting default system preferences...")
    
#     # Developer mode - default to disabled
#     if user_preferences.get_preference('system', 'developer_mode') is None:
#         user_preferences.set_preference('system', 'developer_mode', 'false')
#         print("  - Set developer_mode: false")
    
#     print("✅ Default preferences set") 
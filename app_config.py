"""
Configuration and constants for the Sypnex OS application
"""

# Sypnex OS Version - Update this manually when deploying new versions
SYPNEX_OS_VERSION = "0.8.2"

from flask import Flask
from flask_cors import CORS
from user_app_manager import UserAppManager
from user_preferences import UserPreferences
from websocket_manager import WebSocketManager
from service_manager import get_service_manager
from virtual_file_manager import get_virtual_file_manager
from system_boot_manager import get_system_boot_manager
from logs_manager import LogsManager
from app_utils import load_user_requirements, install_app_direct
import os
import shutil
import json
import requests
import glob
import hashlib
import secrets
import bcrypt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Authentication configuration loaded from environment
AUTH_CONFIG = {}
# No more SESSION_STORE - JWT is stateless!

def load_auth_config():
    """Load authentication configuration from environment variables"""
    global AUTH_CONFIG
    
    AUTH_CONFIG = {
        'users': {},
        'instance_name': os.getenv('INSTANCE_NAME', 'default-instance'),
        'session_secret': os.getenv('SESSION_SECRET_KEY', 'default-secret-change-me')
    }
    
    # Load users from environment (AUTH_USER_1, AUTH_USER_2, etc.)
    user_count = 1
    while True:
        user_env = os.getenv(f'AUTH_USER_{user_count}')
        if not user_env:
            break
        
        if ':' in user_env:
            username, password_hash = user_env.split(':', 1)
            AUTH_CONFIG['users'][username] = password_hash
            print(f"🔑 Loaded user: {username}")
        
        user_count += 1
    
    if not AUTH_CONFIG['users']:
        # No fallback users - if no users configured, authentication is disabled
        print("❌ ERROR: No users found in environment variables!")
        print("❌ Please configure AUTH_USER_1, AUTH_USER_2, etc. in your .env file")
        print("❌ Authentication will fail until users are properly configured")
        # Do NOT create fallback users - this is a security risk
    
    print(f"✅ Auth config loaded for instance: {AUTH_CONFIG['instance_name']}")
    print(f"👥 {len(AUTH_CONFIG['users'])} users configured")

def verify_password(username, password):
    """Verify username and password against configuration"""
    if username not in AUTH_CONFIG['users']:
        return False
    
    stored_hash = AUTH_CONFIG['users'][username].encode('utf-8')
    return bcrypt.checkpw(password.encode('utf-8'), stored_hash)

def create_session_token(username):
    """Create a JWT session token for the user"""
    import jwt
    import time
    
    # JWT payload with 24-hour expiration
    payload = {
        'username': username,
        'created_at': time.time(),
        'exp': time.time() + (24 * 60 * 60),  # 24 hours
        'iss': AUTH_CONFIG['instance_name'],  # issuer
        'iat': time.time()  # issued at
    }
    
    # Sign with our secret key
    token = jwt.encode(payload, AUTH_CONFIG['session_secret'], algorithm='HS256')
    
    print(f"🎫 Created JWT token for {username}: {token[:8]}...")
    return token

def validate_session_token(token):
    """Validate JWT session token"""
    if not token:
        return None
        
    try:
        import jwt
        
        # Decode and validate JWT (handles expiration automatically)
        payload = jwt.decode(token, AUTH_CONFIG['session_secret'], algorithms=['HS256'])
        
        # JWT is valid, return username
        return payload['username']
        
    except jwt.ExpiredSignatureError:
        print("🕐 JWT token expired")
        return None
    except jwt.InvalidTokenError:
        print("🚫 Invalid JWT token")
        return None

def get_active_sessions():
    """JWT is stateless - no session tracking needed"""
    return {
        'message': 'JWT tokens are stateless - no server-side session tracking',
        'note': 'Tokens are validated cryptographically with signature verification'
    }

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
    # Load authentication config first
    load_auth_config()
    
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

def initialize_managers():
    """Initialize all system managers"""
    # Check if this is first boot before initializing databases
    first_boot = is_first_boot()
    
    # Ensure runtime databases exist from templates before any manager initialization
    # Initialize VFS and logs first (these are foundational)
    virtual_file_manager = get_virtual_file_manager()
    logs_manager = LogsManager(virtual_file_manager)
    
    # Initialize core managers with logger dependency
    user_app_manager = UserAppManager(logs_manager)
    user_preferences = UserPreferences(logs_manager)
    websocket_manager = WebSocketManager(logs_manager)

    # Initialize service manager with logger and VFS manager
    service_manager = get_service_manager(logs_manager, virtual_file_manager)
    
    managers = {
        'user_app_manager': user_app_manager,
        'user_preferences': user_preferences,
        'websocket_manager': websocket_manager,
        'service_manager': service_manager,
        'virtual_file_manager': virtual_file_manager,
        'logs_manager': logs_manager
    }
    
    # If this was first boot, seed the system
    if first_boot:
        seed_first_boot(managers)
        
        # Re-discover services after first boot seeding to pick up any services
        # installed via essential apps (fixes race condition)
        print("🔄 Re-discovering services after first boot seeding...")
        managers['service_manager'].discover_services()
        print("✅ Service re-discovery complete")
    
    return managers

def initialize_system(managers):
    """Initialize the system with all managers"""
    print("🔄 Initializing system components...")
    
    # Initialize system boot manager and reset counters
    boot_manager = get_system_boot_manager()
    boot_manager.initialize_system()

    # Discover user apps
    managers['user_app_manager'].discover_user_apps()
    
    print("✅ System initialization complete")
    return managers

def is_first_boot():
    """Check if this is a first boot (no database files exist)"""
    databases = ['data/user_preferences.db', 'data/virtual_files.db']
    return not any(os.path.exists(db) for db in databases)

def seed_first_boot(managers):
    """Seed the system on first boot using the preferences.json configuration"""
    config_path = 'defaults/preferences.json'
    
    if not os.path.exists(config_path):
        print("⚠️  No preferences.json found, skipping first boot seeding")
        return
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print("🌱 Starting first boot seeding...")
        
        # Step 1: Install essential apps
        install_essential_apps(managers)
        
        # Step 2: Create VFS directories
        create_vfs_directories(config.get('asset_mappings', {}), managers)
        
        # Step 3: Upload assets to VFS
        upload_assets_to_vfs(config.get('asset_mappings', {}), managers)
        
        # Step 4: Set default preferences
        set_default_preferences(config.get('preferences', []), managers)
        
        print("✅ First boot seeding completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during first boot seeding: {e}")
        import traceback
        traceback.print_exc()

def install_essential_apps(managers):
    """Install essential apps from defaults/essential-apps/"""
    apps_dir = 'defaults/essential-apps'
    
    if not os.path.exists(apps_dir):
        print("⚠️  No essential-apps directory found")
        return
    
    app_files = glob.glob(f'{apps_dir}/*.app')
    if not app_files:
        print("⚠️  No .app files found in essential-apps")
        return
    
    print(f"📱 Installing {len(app_files)} essential apps...")
    
    for app_file in app_files:
        try:
            print(f"  - Installing {os.path.basename(app_file)}...")
            success = install_app_direct(app_file, managers['virtual_file_manager'])
            if success:
                print(f"    ✅ Installed successfully")
            else:
                print(f"    ❌ Installation failed")
        except Exception as e:
            print(f"    ❌ Error installing {app_file}: {e}")

def create_vfs_directories(asset_mappings, managers):
    """Create VFS directories for asset uploads"""
    mappings = asset_mappings.get('mappings', [])
    if not mappings:
        return
    
    print(f"📁 Creating {len(mappings)} VFS directories...")
    
    for mapping in mappings:
        vfs_path = mapping.get('vfs_path')
        if not vfs_path:
            continue
        
        try:
            # Split path and create directories recursively
            path_parts = [p for p in vfs_path.split('/') if p]
            current_path = ''
            
            for part in path_parts:
                parent_path = current_path or '/'
                current_path = f'{current_path}/{part}' if current_path else f'/{part}'
                
                # Check if directory exists
                if not managers['virtual_file_manager']._path_exists(current_path):
                    success = managers['virtual_file_manager'].create_directory(current_path)
                    if success:
                        print(f"  ✅ Created directory: {current_path}")
                    else:
                        print(f"  ❌ Failed to create directory: {current_path}")
                        
        except Exception as e:
            print(f"  ❌ Error creating directory {vfs_path}: {e}")

def upload_assets_to_vfs(asset_mappings, managers):
    """Upload assets to VFS based on mappings"""
    mappings = asset_mappings.get('mappings', [])
    if not mappings:
        return
    
    print("📤 Uploading assets to VFS...")
    
    for mapping in mappings:
        local_path = mapping.get('local_path')
        vfs_path = mapping.get('vfs_path')
        
        if not local_path or not vfs_path:
            continue
        
        full_local_path = f'defaults/{local_path}'
        if not os.path.exists(full_local_path):
            print(f"  ⚠️  Local path not found: {full_local_path}")
            continue
        
        # Upload all files in the directory
        for root, dirs, files in os.walk(full_local_path):
            for file in files:
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, full_local_path)
                vfs_file_path = f"{vfs_path}/{relative_path}".replace('\\', '/')
                
                try:
                    with open(file_path, 'rb') as f:
                        file_content = f.read()
                    
                    success = managers['virtual_file_manager'].create_file(vfs_file_path, file_content)
                    if success:
                        print(f"  ✅ Uploaded: {file} -> {vfs_file_path}")
                    else:
                        print(f"  ❌ Failed to upload: {file}")
                        
                except Exception as e:
                    print(f"  ❌ Error uploading {file}: {e}")

def set_default_preferences(preferences, managers):
    """Set default preferences using the preferences API"""
    if not preferences:
        return
    
    print(f"⚙️  Setting {len(preferences)} default preferences...")
    
    for pref in preferences:
        category = pref.get('category')
        key = pref.get('key')
        value = pref.get('value')
        
        if not all([category, key, value is not None]):
            continue
        
        try:
            success = managers['user_preferences'].set_preference(category, key, value)
            if success:
                print(f"  ✅ Set {category}/{key} = {value}")
            else:
                print(f"  ❌ Failed to set {category}/{key}")
                
        except Exception as e:
            print(f"  ❌ Error setting preference {category}/{key}: {e}")
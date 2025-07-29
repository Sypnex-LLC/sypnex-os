import sqlite3
import json
import os
import hashlib
import secrets
from datetime import datetime
from typing import Dict, Any, Optional

class UserPreferences:
    def __init__(self, logs_manager=None, db_path: str = "data/user_preferences.db"):
        self.logs_manager = logs_manager
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize the SQLite database with required tables"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Enable WAL mode for better concurrency and performance
            cursor.execute('PRAGMA journal_mode=WAL')
            cursor.execute('PRAGMA synchronous=NORMAL')
            cursor.execute('PRAGMA cache_size=5000')
            cursor.execute('PRAGMA temp_store=MEMORY')
            
            # Create preferences table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS preferences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(category, key)
                )
            ''')
            
            # Create app_window_states table for window positions/sizes
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS app_window_states (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    app_id TEXT NOT NULL UNIQUE,
                    x INTEGER NOT NULL,
                    y INTEGER NOT NULL,
                    width INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    maximized BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create app_settings table for app-specific settings
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS app_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    app_id TEXT NOT NULL,
                    setting_key TEXT NOT NULL,
                    setting_value TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(app_id, setting_key)
                )
            ''')
            
            # Add performance indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_preferences_category_key ON preferences(category, key)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_app_settings_app_key ON app_settings(app_id, setting_key)')
            
            conn.commit()
            
        # Initialize server-side security salt
        self._ensure_security_salt()
    
    def _ensure_security_salt(self):
        """Ensure a server-side salt exists for security preferences"""
        try:
            # Check if salt already exists
            existing_salt = self.get_preference('_internal', 'security_salt')
            if not existing_salt:
                # Generate a new random salt
                salt = secrets.token_hex(32)  # 64-character hex string
                self.set_preference('_internal', 'security_salt', salt)
                if self.logs_manager:
                    self.logs_manager.log_info("Generated new security salt for preferences")
        except Exception as e:
            print(f"Error ensuring security salt: {e}")
    
    def _get_security_salt(self) -> str:
        """Get the server-side security salt"""
        return self.get_preference('_internal', 'security_salt', 'default_fallback_salt')
    
    def _hash_security_value(self, value: str) -> str:
        """Hash a security value with server-side salt"""
        salt = self._get_security_salt()
        # Use SHA-256 with salt
        return hashlib.sha256((value + salt).encode()).hexdigest()
    
    def _is_security_preference(self, category: str) -> bool:
        """Check if a preference category is security-related"""
        return category == 'security'
    
    def get_preference(self, category: str, key: str, default: Any = None) -> Any:
        """Get a preference value"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'SELECT value FROM preferences WHERE category = ? AND key = ?',
                    (category, key)
                )
                result = cursor.fetchone()
                
                if result:
                    stored_value = json.loads(result[0])
                    
                    # For security preferences, we return a boolean indicating if value exists
                    # but never return the actual hash
                    if self._is_security_preference(category):
                        return bool(stored_value)  # Return True if hash exists, False if empty
                    
                    return stored_value
                return default
        except Exception as e:
            print(f"Error getting preference {category}.{key}: {e}")
            return default
    
    def set_preference(self, category: str, key: str, value: Any) -> bool:
        """Set a preference value"""
        try:
            # Handle security preferences with hashing
            if self._is_security_preference(category):
                # If value is empty string, store empty (for removal)
                if value == '':
                    stored_value = ''
                else:
                    # Hash the security value
                    stored_value = self._hash_security_value(str(value))
            else:
                # Regular preferences stored as-is
                stored_value = value
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO preferences (category, key, value, updated_at)
                    VALUES (?, ?, ?, ?)
                ''', (category, key, json.dumps(stored_value), datetime.now().isoformat()))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error setting preference {category}.{key}: {e}")
            return False
    
    def verify_security_preference(self, category: str, key: str, value: str) -> bool:
        """Verify a security preference value against the stored hash"""
        if not self._is_security_preference(category):
            return False
            
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'SELECT value FROM preferences WHERE category = ? AND key = ?',
                    (category, key)
                )
                result = cursor.fetchone()
                
                if not result:
                    return False
                
                stored_hash = json.loads(result[0])
                if not stored_hash:  # Empty hash means no security value set
                    return False
                
                # Hash the provided value and compare
                provided_hash = self._hash_security_value(str(value))
                return stored_hash == provided_hash
                
        except Exception as e:
            print(f"Error verifying security preference {category}.{key}: {e}")
            return False
    
    def delete_preference(self, category: str, key: str) -> bool:
        """Delete a preference"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'DELETE FROM preferences WHERE category = ? AND key = ?',
                    (category, key)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error deleting preference {category}.{key}: {e}")
            return False
    
    def get_all_preferences(self, category: str = None) -> Dict[str, Any]:
        """Get all preferences, optionally filtered by category"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                if category:
                    cursor.execute(
                        'SELECT key, value FROM preferences WHERE category = ?',
                        (category,)
                    )
                else:
                    cursor.execute('SELECT category, key, value FROM preferences')
                
                results = cursor.fetchall()
                preferences = {}
                
                for row in results:
                    if category:
                        key, value = row
                        preferences[key] = json.loads(value)
                    else:
                        cat, key, value = row
                        if cat not in preferences:
                            preferences[cat] = {}
                        preferences[cat][key] = json.loads(value)
                
                return preferences
        except Exception as e:
            print(f"Error getting all preferences: {e}")
            return {}
    
    # Window state management
    def save_window_state(self, app_id: str, x: int, y: int, width: int, height: int, maximized: bool = False) -> bool:
        """Save window position and size for an app"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO app_window_states 
                    (app_id, x, y, width, height, maximized, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (app_id, x, y, width, height, maximized, datetime.now().isoformat()))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error saving window state for {app_id}: {e}")
            return False
    
    def get_window_state(self, app_id: str) -> Optional[Dict[str, Any]]:
        """Get saved window state for an app"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'SELECT x, y, width, height, maximized FROM app_window_states WHERE app_id = ?',
                    (app_id,)
                )
                result = cursor.fetchone()
                
                if result:
                    return {
                        'x': result[0],
                        'y': result[1],
                        'width': result[2],
                        'height': result[3],
                        'maximized': bool(result[4])
                    }
                return None
        except Exception as e:
            print(f"Error getting window state for {app_id}: {e}")
            return None
    
    def delete_window_state(self, app_id: str) -> bool:
        """Delete saved window state for an app"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM app_window_states WHERE app_id = ?', (app_id,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error deleting window state for {app_id}: {e}")
            return False
    
    # App-specific settings
    def save_app_setting(self, app_id: str, key: str, value: Any) -> bool:
        """Save an app-specific setting"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO app_settings (app_id, setting_key, setting_value, updated_at)
                    VALUES (?, ?, ?, ?)
                ''', (app_id, key, json.dumps(value), datetime.now().isoformat()))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error saving app setting {app_id}.{key}: {e}")
            return False
    
    def get_app_setting(self, app_id: str, key: str, default: Any = None) -> Any:
        """Get an app-specific setting, falling back to default from .app file if not in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'SELECT setting_value FROM app_settings WHERE app_id = ? AND setting_key = ?',
                    (app_id, key)
                )
                result = cursor.fetchone()
                
                if result:
                    # Return the value from the database
                    return json.loads(result[0])
                
                # If not found in database, return the provided default (which should be from .app file)
                return default
        except Exception as e:
            print(f"Error getting app setting {app_id}.{key}: {e}")
            return default
    
    def get_all_app_settings(self, app_id: str) -> Dict[str, Any]:
        """Get all settings for an app, merging database values with defaults from .app file"""
        try:
            # First, get all settings from the database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'SELECT setting_key, setting_value FROM app_settings WHERE app_id = ?',
                    (app_id,)
                )
                results = cursor.fetchall()
                
                db_settings = {}
                for key, value in results:
                    db_settings[key] = json.loads(value)
            
            # Get default settings from .app file
            default_settings = self._get_default_app_settings(app_id)
            
            # Merge: database values take precedence over defaults
            merged_settings = default_settings.copy()
            merged_settings.update(db_settings)
            
            return merged_settings
        except Exception as e:
            print(f"Error getting all app settings for {app_id}: {e}")
            return {}
    
    def _get_default_app_settings(self, app_id: str) -> Dict[str, Any]:
        """Get default settings from the .app file"""
        try:
            import json
            import os
            
            # Look for the .app file in user_apps directory
            app_file_path = f"user_apps/{app_id}/{app_id}.app"
            
            if not os.path.exists(app_file_path):
                return {}
            
            with open(app_file_path, 'r', encoding='utf-8') as f:
                app_data = json.load(f)
            
            # Extract settings from the .app file
            settings = app_data.get('settings', [])
            default_settings = {}
            
            for setting in settings:
                if isinstance(setting, dict) and 'key' in setting and 'value' in setting:
                    default_settings[setting['key']] = setting['value']
            
            return default_settings
        except Exception as e:
            print(f"Error getting default app settings for {app_id}: {e}")
            return {}
    
    def delete_app_setting(self, app_id: str, key: str) -> bool:
        """Delete an app-specific setting"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'DELETE FROM app_settings WHERE app_id = ? AND setting_key = ?',
                    (app_id, key)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Error deleting app setting {app_id}.{key}: {e}")
            return False
    
    # Export and import preferences
    def export_preferences(self, filepath: str) -> bool:
        """Export all preferences to a JSON file"""
        try:
            data = {
                'preferences': self.get_all_preferences(),
                'window_states': {},
                'app_settings': {}
            }
            
            # Get all window states
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT app_id, x, y, width, height, maximized FROM app_window_states')
                for row in cursor.fetchall():
                    data['window_states'][row[0]] = {
                        'x': row[1], 'y': row[2], 'width': row[3], 
                        'height': row[4], 'maximized': bool(row[5])
                    }
                
                # Get all app settings
                cursor.execute('SELECT app_id, setting_key, setting_value FROM app_settings')
                for row in cursor.fetchall():
                    if row[0] not in data['app_settings']:
                        data['app_settings'][row[0]] = {}
                    data['app_settings'][row[0]][row[1]] = json.loads(row[2])
            
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            
            return True
        except Exception as e:
            print(f"Error exporting preferences: {e}")
            return False
    
    def import_preferences(self, filepath: str) -> bool:
        """Import preferences from a JSON file"""
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            # Import preferences
            for category, prefs in data.get('preferences', {}).items():
                for key, value in prefs.items():
                    self.set_preference(category, key, value)
            
            # Import window states
            for app_id, state in data.get('window_states', {}).items():
                self.save_window_state(
                    app_id, state['x'], state['y'], 
                    state['width'], state['height'], state['maximized']
                )
            
            # Import app settings
            for app_id, settings in data.get('app_settings', {}).items():
                for key, value in settings.items():
                    self.save_app_setting(app_id, key, value)
            
            return True
        except Exception as e:
            print(f"Error importing preferences: {e}")
            return False
    
    def reset_all_preferences(self) -> bool:
        """Reset all preferences (dangerous!)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM preferences')
                cursor.execute('DELETE FROM app_window_states')
                cursor.execute('DELETE FROM app_settings')
                conn.commit()
                return True
        except Exception as e:
            print(f"Error resetting preferences: {e}")
            return False 
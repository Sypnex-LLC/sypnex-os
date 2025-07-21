"""
User preferences and app settings routes for the Sypnex OS application
"""
from flask import request, jsonify
import os

def register_preference_routes(app, managers):
    """Register user preferences and app settings routes"""
    
    # User Preferences API endpoints
    @app.route('/api/preferences/<category>/<key>', methods=['GET'])
    def get_preference(category, key):
        """Get a preference value"""
        value = managers['user_preferences'].get_preference(category, key)
        return jsonify({'success': True, 'value': value})

    @app.route('/api/preferences/<category>/<key>', methods=['POST'])
    def set_preference(category, key):
        """Set a preference value"""
        data = request.get_json()
        value = data.get('value')
        success = managers['user_preferences'].set_preference(category, key, value)
        return jsonify({'success': success})

    @app.route('/api/preferences/<category>/<key>', methods=['DELETE'])
    def delete_preference(category, key):
        """Delete a preference"""
        success = managers['user_preferences'].delete_preference(category, key)
        return jsonify({'success': success})

    @app.route('/api/preferences/<category>/<key>/verify', methods=['POST'])
    def verify_security_preference(category, key):
        """Verify a security preference value (for PIN codes, etc.)"""
        data = request.get_json()
        value = data.get('value')
        
        if not value:
            return jsonify({'success': False, 'error': 'Value is required'})
        
        is_valid = managers['user_preferences'].verify_security_preference(category, key, value)
        return jsonify({'success': True, 'valid': is_valid})

    @app.route('/api/preferences', methods=['GET'])
    def get_all_preferences():
        """Get all preferences"""
        category = request.args.get('category')
        preferences = managers['user_preferences'].get_all_preferences(category)
        return jsonify({'success': True, 'preferences': preferences})

    # Window state management
    @app.route('/api/window-state/<app_id>', methods=['GET'])
    def get_window_state(app_id):
        """Get saved window state for an app"""
        state = managers['user_preferences'].get_window_state(app_id)
        return jsonify({'success': True, 'state': state})

    @app.route('/api/window-state/<app_id>', methods=['POST'])
    def save_window_state(app_id):
        """Save window state for an app"""
        data = request.get_json()
        x = data.get('x', 0)
        y = data.get('y', 0)
        width = data.get('width', 500)
        height = data.get('height', 400)
        maximized = data.get('maximized', False)
        
        success = managers['user_preferences'].save_window_state(app_id, x, y, width, height, maximized)
        return jsonify({'success': success})

    @app.route('/api/window-state/<app_id>', methods=['DELETE'])
    def delete_window_state(app_id):
        """Delete saved window state for an app"""
        success = managers['user_preferences'].delete_window_state(app_id)
        return jsonify({'success': success})

    # App-specific settings
    @app.route('/api/app-settings/<app_id>/<key>', methods=['GET'])
    def get_app_setting(app_id, key):
        """Get an app-specific setting"""
        # Get default value from .app file
        default_value = None
        try:
            # Check user apps first
            user_app = managers['user_app_manager'].get_user_app(app_id)
            if user_app and 'settings' in user_app:
                for setting in user_app['settings']:
                    if setting.get('key') == key:
                        default_value = setting.get('value')
                        break
            
            # Terminal apps are no longer supported in UserAppManager
        except Exception as e:
            print(f"Error getting default value for {app_id}.{key}: {e}")
        
        # Get the setting value (database value takes precedence over default)
        value = managers['user_preferences'].get_app_setting(app_id, key, default_value)
        return jsonify({'success': True, 'value': value})

    @app.route('/api/app-settings/<app_id>/<key>', methods=['POST'])
    def save_app_setting(app_id, key):
        """Save an app-specific setting"""
        data = request.get_json()
        value = data.get('value')
        success = managers['user_preferences'].save_app_setting(app_id, key, value)
        return jsonify({'success': success})

    @app.route('/api/app-settings/<app_id>', methods=['GET'])
    def get_all_app_settings(app_id):
        """Get all settings for an app"""
        settings = managers['user_preferences'].get_all_app_settings(app_id)
        return jsonify({'success': True, 'settings': settings})

    @app.route('/api/app-metadata/<app_id>', methods=['GET'])
    def get_app_metadata(app_id):
        """Get app metadata including settings from .app files"""
        try:
            # Check built-in apps first
            from app_config import BUILTIN_APPS
            if app_id in BUILTIN_APPS:
                return jsonify({
                    'id': app_id,
                    'name': BUILTIN_APPS[app_id]['name'],
                    'icon': BUILTIN_APPS[app_id]['icon'],
                    'description': BUILTIN_APPS[app_id]['description'],
                    'type': 'builtin',
                    'settings': []  # Built-in apps don't have settings
                })
            
           
            # Check user apps
            user_app = managers['user_app_manager'].get_user_app(app_id)
            if user_app:
                return jsonify({
                    'id': app_id,
                    'name': user_app['name'],
                    'icon': user_app['icon'],
                    'description': user_app['description'],
                    'type': 'user_app',
                    'version': user_app.get('version', '1.0.0'),  # Include version from .app file
                    'settings': user_app.get('settings', [])  # Include settings from .app file
                })
            
            # Terminal apps are no longer supported in UserAppManager
            
            return jsonify({'error': 'App not found'}), 404
            
        except Exception as e:
            print(f"Error getting app metadata for {app_id}: {e}")
            return jsonify({'error': 'Failed to get app metadata'}), 500

    # Export/Import preferences
    @app.route('/api/preferences/export', methods=['POST'])
    def export_preferences():
        """Export all preferences to a JSON file"""
        data = request.get_json()
        filepath = data.get('filepath', 'sypnex_preferences.json')
        success = managers['user_preferences'].export_preferences(filepath)
        return jsonify({'success': success, 'filepath': filepath})

    @app.route('/api/preferences/import', methods=['POST'])
    def import_preferences():
        """Import preferences from a JSON file"""
        data = request.get_json()
        filepath = data.get('filepath')
        if not filepath or not os.path.exists(filepath):
            return jsonify({'success': False, 'error': 'File not found'})
        
        success = managers['user_preferences'].import_preferences(filepath)
        return jsonify({'success': success})

    @app.route('/api/preferences/reset', methods=['POST'])
    def reset_preferences():
        """Reset all preferences"""
        success = managers['user_preferences'].reset_all_preferences()
        return jsonify({'success': success}) 
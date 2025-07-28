"""
Core routes for the Sypnex OS application
"""
from flask import render_template, request, jsonify
from app_utils import get_system_uptime, get_current_time_info, sanitize_user_app_content

def register_core_routes(app, managers, builtin_apps):
    """Register core application routes"""
    
    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/api/search')
    def search_apps():
        """Search for applications by name, description, or keywords"""
        query = request.args.get('q', '').lower()
        results = []
        
        # Handle empty query - return empty results
        if not query.strip():
            return jsonify([])
        
        try:
            # Get all available apps
            all_apps = []
            
            # Add built-in apps
            for app_id, app_data in builtin_apps.items():
                all_apps.append({
                    'id': app_id,
                    'name': app_data['name'],
                    'description': app_data['description'],
                    'icon': app_data['icon'],
                    'keywords': app_data.get('keywords', []),
                    'type': 'builtin'
                })
            
            # Add user apps
            user_apps = managers['user_app_manager'].get_user_apps_for_search()
            all_apps.extend(user_apps)
            
            # Add apps that match query
            for app in all_apps:
                # Search in name, description, and keywords
                searchable_text = [
                    app['name'].lower(),
                    app['description'].lower(),
                    *[keyword.lower() for keyword in app.get('keywords', [])]
                ]
                
                if any(query in text for text in searchable_text):
                    # Return only the fields expected by the frontend
                    results.append({
                        'id': app['id'],
                        'name': app['name'],
                        'description': app['description'],
                        'icon': app['icon']
                    })
            
            return jsonify(results)
            
        except Exception as e:
            print(f"Error in search_apps: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Search failed'}), 500

    @app.route('/api/heartbeat')
    def heartbeat():
        """Get system heartbeat with time, date, and system status"""
        time_info = get_current_time_info()
        uptime_seconds = get_system_uptime()
        
        return jsonify({
            'time': time_info['time'],
            'date': time_info['date'],
            'day': time_info['day'],
            'timestamp': time_info['timestamp'],
            'uptime': uptime_seconds,
            'status': 'healthy',
        })

    @app.route('/api/time')
    def get_time():
        """Get current time and date information"""
        time_info = get_current_time_info()
        return jsonify(time_info)

    @app.route('/api/apps/<app_id>')
    def get_app(app_id):
        # Check built-in apps first
        if app_id in builtin_apps:
            return render_template(builtin_apps[app_id]['template'], app=builtin_apps[app_id])
        
        # Check user apps
        user_app = managers['user_app_manager'].get_user_app(app_id)
        if user_app:
            # Sanitize the HTML content for security
            sanitized_content = sanitize_user_app_content(user_app['html_content'], app_id)
            return sanitized_content
        
        return jsonify({'error': 'App not found'}), 404

    @app.route('/api/apps/<app_id>/launch')
    def launch_app(app_id):
        """Get all data needed to launch an app in a single request"""
        try:
            # Get app data and HTML content
            app_data = None
            html_content = None
            app_type = None
            
            # Check built-in apps first
            if app_id in builtin_apps:
                app_data = builtin_apps[app_id]
                app_type = 'builtin'
                # Render the template to get HTML content
                html_content = render_template(app_data['template'], app=app_data)
            else:
                # Check user apps
                user_app = managers['user_app_manager'].get_user_app(app_id)
                if user_app:
                    app_data = user_app
                    app_type = 'user_app'
                    # Sanitize the HTML content for security
                    html_content = sanitize_user_app_content(user_app['html_content'], app_id)
                else:
                    return jsonify({'error': 'App not found'}), 404
            
            # Get app metadata (settings, etc.)
            metadata = {
                'settings': [],
                'hasSettings': False,
                'canReload': app_type == 'user_app'
            }
            
            try:
                # For built-in apps, check BUILTIN_APPS
                if app_type == 'builtin':
                    from app_config import BUILTIN_APPS
                    if app_id in BUILTIN_APPS:
                        metadata.update({
                            'settings': [],  # Built-in apps don't have settings
                            'hasSettings': False,
                            'canReload': False
                        })
                else:
                    # For user apps, get settings from the app data
                    if app_data and 'settings' in app_data:
                        metadata.update({
                            'settings': app_data['settings'],
                            'hasSettings': len(app_data['settings']) > 0,
                            'canReload': True  # Will be updated based on developer mode later
                        })
            except Exception as e:
                print(f"Error getting metadata for {app_id}: {e}")
                # Keep default metadata if there's an error
            
            # Get system preferences
            preferences = {}
            try:
                # Get app scale preference
                app_scale = managers['user_preferences'].get_preference('ui', 'app_scale', '100')
                # Get developer mode preference
                developer_mode = managers['user_preferences'].get_preference('system', 'developer_mode', 'false')
                
                preferences = {
                    'appScale': app_scale,
                    'developerMode': developer_mode == 'true'
                }
            except:
                # Default preferences if fetch fails
                preferences = {
                    'appScale': '100',
                    'developerMode': False
                }
            
            # Get window state
            window_state = None
            try:
                window_state = managers['user_preferences'].get_window_state(app_id)
            except:
                # No saved window state, will use defaults
                window_state = None
            
            # Build response with all data needed for launch
            launch_data = {
                'success': True,
                'app': {
                    'id': app_id,
                    'name': app_data.get('name', 'Unknown App'),
                    'icon': app_data.get('icon', 'fas fa-question'),
                    'description': app_data.get('description', ''),
                    'type': app_type,
                    'version': app_data.get('version', '1.0.0'),
                    'html': html_content
                },
                'metadata': {
                    'settings': metadata.get('settings', []),
                    'hasSettings': len(metadata.get('settings', [])) > 0,
                    'canReload': app_type == 'user_app' and preferences['developerMode']
                },
                'preferences': preferences,
                'windowState': window_state
            }
            
            return jsonify(launch_data)
            
        except Exception as e:
            print(f"Error launching app {app_id}: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': False,
                'error': f'Failed to launch app: {str(e)}'
            }), 500

    @app.route('/app/<app_id>')
    def app_template(app_id):
        # Check built-in apps first
        if app_id in builtin_apps:
            return render_template(builtin_apps[app_id]['template'], app=builtin_apps[app_id])
        
        # Check user apps
        user_app = managers['user_app_manager'].get_user_app(app_id)
        if user_app:
            # Sanitize the HTML content for security
            sanitized_content = sanitize_user_app_content(user_app['html_content'], app_id)
            return sanitized_content
        
        return jsonify({'error': 'App not found'}), 404

    @app.route('/api/apps')
    def get_all_apps():
        """Get all available apps for dashboard"""
        try:
            all_apps = []
            
            # Add built-in apps
            for app_id, app_data in builtin_apps.items():
                all_apps.append({
                    'id': app_id,
                    'name': app_data['name'],
                    'description': app_data['description'],
                    'icon': app_data['icon'],
                    'keywords': app_data.get('keywords', []),
                    'type': 'builtin'
                })
            
            # Add user apps
            user_apps = managers['user_app_manager'].get_user_apps_for_search()
            all_apps.extend(user_apps)
            
            # Return only the fields expected by the frontend
            results = []
            for app in all_apps:
                results.append({
                    'id': app['id'],
                    'name': app['name'],
                    'icon': app['icon'],
                    'description': app['description'],
                    'type': app.get('type', 'unknown'),
                    'version': app.get('version', '1.0.0')
                })
            
            return jsonify(results)
        except Exception as e:
            print(f"Error in get_all_apps: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': 'Failed to get apps'}), 500 
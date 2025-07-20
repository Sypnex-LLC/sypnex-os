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
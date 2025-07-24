"""
App discovery routes for the Sypnex OS application
"""
from flask import request, jsonify

def register_app_discovery_routes(app, managers):
    """Register app discovery routes"""
    
    @app.route('/api/apps/by-keyword/<keyword>', methods=['GET'])
    def get_apps_by_keyword(keyword):
        """Get all apps that contain the specified keyword in their keywords array"""
        try:
            # Get all user apps
            user_apps = managers['user_app_manager'].get_all_apps()
            
            # Filter apps by keyword
            matching_apps = []
            
            for app_data in user_apps:
                app_keywords = app_data.get('keywords', [])
                
                # Check if the keyword exists in the app's keywords (case-insensitive)
                if any(keyword.lower() in app_keyword.lower() for app_keyword in app_keywords):
                    matching_apps.append({
                        'id': app_data.get('id'),
                        'name': app_data.get('name'),
                        'description': app_data.get('description'),
                        'icon': app_data.get('icon'),
                        'keywords': app_keywords,
                        'version': app_data.get('version', '1.0.0'),
                        'type': app_data.get('type', 'user_app'),
                        'source': app_data.get('source', 'unknown')
                    })
            
            # Also check built-in apps
            from app_config import BUILTIN_APPS
            for app_id, builtin_app in BUILTIN_APPS.items():
                app_keywords = builtin_app.get('keywords', [])
                
                # Check if the keyword exists in the built-in app's keywords (case-insensitive)
                if any(keyword.lower() in app_keyword.lower() for app_keyword in app_keywords):
                    matching_apps.append({
                        'id': builtin_app.get('id'),
                        'name': builtin_app.get('name'),
                        'description': builtin_app.get('description'),
                        'icon': builtin_app.get('icon'),
                        'keywords': app_keywords,
                        'version': '1.0.0',
                        'type': 'builtin',
                        'source': 'builtin'
                    })
            
            return jsonify({
                'success': True, 
                'apps': matching_apps,
                'keyword': keyword,
                'count': len(matching_apps)
            })
            
        except Exception as e:
            print(f"Error getting apps by keyword '{keyword}': {e}")
            return jsonify({
                'success': False, 
                'error': 'Failed to get apps by keyword',
                'apps': [],
                'keyword': keyword,
                'count': 0
            }), 500
    
    @app.route('/api/apps/keywords', methods=['GET'])
    def get_all_keywords():
        """Get all unique keywords from all apps"""
        try:
            all_keywords = set()
            
            # Get keywords from user apps
            user_apps = managers['user_app_manager'].get_all_apps()
            for app_data in user_apps:
                app_keywords = app_data.get('keywords', [])
                all_keywords.update(app_keywords)
            
            # Get keywords from built-in apps
            from app_config import BUILTIN_APPS
            for builtin_app in BUILTIN_APPS.values():
                app_keywords = builtin_app.get('keywords', [])
                all_keywords.update(app_keywords)
            
            # Sort keywords alphabetically
            sorted_keywords = sorted(list(all_keywords))
            
            return jsonify({
                'success': True, 
                'keywords': sorted_keywords,
                'count': len(sorted_keywords)
            })
            
        except Exception as e:
            print(f"Error getting all keywords: {e}")
            return jsonify({
                'success': False, 
                'error': 'Failed to get keywords',
                'keywords': [],
                'count': 0
            }), 500

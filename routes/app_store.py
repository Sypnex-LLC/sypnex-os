"""
App Store Proxy Routes
Proxies authenticated requests to the app store API
Documentation coming soon.
"""

import os
import requests
from flask import request, jsonify

def register_app_store_routes(app, managers):
    """Register App Store API proxy routes"""
    
    # Configuration
    APP_STORE_URL = os.getenv('APP_STORE_URL', 'http://127.0.0.1')
    APP_STORE_AUTH_TOKEN = os.getenv('APP_STORE_AUTH_TOKEN', 'your-default-secret-here')
    REQUEST_TIMEOUT = 30

    def proxy_to_app_store(endpoint, method='GET', params=None, json_data=None):
        """
        Proxy requests to the app store with authentication
        """
        try:
            url = f"{APP_STORE_URL}/api/app-store{endpoint}"
            print(f"Proxying to: {url}")
            print(f"Using auth token: {APP_STORE_AUTH_TOKEN[:10]}..." if APP_STORE_AUTH_TOKEN != 'your-default-secret-here' else "Using default token")
            
            headers = {
                'X-App-Store-Token': APP_STORE_AUTH_TOKEN,
                'Content-Type': 'application/json'
            }
            
            # Make the request to app store
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=REQUEST_TIMEOUT)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=json_data, timeout=REQUEST_TIMEOUT)
            else:
                return {"error": f"Unsupported method: {method}"}, 405
            
            print(f"App store response status: {response.status_code}")
            print(f"App store response headers: {dict(response.headers)}")
            
            # For download endpoints, return the raw response
            if '/download/' in endpoint:
                from flask import Response
                print(f"Returning file download, content length: {len(response.content)}")
                return Response(
                    response.content,
                    status=response.status_code,
                    headers=dict(response.headers)
                )
            
            # For other endpoints, return JSON response
            return response.json(), response.status_code
            
        except requests.exceptions.Timeout:
            return {"error": "App store request timed out"}, 504
        except requests.exceptions.ConnectionError:
            return {"error": "Unable to connect to app store"}, 503
        except requests.exceptions.RequestException as e:
            return {"error": f"App store request failed: {str(e)}"}, 500
        except Exception as e:
            return {"error": f"Unexpected error: {str(e)}"}, 500

    @app.route('/api/app-store/categories', methods=['GET'])
    def app_store_get_categories():
        """Get all app store categories"""
        result, status_code = proxy_to_app_store('/categories')
        return jsonify(result), status_code

    @app.route('/api/app-store/apps', methods=['GET'])
    def app_store_get_apps():
        """Get apps with pagination and filtering"""
        result, status_code = proxy_to_app_store('/apps', params=dict(request.args))
        return jsonify(result), status_code

    @app.route('/api/app-store/apps/<app_id>', methods=['GET'])
    def app_store_get_app_details(app_id):
        """Get specific app details"""
        result, status_code = proxy_to_app_store(f'/apps/{app_id}')
        return jsonify(result), status_code

    @app.route('/api/app-store/featured', methods=['GET'])
    def app_store_get_featured_apps():
        """Get featured apps"""
        result, status_code = proxy_to_app_store('/featured', params=dict(request.args))
        return jsonify(result), status_code

    @app.route('/api/app-store/onboarding', methods=['GET'])
    def app_store_get_onboarding_apps():
        """Get onboarding recommended apps"""
        result, status_code = proxy_to_app_store('/onboarding', params=dict(request.args))
        return jsonify(result), status_code

    @app.route('/api/app-store/search', methods=['GET'])
    def app_store_search_apps():
        """Search apps by name or description"""
        result, status_code = proxy_to_app_store('/search', params=dict(request.args))
        return jsonify(result), status_code

    @app.route('/api/app-store/stats', methods=['GET'])
    def app_store_get_stats():
        """Get app store statistics"""
        result, status_code = proxy_to_app_store('/stats', params=dict(request.args))
        return jsonify(result), status_code

    @app.route('/api/app-store/download/<app_id>', methods=['GET'])
    def app_store_download_app(app_id):
        """Get app download information"""
        return proxy_to_app_store(f'/download/{app_id}', params=dict(request.args))

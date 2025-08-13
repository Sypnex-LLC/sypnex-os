"""
User app management routes for the Sypnex OS application
"""
from flask import request, jsonify
import tempfile
import os
import json
import requests
import time
from utils.app_utils import install_app_direct, sanitize_user_app_content
from utils.performance_utils import monitor_performance, monitor_critical_performance
from utils.app_validation_policies import validate_user_app_files

def register_user_app_routes(app, managers):
    """Register user app management routes"""
    
    @app.route('/api/user-apps')
    def get_user_apps():
        """Get all user apps (both regular and terminal apps)"""
        all_apps = []
        
        # Add regular user apps
        user_apps = managers['user_app_manager'].get_user_apps_for_search()
        all_apps.extend(user_apps)
        
        return jsonify(all_apps)

    @app.route('/api/user-apps/<app_id>')
    def get_user_app(app_id):
        """Get a specific user app by ID"""
        app_data = managers['user_app_manager'].get_user_app(app_id)
        if app_data:
            # Sanitize the HTML content for security
            sanitized_content = sanitize_user_app_content(app_data['html_content'], app_id)
            return jsonify({
                'id': app_data['id'],
                'name': app_data['name'],
                'icon': app_data['icon'],
                'description': app_data['description'],
                'html': sanitized_content,  # Use sanitized content
                'type': 'user_app'
            })
        else:
            return jsonify({'error': f'User app {app_id} not found'}), 404

    @app.route('/api/user-apps/refresh', methods=['POST'])
    @monitor_performance(threshold=3.0)  # App discovery can take a few seconds
    def refresh_user_apps():
        """Refresh the user apps discovery"""
        try:
            managers['user_app_manager'].discover_user_apps()
            user_apps = managers['user_app_manager'].get_user_apps()
            
            return jsonify({
                'message': 'User apps refreshed successfully',
                'total': len(user_apps),
                'user_apps': len(user_apps)
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/user-apps/install', methods=['POST'])
    @monitor_critical_performance(threshold=5.0)  # App installations can take several seconds
    def install_user_app():
        """Install a packaged app from uploaded file"""
        try:
            if 'package' not in request.files:
                return jsonify({'error': 'No package file provided'}), 400
            
            file = request.files['package']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            if not file.filename.endswith('.app'):
                return jsonify({'error': 'Invalid file type. Please upload a .app package file'}), 400
            
            # Save the uploaded file temporarily
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, file.filename)
            file.save(temp_path)
            
            try:
                # Install app directly (no script dependency)
                success = install_app_direct(temp_path, managers['virtual_file_manager'])
                
                if success:
                    # Extract app name from the package
                    with open(temp_path, 'r', encoding='utf-8') as f:
                        package_data = json.load(f)
                        app_name = package_data.get('app_metadata', {}).get('name', 'Unknown App')
                    
                    return jsonify({
                        'message': 'App installed successfully',
                        'app_name': app_name
                    })
                else:
                    return jsonify({'error': 'Failed to install app'}), 500
                    
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
        except Exception as e:
            eprint(f"Error installing app: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Installation failed: {str(e)}'}), 500

    @app.route('/api/user-apps/update/<app_id>', methods=['POST'])
    def update_user_app(app_id):
        """Update an app by downloading from the provided URL and installing it"""
        try:
            data = request.get_json()
            if not data or 'download_url' not in data:
                return jsonify({'error': 'download_url is required in request body'}), 400
            
            download_url = data['download_url']
            
            # Handle app-store URLs differently from external URLs
            if download_url.startswith('/api/app-store/'):
                # This is an internal app store download - convert to full local URL
                from flask import request as flask_request
                download_url = f"{flask_request.url_root.rstrip('/')}{download_url}"
                print(f"Converted app-store URL to: {download_url}")
            
            # Setup headers for authentication (needed for private repos)
            headers = {}
            
            # For app store URLs, add the current user's session token for Sypnex OS auth
            if '/api/app-store/' in download_url:
                # Get the session token from the current request
                session_token = (request.headers.get('X-Session-Token') or 
                               request.cookies.get('session_token'))
                if session_token:
                    headers['X-Session-Token'] = session_token
                    print(f"Added session token for app store request")
                else:
                    print("Warning: No session token found for app store request")
            #print(download_url)
            # For GitHub URLs, add GitHub token
            github_token = os.getenv('GITHUB_TOKEN')
            if github_token and 'github.com' in download_url:
                headers['Authorization'] = f'token {github_token}'
            
            # For private repos, we need to use the API endpoint, not browser_download_url
            # The download_url should be the API asset URL, not the browser download URL
            if 'github.com' in download_url and '/releases/download/' in download_url:
                # This is a browser_download_url, we need to convert it to API URL
                # Pattern: https://github.com/owner/repo/releases/download/tag/filename
                # Convert to: https://api.github.com/repos/owner/repo/releases/assets/{asset_id}
                # But we need the asset_id, so we'll need to get it from the releases API
                return jsonify({'error': 'Please use API asset URL instead of browser download URL for private repos'}), 400
            
            # Add Accept header for asset download if this is an API URL
            if 'api.github.com' in download_url and '/releases/assets/' in download_url:
                headers['Accept'] = 'application/octet-stream'
            
            # Download the .bin file
            print(f"Downloading update for {app_id} from {download_url}")
            download_response = requests.get(download_url, headers=headers, timeout=30)
            download_response.raise_for_status()
            
            # Save downloaded content to temporary file with .app extension
            temp_dir = tempfile.gettempdir()
            temp_path = os.path.join(temp_dir, f"{app_id}_update.app")
            
            with open(temp_path, 'wb') as f:
                f.write(download_response.content)
            
            try:
                # Use the same install logic to update the app
                success = install_app_direct(temp_path, managers['virtual_file_manager'])
                
                if success:
                    # Extract app name from the package for response
                    try:
                        with open(temp_path, 'r', encoding='utf-8') as f:
                            package_data = json.load(f)
                            app_name = package_data.get('app_metadata', {}).get('name', app_id)
                    except:
                        app_name = app_id
                    
                    return jsonify({
                        'message': 'App updated successfully',
                        'app_name': app_name,
                        'app_id': app_id
                    })
                else:
                    return jsonify({'error': 'Failed to update app'}), 500
                    
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Failed to download update: {str(e)}'}), 500
        except Exception as e:
            eprint(f"Error updating app: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Update failed: {str(e)}'}), 500

    @app.route('/api/user-apps/uninstall/<app_id>', methods=['DELETE'])
    def uninstall_user_app(app_id):
        """Uninstall an app from VFS"""
        try:
            # Check if app exists in VFS
            app_vfs_path = f'/apps/installed/{app_id}'
            if not managers['virtual_file_manager']._path_exists(app_vfs_path):
                return jsonify({'error': f'App {app_id} not found in VFS'}), 404
            
            # Get app metadata before deletion
            app_metadata_path = f'{app_vfs_path}/{app_id}.app'
            app_name = 'Unknown App'
            try:
                app_data = managers['virtual_file_manager'].read_file(app_metadata_path)
                if app_data:
                    metadata = json.loads(app_data)
                    app_name = metadata.get('name', 'Unknown App')
            except:
                pass
            
            # Delete the app directory from VFS
            success = managers['virtual_file_manager'].delete_path(app_vfs_path)
            
            if success:
                return jsonify({
                    'message': 'App uninstalled successfully',
                    'app_name': app_name
                })
            else:
                return jsonify({'error': 'Failed to uninstall app'}), 500
                
        except Exception as e:
            eprint(f"Error uninstalling app: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Uninstallation failed: {str(e)}'}), 500 

    @app.route('/api/dev/validate-app', methods=['POST'])
    def validate_app_content():
        """
        Validate user app content against policies
        Expected payload: {
            "files": {
                "filename.html": "content...",
                "filename.js": "content...",
                ...
            },
            "app_id": "optional_app_id",
            "enforce_server_side_only": false  // optional, defaults to false
        }
        """
        try:
            data = request.get_json()
            if not data or 'files' not in data:
                return jsonify({'error': 'No files provided for validation'}), 400
            
            files = data.get('files', {})
            app_id = data.get('app_id', 'unknown')
            enforce_server_side_only = data.get('enforce_server_side_only', False)
            
            if not files:
                return jsonify({'error': 'Files object is empty'}), 400
            
            # Validate the app files
            validation_results = validate_user_app_files(files, enforce_server_side_only=enforce_server_side_only)
            
            return jsonify({
                'validation_results': validation_results,
                'app_id': app_id,
                'enforce_server_side_only': enforce_server_side_only,
                'timestamp': int(time.time() * 1000)
            })
            
        except Exception as e:
            eprint(f"Error validating app content: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Validation failed: {str(e)}'}), 500 
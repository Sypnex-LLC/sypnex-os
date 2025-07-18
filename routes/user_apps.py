"""
User app management routes for the Sypnex OS application
"""
from flask import request, jsonify
import tempfile
import os
import json
from app_utils import install_app_direct, sanitize_user_app_content

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
                    
                    # Refresh terminal manager to pick up new terminal apps
                    managers['terminal_manager'].refresh_user_apps()
                    
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
            print(f"Error installing app: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Installation failed: {str(e)}'}), 500

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
                # Refresh terminal manager to remove uninstalled terminal apps
                managers['terminal_manager'].refresh_user_apps()
                
                return jsonify({
                    'message': 'App uninstalled successfully',
                    'app_name': app_name
                })
            else:
                return jsonify({'error': 'Failed to uninstall app'}), 500
                
        except Exception as e:
            print(f"Error uninstalling app: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Uninstallation failed: {str(e)}'}), 500 
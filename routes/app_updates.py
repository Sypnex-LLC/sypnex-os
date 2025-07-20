"""
App updates routes for Sypnex OS application
"""
import requests
from flask import jsonify, request
from typing import Dict, Any, Optional


def register_app_updates_routes(app, managers):
    """Register app updates routes"""
    
    @app.route('/api/updates/latest', methods=['GET'])
    def get_latest_versions():
        """
        Get the latest app versions from GitHub releases
        Returns the versions.json content from the latest release
        """
        try:
            # Fetch latest release from GitHub API
            github_url = "https://api.github.com/repos/Sypnex-LLC/sypnex-os/releases/latest"
            
            response = requests.get(github_url, timeout=10)
            response.raise_for_status()
            
            release_data = response.json()
            
            # Find versions.json asset in the release
            versions_asset = None
            for asset in release_data.get('assets', []):
                if asset.get('name') == 'versions.json':
                    versions_asset = asset
                    break
            
            if not versions_asset:
                return jsonify({
                    'error': 'versions.json not found in latest release',
                    'success': False
                }), 404
            
            # Download versions.json content
            versions_url = versions_asset.get('browser_download_url')
            if not versions_url:
                return jsonify({
                    'error': 'Download URL not found for versions.json',
                    'success': False
                }), 404
            
            versions_response = requests.get(versions_url, timeout=10)
            versions_response.raise_for_status()
            
            versions_data = versions_response.json()
            
            return jsonify({
                'success': True,
                'versions': versions_data,
                'release_info': {
                    'tag_name': release_data.get('tag_name'),
                    'name': release_data.get('name'),
                    'published_at': release_data.get('published_at'),
                    'html_url': release_data.get('html_url')
                }
            })
            
        except requests.exceptions.RequestException as e:
            return jsonify({
                'error': f'Failed to fetch release data: {str(e)}',
                'success': False
            }), 500
        except Exception as e:
            return jsonify({
                'error': f'Unexpected error: {str(e)}',
                'success': False
            }), 500

    @app.route('/api/updates/check', methods=['GET'])
    def check_for_update():
        """
        Check if an app has an update available
        Query parameters:
        - app_id: The application ID (e.g., 'flow_editor')
        - version: Current version (e.g., '1.0.0')
        """
        app_id = request.args.get('app_id')
        current_version = request.args.get('version')
        
        if not app_id:
            return jsonify({
                'error': 'app_id parameter is required',
                'success': False
            }), 400
        
        if not current_version:
            return jsonify({
                'error': 'version parameter is required',
                'success': False
            }), 400
        
        try:
            # Get latest versions
            github_url = "https://api.github.com/repos/Sypnex-LLC/sypnex-os/releases/latest"
            
            response = requests.get(github_url, timeout=10)
            response.raise_for_status()
            
            release_data = response.json()
            
            # Find versions.json asset
            versions_asset = None
            for asset in release_data.get('assets', []):
                if asset.get('name') == 'versions.json':
                    versions_asset = asset
                    break
            
            if not versions_asset:
                return jsonify({
                    'error': 'versions.json not found in latest release',
                    'success': False
                }), 404
            
            # Download and parse versions.json
            versions_url = versions_asset.get('browser_download_url')
            versions_response = requests.get(versions_url, timeout=10)
            versions_response.raise_for_status()
            
            versions_data = versions_response.json()
            
            # Check if app exists in versions
            if app_id not in versions_data:
                return jsonify({
                    'error': f'App "{app_id}" not found in release',
                    'success': False
                }), 404
            
            latest_version = versions_data[app_id]
            
            # Find the app's download URL
            app_download_url = None
            for asset in release_data.get('assets', []):
                asset_name = asset.get('name', '')
                # Look for the app's binary file (assuming pattern: app_id_packaged.bin)
                if asset_name.startswith(f"{app_id}_packaged") and asset_name.endswith('.bin'):
                    app_download_url = asset.get('browser_download_url')
                    break
            
            # Compare versions
            update_available = current_version != latest_version
            
            result = {
                'success': True,
                'app_id': app_id,
                'current_version': current_version,
                'latest_version': latest_version,
                'update_available': update_available,
                'match': not update_available,
                'release_info': {
                    'tag_name': release_data.get('tag_name'),
                    'name': release_data.get('name'),
                    'published_at': release_data.get('published_at'),
                    'html_url': release_data.get('html_url')
                }
            }
            
            if app_download_url:
                result['download_url'] = app_download_url
            
            return jsonify(result)
            
        except requests.exceptions.RequestException as e:
            return jsonify({
                'error': f'Failed to fetch release data: {str(e)}',
                'success': False
            }), 500
        except Exception as e:
            return jsonify({
                'error': f'Unexpected error: {str(e)}',
                'success': False
            }), 500

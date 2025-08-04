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
        Returns comprehensive version and download information for all apps
        Caches the data to /system/cache/latest_versions.json in VFS
        """
        try:
            # Ensure /system/cache directories exist in VFS
            vfs_manager = managers['virtual_file_manager']
            
            # Check and create /system directory if it doesn't exist
            if not vfs_manager._path_exists('/system'):
                vfs_manager.create_directory('/system')
            
            # Check and create /system/cache directory if it doesn't exist  
            if not vfs_manager._path_exists('/system/cache'):
                vfs_manager.create_directory('/system/cache')
            
            # Fetch latest release from configured source (GitHub for open source, SaaS API for hosted instances)
            import os
            github_url = os.getenv('APPS_RELEASE_URL', "https://api.github.com/repos/Sypnex-LLC/sypnex-os-apps/releases/latest")
            
            # Setup headers for authentication (needed for private SaaS repos)
            headers = {}
            github_token = os.getenv('GITHUB_TOKEN')
            if github_token:
                headers['Authorization'] = f'token {github_token}'
            
            response = requests.get(github_url, headers=headers, timeout=10)
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
            
            versions_response = requests.get(versions_url, headers=headers, timeout=10)
            versions_response.raise_for_status()
            
            versions_data = versions_response.json()
            
            # Build comprehensive app information with download URLs
            app_details = {}
            for app_id, version in versions_data.items():
                app_info = {
                    'app_info': version,
                    'download_url': None,
                    'filename': None
                }
                
                # Find the app's download URL from release assets
                for asset in release_data.get('assets', []):
                    asset_name = asset.get('name', '')
                    # Look for the app's binary file (pattern: app_id_packaged.bin)
                    if asset_name.startswith(f"{app_id}_packaged") and asset_name.endswith('.bin'):
                        app_info['download_url'] = asset.get('browser_download_url')
                        app_info['filename'] = asset_name
                        break
                
                app_details[app_id] = app_info
            
            # Build the response data
            response_data = {
                'success': True,
                'apps': app_details,        # Comprehensive format with versions, download URLs, and filenames
                'release_info': {
                    'tag_name': release_data.get('tag_name'),
                    'name': release_data.get('name'),
                    'published_at': release_data.get('published_at'),
                    'html_url': release_data.get('html_url')
                }
            }
            
            # Cache the data to /system/cache/latest_versions.json in VFS
            import json
            cache_file_path = '/system/cache/latest_versions.json'
            cache_content = json.dumps(response_data, indent=2).encode('utf-8')
            
            # Delete existing cache file if it exists, then create new one
            if vfs_manager._path_exists(cache_file_path):
                vfs_manager.delete_path(cache_file_path)
            
            vfs_manager.create_file(cache_file_path, cache_content, 'application/json')
            
            return jsonify(response_data)
            
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

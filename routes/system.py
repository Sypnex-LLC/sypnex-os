"""
System routes for the Sypnex OS application
"""
from flask import request, jsonify
import requests
import base64
import os
import shutil
import time

def register_system_routes(app, managers):
    """Register system routes"""
    
    @app.route('/api/proxy/http', methods=['POST'])
    def http_proxy():
        """Proxy HTTP requests for user apps to bypass CORS restrictions"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No request data provided'}), 400
            
            url = data.get('url')
            method = data.get('method', 'GET')
            headers = data.get('headers', {})
            body = data.get('body')
            timeout = data.get('timeout', 30)
            
            if not url:
                return jsonify({'error': 'URL is required'}), 400
            
            # Make the request
            # Use json parameter for JSON requests, data for other content types
            if method.upper() == 'POST' and headers.get('Content-Type', '').lower() == 'application/json':
                response = requests.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=body,
                    timeout=timeout,
                    allow_redirects=True
                )
            else:
                response = requests.request(
                    method=method,
                    url=url,
                    headers=headers,
                    data=body,
                    timeout=timeout,
                    allow_redirects=True
                )
            
            # Check if response is binary
            content_type = response.headers.get('content-type', '').lower()
            is_binary = any(binary_type in content_type for binary_type in ['audio/', 'image/', 'application/octet-stream', 'video/'])
            
            if is_binary:
                # For binary data, return base64 encoded content
                content = base64.b64encode(response.content).decode('utf-8')
            else:
                # For text data, return as text
                content = response.text
            
            # Return response data
            return jsonify({
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'content': content,
                'is_binary': is_binary,
                'url': response.url
            })
            
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Request failed: {str(e)}'}), 500
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500

    @app.route('/api/system/reset', methods=['POST'])
    def reset_system():
        """Reset the system to default state by replacing databases with templates"""
        import sqlite3
        import gc
        
        print("🔄 Starting system reset...")
        
        # Step 1: Try to force close any SQLite connections
        try:
            print("  - Force closing SQLite connections...")
            # Force garbage collection to close any lingering connections
            gc.collect()
            
            # Try to explicitly close VFS manager if it exists
            try:
                from virtual_file_manager import virtual_file_manager_instance
                if virtual_file_manager_instance is not None:
                    print("    - Detected active VFS manager instance")
                    # Force cleanup of the global instance
                    virtual_file_manager_instance = None
                    gc.collect()
                    print("    ✅ VFS manager instance cleared")
            except Exception as e:
                print(f"    Warning: Could not clear VFS instance: {e}")
            
            # Try to connect and immediately close to flush any WAL files
            for db_file in ['data/user_preferences.db', 'data/virtual_files.db']:
                if os.path.exists(db_file):
                    try:
                        print(f"    - Checkpointing {db_file}...")
                        conn = sqlite3.connect(db_file)
                        conn.execute('PRAGMA wal_checkpoint(FULL);')
                        conn.execute('PRAGMA wal_checkpoint(TRUNCATE);')  # More aggressive cleanup
                        conn.close()
                        print(f"    ✅ {db_file} checkpointed")
                    except Exception as e:
                        print(f"    Warning: Could not checkpoint {db_file}: {e}")
            
            print("  ✅ SQLite connection cleanup attempted")
        except Exception as e:
            print(f"  Warning: SQLite cleanup failed: {e}")
        
        # Step 2: Try using copy-over strategy instead of rename
        max_retries = 3
        retry_delay = 0.5  # 500ms between retries
        
        for attempt in range(max_retries):
            try:
                print(f"🔄 Reset attempt {attempt + 1}/{max_retries}")
                
                # Copy templates directly over existing files (overwrite strategy)
                success = True
                
                if os.path.exists('defaults/databases/user_preferences.template'):
                    print("  - Overwriting user_preferences.db with template...")
                    shutil.copy2('defaults/databases/user_preferences.template', 'data/user_preferences.db')
                    print("  ✅ user_preferences.db overwritten")
                else:
                    print("  ❌ user_preferences.template not found")
                    success = False
                    
                if os.path.exists('defaults/databases/virtual_files.template'):
                    print("  - Overwriting virtual_files.db with template...")
                    shutil.copy2('defaults/databases/virtual_files.template', 'data/virtual_files.db')
                    print("  ✅ virtual_files.db overwritten")
                else:
                    print("  ❌ virtual_files.template not found")
                    success = False
                
                if success:
                    print("🎉 System reset successful!")
                    return jsonify({
                        'success': True, 
                        'message': 'System reset complete - databases restored to default state'
                    })
                else:
                    raise Exception("Template files not found")
                    
            except (OSError, IOError, PermissionError) as e:
                print(f"❌ Reset attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    print(f"   Retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
                else:
                    print(f"💥 All {max_retries} attempts failed!")
                    return jsonify({
                        'success': False, 
                        'error': f'Reset failed after {max_retries} attempts: {str(e)}'
                    }), 500
            except Exception as e:
                print(f"❌ Unexpected error during reset: {e}")
                return jsonify({
                    'success': False, 
                    'error': f'Unexpected error during reset: {str(e)}'
                }), 500

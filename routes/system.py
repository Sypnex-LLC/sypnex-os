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
        """Reset the system to default state by deleting databases and triggering first boot seeding"""
        import sqlite3
        import gc
        
        print("🔄 Starting system reset...")
        
        # Step 1: Force close any SQLite connections
        try:
            print("  - Force closing SQLite connections...")
            # Force garbage collection to close any lingering connections
            gc.collect()
            
            # Try to explicitly close VFS manager if it exists
            try:
                from core.virtual_file_manager import virtual_file_manager_instance
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
        
        # Step 2: Create fresh seeded databases and copy them over (no deletion needed)
        max_retries = 3
        retry_delay = 0.5  # 500ms between retries
        
        for attempt in range(max_retries):
            try:
                print(f"🔄 Reset attempt {attempt + 1}/{max_retries}")
                
                # Create temporary database files with seeded data
                temp_db_files = {
                    'data/user_preferences.db': 'temp_prefs.db',
                    'data/virtual_files.db': 'temp_vfs.db'
                }
                
                print("  - Creating temporary seeded databases...")
                
                # Remove temp files if they exist
                for temp_db in temp_db_files.values():
                    if os.path.exists(temp_db):
                        os.remove(temp_db)
                
                # Initialize temporary managers to create fresh databases
                from utils.user_preferences import UserPreferences
                from core.virtual_file_manager import VirtualFileManager
                from core.logs_manager import LogsManager
                from core.websocket_manager import WebSocketManager
                from core.system_boot_manager import SystemBootManager
                
                # Create temp instances with temp database files
                temp_vfs = VirtualFileManager(db_path='temp_vfs.db')
                temp_logs = LogsManager(temp_vfs)
                temp_prefs = UserPreferences(temp_logs, db_path='temp_prefs.db')
                temp_boot = SystemBootManager(db_path='temp_prefs.db')  # Uses same DB as preferences
                temp_websocket = WebSocketManager(temp_logs)
                
                temp_managers = {
                    'virtual_file_manager': temp_vfs,
                    'user_preferences': temp_prefs,
                    'logs_manager': temp_logs,
                    'websocket_manager': temp_websocket,
                    'system_boot_manager': temp_boot
                }
                
                # Ensure all database tables are created by calling initialization methods
                print("  - Initializing database schemas...")
                temp_boot.initialize_system()  # This creates the system_boot table
                # The other managers create tables automatically in their constructors
                
                # Seed the temporary databases
                print("  - Seeding temporary databases...")
                from config.app_config import seed_first_boot
                seed_first_boot(temp_managers)
                
                # Close temp database connections
                del temp_vfs, temp_prefs, temp_logs, temp_websocket, temp_boot
                import gc
                gc.collect()
                
                # Copy temp databases over existing ones (this is the key - no deletion!)
                print("  - Copying seeded databases over existing ones...")
                copied_files = []
                for target_db, temp_db in temp_db_files.items():
                    if os.path.exists(temp_db):
                        # Clean up any old WAL files before copying
                        for ext in ['-wal', '-shm']:
                            old_wal = target_db + ext
                            if os.path.exists(old_wal):
                                try:
                                    os.remove(old_wal)
                                    print(f"    - Cleaned up {old_wal}")
                                except Exception as e:
                                    print(f"    Warning: Could not remove {old_wal}: {e}")
                        
                        shutil.copy2(temp_db, target_db)
                        os.remove(temp_db)  # Clean up temp file
                        copied_files.append(target_db)
                        print(f"    ✅ {target_db} overwritten with seeded data")
                
                if copied_files:
                    print("🎉 System reset and re-seeding complete!")
                    return jsonify({
                        'success': True, 
                        'message': 'System reset complete - databases overwritten with fresh seeded data'
                    })
                else:
                    raise Exception("No temporary databases were created")
                    
            except (OSError, IOError, PermissionError) as e:
                print(f"❌ Reset attempt {attempt + 1} failed: {e}")
                
                # Clean up temp files on error
                for temp_db in ['temp_prefs.db', 'temp_vfs.db']:
                    if os.path.exists(temp_db):
                        try:
                            os.remove(temp_db)
                        except:
                            pass
                
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
                
                # Clean up temp files on error
                for temp_db in ['temp_prefs.db', 'temp_vfs.db']:
                    if os.path.exists(temp_db):
                        try:
                            os.remove(temp_db)
                        except:
                            pass
                
                return jsonify({
                    'success': False, 
                    'error': f'Unexpected error during reset: {str(e)}'
                }), 500

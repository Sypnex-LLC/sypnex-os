import os
import json
import re
from pathlib import Path

class UserAppManager:
    def __init__(self, logs_manager=None, user_apps_dir="user_apps"):
        self.logs_manager = logs_manager
        self.user_apps_dir = user_apps_dir
        self.user_apps = {}
        self.discover_user_apps()
    
    def pack_app(self, app_id, app_path):
        """Pack a development app into a single HTML file if src/ exists. Straight merge: index.html, <style>...</style>, <script>...</script>."""
        src_dir = os.path.join(app_path, 'src')
        if not os.path.exists(src_dir):
            return None
        html_file = os.path.join(app_path, f"{app_id}.html")
        # Only repack if any src file is newer than the packed file
        if os.path.exists(html_file):
            html_mtime = os.path.getmtime(html_file)
            src_files = [os.path.getmtime(os.path.join(src_dir, f)) for f in os.listdir(src_dir) if f.endswith(('.html', '.css', '.js'))]
            if src_files and html_mtime > max(src_files):
                return html_file
        # Read source files
        index_html_path = os.path.join(src_dir, 'index.html')
        styles_css_path = os.path.join(src_dir, 'style.css')
        script_js_path = os.path.join(src_dir, 'script.js')
        if not os.path.exists(index_html_path):
            print(f"Warning: No index.html found in src/ for {app_id}")
            return None
        merged = ''
        with open(index_html_path, 'r', encoding='utf-8') as f:
            merged += f.read()
        if os.path.exists(styles_css_path):
            with open(styles_css_path, 'r', encoding='utf-8') as f:
                css = f.read()
            merged += f'\n<style>{css}</style>'
        if os.path.exists(script_js_path):
            with open(script_js_path, 'r', encoding='utf-8') as f:
                js = f.read()
            merged += f'\n<script>{js}</script>'
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(merged)
        print(f"Packed {app_id} successfully!")
        return html_file

    def discover_user_apps(self):
        """Discover all user apps from VFS only (local discovery disabled)"""
        self.user_apps = {}
        
        print("🔍 Discovering user apps...")
        
        # Source: VFS installed apps only (local discovery disabled)
        self._discover_from_vfs()
        print(f"📱 Found {len(self.user_apps)} user apps")
    
    def _discover_from_vfs(self):
        """Discover apps stored in VFS"""
        try:
            from core.virtual_file_manager import get_virtual_file_manager
            vfs = get_virtual_file_manager()
        except ImportError as e:
            print(f"⚠️  VFS manager not available: {e}")
            return
        
        installed_vfs_path = "/apps/installed"
        
        # Check if VFS apps directory exists
        if not vfs._path_exists(installed_vfs_path):
            print(f"📁 VFS apps directory '{installed_vfs_path}' not found")
            return
        
        print(f"📁 Scanning VFS directory: {installed_vfs_path}")
        
        # List installed apps directory
        items = vfs.list_directory(installed_vfs_path)
        
        for item in items:
            if not item['is_directory']:
                continue
                
            app_id = item['name']
            app_vfs_path = f"{installed_vfs_path}/{app_id}"
            
            # Look for .app metadata file
            metadata_file = f"{app_vfs_path}/{app_id}.app"
            metadata_data = vfs.read_file(metadata_file)
            
            if not metadata_data:
                print(f"⚠️  Warning: No metadata file found for VFS app {app_id}")
                continue
                
            try:
                # Parse metadata (VFS apps use direct metadata format)
                metadata = json.loads(metadata_data['content'].decode('utf-8'))
                
                # Validate required fields
                required_fields = ['id', 'name', 'description', 'icon']
                for field in required_fields:
                    if field not in metadata:
                        print(f"⚠️  Warning: Missing required field '{field}' in VFS app {app_id}")
                        continue
                
                # Add source information
                metadata['source'] = 'vfs'
                metadata['vfs_path'] = app_vfs_path
                
                # User app - read packed HTML from VFS
                html_file = f"{app_vfs_path}/{app_id}.html"
                html_data = vfs.read_file(html_file)
                
                if html_data:
                    metadata['template'] = f"vfs://{app_vfs_path}/{app_id}.html"
                    metadata['type'] = 'user_app'
                    metadata['html_content'] = html_data['content'].decode('utf-8')
                    metadata['is_packed'] = True
                    metadata['source'] = 'vfs'
                    self.user_apps[app_id] = metadata
                    print(f"📱 Loaded VFS user app: {metadata['name']} ({app_id})")
                else:
                    print(f"⚠️  Warning: No HTML file found for VFS app {app_id}")
                        
            except Exception as e:
                print(f"❌ Error loading VFS app {app_id}: {e}")
    
    def get_user_apps(self):
        """Get all discovered user apps"""
        return self.user_apps
    
    def get_all_apps(self):
        """Get all user apps"""
        return list(self.user_apps.values())
    
    def get_user_app(self, app_id):
        """Get a specific user app by ID with fresh HTML content and template processing"""
        if app_id not in self.user_apps:
            return None
        
        app_data = self.user_apps[app_id].copy()
        
        # Handle different sources
        if app_data.get('source') == 'vfs':
            # VFS app - HTML content is already loaded in memory
            html_content = app_data.get('html_content', '')
            
            # Process template placeholders if settings exist
            if 'settings' in app_data:
                html_content = self._process_template_placeholders(html_content, app_data['settings'], app_id)
            
            app_data['html_content'] = html_content
            
        else:
            # Local app - load fresh HTML content from disk
            try:
                with open(app_data['html_file_path'], 'r', encoding='utf-8') as f:
                    html_content = f.read()
                
                # Process template placeholders if settings exist
                if 'settings' in app_data:
                    html_content = self._process_template_placeholders(html_content, app_data['settings'], app_id)
                
                app_data['html_content'] = html_content
                
            except Exception as e:
                print(f"Error loading HTML content for {app_id}: {e}")
                app_data['html_content'] = f"<div class='error'>Error loading app content: {e}</div>"
        
        return app_data
    
    def _process_template_placeholders(self, html_content, settings, app_id):
        """Replace {{SETTING_KEY}} placeholders with actual setting values from SQLite or .app defaults"""
        import re
        
        # Import user_preferences here to avoid circular imports
        from utils.user_preferences import UserPreferences
        user_prefs = UserPreferences()
        
        # Create a mapping of setting keys to values
        setting_map = {}
        for setting in settings:
            key = setting.get('key', '')
            default_value = setting.get('value', '')
            should_encrypt = setting.get('encrypt', False)
            
            if key:
                # Get the actual value from SQLite, fall back to default from .app file
                actual_value = user_prefs.get_app_setting(app_id, key, default_value)
                
                # If this setting should be encrypted and we got a value, try to decrypt it
                if should_encrypt and actual_value and isinstance(actual_value, str):
                    try:
                        decrypted_value = user_prefs._decrypt_value(actual_value)
                        setting_map[key] = decrypted_value
                        print(f"Template: Decrypted {key} for display")
                    except Exception as e:
                        print(f"Template: Failed to decrypt {key}, using as-is: {e}")
                        setting_map[key] = actual_value
                else:
                    setting_map[key] = actual_value
        
        # Replace all {{KEY}} placeholders with their values
        def replace_placeholder(match):
            key = match.group(1).strip()
            return setting_map.get(key, f"{{{{{key}}}}}")  # Return original if not found
        
        # Use regex to find and replace {{KEY}} patterns
        processed_content = re.sub(r'\{\{([^}]+)\}\}', replace_placeholder, html_content)
        
        return processed_content
    
    def get_user_apps_for_search(self):
        """Get user apps formatted for search results"""
        results = []
        for app_id, app_data in self.user_apps.items():
            results.append({
                'id': app_id,
                'name': app_data['name'],
                'icon': app_data['icon'],
                'description': app_data['description'],
                'type': 'user_app',
                'source': app_data.get('source', 'unknown'),
                'author': app_data.get('author', 'Unknown'),
                'version': app_data.get('version', '1.0.0')
            })
        return results
    
    def search_user_apps(self, query):
        """Search user apps by name, description, or keywords"""
        query = query.lower()
        results = []
        
        for app_id, app_data in self.user_apps.items():
            # Search in name, description, and keywords
            searchable_text = [
                app_data['name'].lower(),
                app_data['description'].lower()
            ]
            
            # Add keywords if they exist
            if 'keywords' in app_data:
                searchable_text.extend([kw.lower() for kw in app_data['keywords']])
            
            # Check if query matches any searchable text
            if any(query in text for text in searchable_text):
                results.append({
                    'id': app_id,
                    'name': app_data['name'],
                    'icon': app_data['icon'],
                    'description': app_data['description'],
                    'type': 'user_app'
                })
        
        return results
    
    def refresh_user_apps(self):
        """Refresh the user apps discovery"""
        self.discover_user_apps()
        return {
            'user_apps': len(self.user_apps),
            'total': len(self.user_apps)
        } 
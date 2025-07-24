"""
Utility functions for the Sypnex OS application
"""
import json
import base64
import tempfile
import subprocess
import sys
import os
import re
from datetime import datetime
import time
import re
from bs4 import BeautifulSoup, Tag
import logging
import cssutils

def install_app_direct(package_file, virtual_file_manager):
    """Install a packaged app directly into VFS (replaces script dependency)"""
    try:
        # Load package data
        with open(package_file, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
        
        # Validate package structure
        if 'app_metadata' not in package_data or 'files' not in package_data:
            print("❌ Error: Invalid package format - missing required fields")
            return False
        
        app_metadata = package_data['app_metadata']
        files = package_data['files']
        
        app_id = app_metadata.get('id')
        app_name = app_metadata.get('name', app_id)
        app_type = app_metadata.get('type', 'user_app')
        
        if not app_id:
            print("❌ Error: Invalid package - missing app ID")
            return False
        
        print(f"📦 Installing app: {app_name}")
        print(f"🆔 App ID: {app_id}")
        print(f"📋 Type: {app_type}")
        
        # Ensure VFS apps directory exists
        apps_vfs_path = "/apps"
        installed_vfs_path = "/apps/installed"
        
        # Check if /apps directory exists, create if not
        if not virtual_file_manager._path_exists(apps_vfs_path):
            print(f"📁 Creating VFS directory: {apps_vfs_path}")
            success = virtual_file_manager.create_directory(apps_vfs_path)
            if not success:
                print(f"❌ Error: Failed to create VFS directory {apps_vfs_path}")
                return False
        
        # Check if /apps/installed directory exists, create if not
        if not virtual_file_manager._path_exists(installed_vfs_path):
            print(f"📁 Creating VFS directory: {installed_vfs_path}")
            success = virtual_file_manager.create_directory(installed_vfs_path)
            if not success:
                print(f"❌ Error: Failed to create VFS directory {installed_vfs_path}")
                return False
        
        # Check if app already exists in VFS (always overwrite for API)
        app_vfs_path = f"{installed_vfs_path}/{app_id}"
        app_exists = virtual_file_manager._path_exists(app_vfs_path)
        
        if app_exists:
            print(f"🔄 App '{app_id}' already exists in VFS - overwriting")
            # Delete existing app directory
            print(f"🗑️  Removing existing app: {app_id}")
            success = virtual_file_manager.delete_path(app_vfs_path)
            if not success:
                print(f"❌ Error: Failed to remove existing app")
                return False
        
        # Create app directory in VFS
        print(f"📁 Creating app directory: {app_vfs_path}")
        success = virtual_file_manager.create_directory(app_vfs_path)
        if not success:
            print(f"❌ Error: Failed to create app directory {app_vfs_path}")
            return False
        
        # Install files
        print(f"📥 Installing app files...")
        installed_files = []
        
        for filename, base64_content in files.items():
            if not base64_content:
                print(f"⚠️  Warning: Empty file {filename}, skipping")
                continue
            
            try:
                # Decode base64 content
                content = base64.b64decode(base64_content)
                
                # Create file in VFS
                file_vfs_path = f"{app_vfs_path}/{filename}"
                success = virtual_file_manager.create_file(file_vfs_path, content)
                
                if success:
                    installed_files.append(filename)
                    print(f"✅ Installed: {filename} ({len(content)} bytes)")
                else:
                    print(f"❌ Error: Failed to install {filename}")
                    return False
                    
            except Exception as e:
                print(f"❌ Error installing {filename}: {e}")
                return False
        
        # Verify installation
        print(f"🔍 Verifying installation...")
        
        # Check if .app file was installed
        app_metadata_file = f"{app_vfs_path}/{app_id}.app"
        if not virtual_file_manager._path_exists(app_metadata_file):
            print(f"❌ Error: App metadata file not found after installation")
            return False
        
        # Check if main app file was installed (user apps only)
        html_file = f"{app_vfs_path}/{app_id}.html"
        if not virtual_file_manager._path_exists(html_file):
            print(f"❌ Error: HTML file not found after installation")
            return False
        
        # Success!
        print(f"\n🎉 Successfully installed '{app_name}'!")
        print(f"📦 Package: {package_file}")
        print(f"📁 VFS Location: {app_vfs_path}")
        print(f"📋 Files installed: {len(installed_files)}")
        
        # Handle additional files (VFS files)
        additional_files = package_data.get('additional_files', [])
        if additional_files:
            print(f"\n📁 Installing {len(additional_files)} additional VFS files...")
            
            for additional_file in additional_files:
                vfs_path = additional_file.get('vfs_path')
                filename = additional_file.get('filename')
                data = additional_file.get('data')
                
                if not vfs_path or not data:
                    print(f"⚠️  Warning: Invalid additional file entry: {additional_file}")
                    continue
                
                try:
                    # Ensure the directory exists for the VFS path
                    vfs_dir = os.path.dirname(vfs_path)
                    if vfs_dir and vfs_dir != '/':
                        if not virtual_file_manager._path_exists(vfs_dir):
                            print(f"📁 Creating VFS directory: {vfs_dir}")
                            success = virtual_file_manager.create_directory(vfs_dir)
                            if not success:
                                print(f"❌ Error: Failed to create VFS directory {vfs_dir}")
                                continue
                    
                    # Decode base64 content
                    content = base64.b64decode(data)
                    
                    # Check if file already exists, delete it first
                    if virtual_file_manager._path_exists(vfs_path):
                        print(f"🔄 Overwriting existing VFS file: {vfs_path}")
                        virtual_file_manager.delete_path(vfs_path)
                    
                    # Create file in VFS
                    success = virtual_file_manager.create_file(vfs_path, content)
                    
                    if success:
                        size_kb = len(content) / 1024
                        print(f"✅ Installed VFS file: {vfs_path} ({size_kb:.1f} KB)")
                    else:
                        print(f"❌ Error: Failed to install VFS file {vfs_path}")
                        # Don't return False here - continue with other files
                        
                except Exception as e:
                    print(f"❌ Error installing VFS file {vfs_path}: {e}")
                    # Don't return False here - continue with other files
                    continue
            
            print(f"📁 Additional VFS files installation completed")
        
        return True
        
    except Exception as e:
        print(f"❌ Error installing app: {e}")
        import traceback
        traceback.print_exc()
        return False

def sanitize_user_app_content(html_content, app_id):
    """Sanitize user app HTML content to remove dangerous API calls"""
    
    # List of dangerous endpoints that user apps shouldn't access
    dangerous_endpoints = [
        '/api/virtual-files/delete/',  # Delete files
        '/api/preferences/reset',      # Reset all preferences
        '/api/services/start/',        # Start services
        '/api/services/stop/',         # Stop services
    ]
    
    # Check if the HTML content contains any dangerous endpoints
    content_lower = html_content.lower()
    found_dangerous = []
        # Replace the entire content with a security warning using app-container styles
    warning_html = f"""
    <div class="app-container">
        <div class="app-header">
            <h2><i class="fas fa-shield-alt"></i> Access Denied</h2>
            <p>This user app has been blocked for security reasons</p>
        </div>
        <div class="app-content">
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; color: #dc3545; margin-bottom: 20px;">
                    <i class="fas fa-ban"></i>
                </div>
                <h3 style="color: #dc3545; margin-bottom: 15px;">Security Restriction</h3>
                <p style="color: #6c757d; font-size: 16px; margin-bottom: 20px;">
                    This user app attempted to access restricted system endpoints.
                </p>
                <div style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #6c757d; font-size: 14px; margin: 0;">
                        <strong>App ID:</strong> {app_id}<br>
                        <strong>Blocked endpoints:</strong> {', '.join(found_dangerous)}
                    </p>
                </div>
                <p style="color: #6c757d; font-size: 14px;">
                    User apps are not allowed to access system management endpoints for security reasons.
                </p>
            </div>
        </div>
    </div>
    """
    
    for dangerous in dangerous_endpoints:
        if dangerous in content_lower:
            found_dangerous.append(dangerous)
    
    if found_dangerous:
        print(f"SECURITY: Blocked user app '{app_id}' for accessing dangerous endpoints: {found_dangerous}")
        return warning_html
    
    # Update HTML class attributes
    #print(html_content)
    html_content = scope_app_styles(html_content, app_id)
    if not html_content:
        return warning_html #temp need to update this to return better message
    
    return html_content

def load_user_requirements(virtual_file_manager):
    """Auto-load user packages on startup"""
    try:
        user_req = virtual_file_manager.read_file("/user_requirements.txt")
        
        if user_req:
            # Create temporary requirements file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(user_req['content'].decode('utf-8'))
                temp_file = f.name
            
            try:
                result = subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', '-r', temp_file],
                    capture_output=True,
                    text=True,
                    check=False
                )
                
                if result.returncode == 0:
                    print("✅ Loaded user requirements on startup")
                else:
                    print(f"⚠️ Warning: Could not load user requirements: {result.stderr}")
                    
            finally:
                # Clean up temp file
                os.unlink(temp_file)
        else:
            print("ℹ️ No user requirements found on startup")
            
    except Exception as e:
        print(f"⚠️ Could not load user requirements: {e}")

def get_system_uptime():
    """Get system uptime in seconds since midnight"""
    return int(time.time()) % 86400

def get_current_time_info():
    """Get current time, date, and day information"""
    now = datetime.now()
    return {
        'time': now.strftime('%H:%M'),
        'date': now.strftime('%B %d, %Y'),
        'day': now.strftime('%A'),
        'timestamp': int(time.time() * 1000)  # Current timestamp in milliseconds
    }



def scope_system_app_css(css_content: str, app_id: str) -> str:
    """Scope system app CSS using data-appid attribute (CSS-only version)"""
    if not css_content or not app_id:
        return css_content

    try:
        # Parse the CSS content
        sheet = cssutils.parseString(css_content, validate=False)
        
        prefix = f'[data-appid="{app_id}"]'
        keyframes_map = {}

        # First pass: handle keyframes
        for rule in list(sheet.cssRules):
            # KEYFRAMES_RULE is type 7
            if rule.type == 7:
                original_name = rule.name
                new_name = f"{app_id}-{original_name}"
                keyframes_map[original_name] = new_name
                rule.name = new_name

        # Second pass: prefix selectors and update animation properties
        for rule in list(sheet.cssRules):
            # STYLE_RULE is type 1
            if rule.type == 1:
                # Skip if already scoped to avoid double-scoping
                if f'[data-appid="{app_id}"]' in rule.selectorText:
                    continue
                    
                # Rewrite selectors to be scoped under the appid attribute
                selectors = rule.selectorText.split(',')
                scoped_selectors = []
                for s in selectors:
                    s_stripped = s.strip()
                    if not s_stripped:
                        continue
                    
                    # Handle special 'root' selectors by targeting the container
                    if s_stripped.lower() in ['html', 'body', ':root']:
                        scoped_selectors.append(prefix)
                    else:
                        # Prepend the prefix to all other selectors
                        scoped_selectors.append(f"{prefix} {s_stripped}")
                rule.selectorText = ', '.join(scoped_selectors)

                # If we renamed any keyframes, update animation/animation-name properties
                if keyframes_map and rule.style.animationName:
                    for old_name, new_name in keyframes_map.items():
                        # Replace animation names in the style declaration
                        current_animation_names = rule.style.animationName.split(',')
                        new_animation_names = [
                            new_name if name.strip() == old_name else name
                            for name in current_animation_names
                        ]
                        rule.style.animationName = ', '.join(new_animation_names)
        
        # Return the scoped CSS
        return sheet.cssText.decode('utf-8') if sheet.cssText else css_content

    except Exception as e:
        logging.error(f"Failed to scope CSS for app {app_id}: {e}", exc_info=True)
        # Return original CSS if scoping fails
        return css_content


def scope_app_styles(payload: str, appid: str) -> str:
    if not payload or not appid:
        return payload

    try:
        soup = BeautifulSoup(payload, 'lxml')

        all_rewritten_css = []
        
        # 1. Find, rewrite, and consolidate all CSS from <style> tags
        for style_tag in soup.find_all('style'):
            css_text = style_tag.string or ''
            if not css_text.strip():
                continue

            # We will modify the sheet in-place, which is efficient.
            sheet = cssutils.parseString(css_text, validate=False)
            
            prefix = f'[data-appid="{appid}"]'
            keyframes_map = {}

            # We iterate over a copy of the rules in case modification affects the list
            for rule in list(sheet.cssRules):
                # Using integer rule types for cross-version compatibility with cssutils.
                # KEYFRAMES_RULE is type 7.
                if rule.type == 7:
                    original_name = rule.name
                    new_name = f"{appid}-{original_name}"
                    keyframes_map[original_name] = new_name
                    rule.name = new_name

            # Second pass: prefix selectors and update animation properties
            for rule in list(sheet.cssRules):
                # STYLE_RULE is type 1.
                if rule.type == 1:
                    # Rewrite selectors to be scoped under the appid attribute
                    selectors = rule.selectorText.split(',')
                    scoped_selectors = []
                    for s in selectors:
                        s_stripped = s.strip()
                        if not s_stripped:
                            continue
                        
                        # Handle special 'root' selectors by targeting the container
                        if s_stripped.lower() in ['html', 'body', ':root']:
                            scoped_selectors.append(prefix)
                        else:
                            # Prepend the prefix to all other selectors
                            scoped_selectors.append(f"{prefix} {s_stripped}")
                    rule.selectorText = ', '.join(scoped_selectors)

                    # If we renamed any keyframes, update animation/animation-name properties
                    if keyframes_map and rule.style.animationName:
                        for old_name, new_name in keyframes_map.items():
                            # Replace animation names in the style declaration
                            current_animation_names = rule.style.animationName.split(',')
                            new_animation_names = [
                                new_name if name.strip() == old_name else name
                                for name in current_animation_names
                            ]
                            rule.style.animationName = ', '.join(new_animation_names)
            
            # Serialize the entire modified sheet back to text
            rewritten_css = sheet.cssText.decode('utf-8') if sheet.cssText else ""
            if rewritten_css:
                all_rewritten_css.append(rewritten_css)
            
            # Remove the original <style> tag now that we've processed it
            style_tag.decompose()

        # 2. Add the scoping attribute to the app's root HTML element(s)
        # Since the payload is a fragment, BeautifulSoup wraps it in <html><body>.
        # We find the actual root elements inside the body.
        if soup.body:
            root_elements = [tag for tag in soup.body.children if isinstance(tag, Tag) and tag.name not in ['style', 'script']]
            
            if len(root_elements) == 1:
                # If there's a single root container, tag it
                root_elements[0]['data-appid'] = appid
            elif len(root_elements) > 1:
                # If there are multiple root elements, wrap them in a new div
                wrapper = soup.new_tag('div', attrs={'data-appid': appid})
                for element in root_elements:
                    wrapper.append(element.extract())
                soup.body.insert(0, wrapper)
        
        # 3. Add a single new <style> tag with all the rewritten CSS
        if all_rewritten_css:
            final_css = "\n\n".join(all_rewritten_css)
            new_style_tag = soup.new_tag('style', type='text/css')
            new_style_tag.string = final_css
            
            # Prepend the new style to the body, as it's a fragment
            soup.body.insert(0, new_style_tag)

        #raise Exception("test")
        # 4. Return the processed HTML fragment
        # We join the contents of the body to avoid returning the auto-added <html><body> tags.
        return ''.join(str(c) for c in soup.body.contents)

    except Exception as e:
        logging.error(f"Failed to process app styles for appid {appid}: {e}", exc_info=True)
        # In case of any unexpected error, return the original payload to prevent crashes.
        return ""
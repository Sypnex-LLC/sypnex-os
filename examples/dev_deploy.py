#!/usr/bin/env python3
"""
Dev Deploy Script - Quick pack and install for development (API-only for install)
Usage: python dev_deploy.py <app_name> [options]
"""

import os
import sys
import json
import requests
import time
import base64
from datetime import datetime

def pack_app_local(app_name, source_dir="user_apps_dev"):
    """Pack an app locally (no API needed)"""
    
    print(f"📦 Packing app: {app_name}")
    print(f"📁 Source: {source_dir}")
    
    # Define paths
    app_dir = os.path.join(source_dir, app_name)
    app_file = os.path.join(app_dir, f"{app_name}.app")
    src_dir = os.path.join(app_dir, 'src')
    
    # Check if app exists
    if not os.path.exists(app_dir):
        print(f"❌ Error: App '{app_name}' not found at {app_dir}")
        return None
    
    if not os.path.exists(app_file):
        print(f"❌ Error: App metadata file '{app_name}.app' not found")
        return None
    
    try:
        # Load the original .app metadata file
        with open(app_file, 'r', encoding='utf-8') as f:
            app_metadata = json.load(f)
        
        # Prepare package
        package = {
            'app_metadata': app_metadata,
            'files': {},
            'package_info': {
                'format_version': '1.0',
                'created_at': datetime.now().isoformat(),
                'packaged_by': 'Sypnex OS Dev Deployer',
                'source_directory': app_dir
            }
        }
        
        # Add the original .app file (base64 encoded)
        with open(app_file, 'rb') as f:
            package['files'][f"{app_name}.app"] = base64.b64encode(f.read()).decode('utf-8')
        
        # Handle additional files (VFS files)
        additional_files = app_metadata.get('additional_files', [])
        if additional_files:
            print(f"📁 Processing {len(additional_files)} additional files...")
            package['additional_files'] = []
            
            for additional_file in additional_files:
                vfs_path = additional_file.get('vfs_path')
                source_file = additional_file.get('source_file')
                
                if not vfs_path or not source_file:
                    print(f"⚠️  Warning: Invalid additional file entry: {additional_file}")
                    continue
                
                # Build full path to source file (relative to app's src directory)
                source_path = os.path.join(src_dir, source_file)
                
                if not os.path.exists(source_path):
                    print(f"❌ Error: Additional file not found: {source_path}")
                    continue
                
                try:
                    # Read and encode the additional file
                    with open(source_path, 'rb') as f:
                        file_content = f.read()
                    
                    # Add to package
                    package['additional_files'].append({
                        'vfs_path': vfs_path,
                        'filename': os.path.basename(vfs_path),
                        'data': base64.b64encode(file_content).decode('utf-8'),
                        'size': len(file_content)
                    })
                    
                    print(f"✅ Added additional file: {source_file} → {vfs_path}")
                    
                except Exception as e:
                    print(f"❌ Error processing additional file {source_file}: {e}")
                    continue
        
        # Add app files based on type
        if app_metadata.get('type') == 'terminal_app':
            # Terminal app - add Python file
            python_file = os.path.join(app_dir, f"{app_name}.py")
            if os.path.exists(python_file):
                with open(python_file, 'rb') as f:
                    package['files'][f"{app_name}.py"] = base64.b64encode(f.read()).decode('utf-8')
        else:
            # User app - merge source files or use existing HTML
            html_file = os.path.join(app_dir, f"{app_name}.html")
            
            # Check if we have a src/ directory to merge
            if os.path.exists(src_dir):
                print(f"📁 Found src/ directory, merging files...")
                
                # Read app metadata to get script and style order
                script_order = ['script.js']  # Default fallback
                style_order = ['style.css']   # Default fallback
                
                if os.path.exists(app_file):
                    try:
                        with open(app_file, 'r', encoding='utf-8') as f:
                            app_metadata = json.load(f)
                        script_order = app_metadata.get('scripts', ['script.js'])
                        style_order = app_metadata.get('styles', ['style.css'])
                        print(f"📋 Script order from .app file: {script_order}")
                        print(f"📋 Style order from .app file: {style_order}")
                    except Exception as e:
                        print(f"⚠️  Warning: Could not read .app file for script/style order: {e}")
                        print(f"   Using default script order: {script_order}")
                        print(f"   Using default style order: {style_order}")
                
                # Read source files
                index_html_path = os.path.join(src_dir, 'index.html')
                
                if not os.path.exists(index_html_path):
                    print(f"❌ Error: No index.html found in src/ for {app_name}")
                    return None
                
                # Start with index.html content
                merged = ''
                with open(index_html_path, 'r', encoding='utf-8') as f:
                    merged += f.read()
                
                # Pack styles in order
                all_styles = []
                missing_styles = []
                
                for style_file in style_order:
                    style_path = os.path.join(src_dir, style_file)
                    if os.path.exists(style_path):
                        with open(style_path, 'r', encoding='utf-8') as f:
                            style_content = f.read()
                        all_styles.append(style_content)
                        print(f"✅ Added style: {style_file}")
                    else:
                        missing_styles.append(style_file)
                        print(f"⚠️  Warning: Style file not found: {style_file}")
                
                if missing_styles:
                    print(f"⚠️  Missing styles: {missing_styles}")
                    print(f"   Available styles in src/: {[f for f in os.listdir(src_dir) if f.endswith('.css')]}")
                
                if all_styles:
                    # Combine all styles with separators
                    style_separators = []
                    for i, style_name in enumerate(style_order):
                        if style_name in [s for s in style_order if os.path.exists(os.path.join(src_dir, s))]:
                            style_separators.append(f"/* ===== Style: {style_name} ===== */\n")
                    
                    combined_style = '\n\n'.join([sep + style for sep, style in zip(style_separators, all_styles)])
                    merged += f'\n<style>{combined_style}</style>'
                    print(f"📦 Packed {len(all_styles)} styles in order")
                else:
                    print(f"⚠️  No styles found to pack")
                
                # Pack scripts in order
                all_scripts = []
                missing_scripts = []
                
                for script_file in script_order:
                    script_path = os.path.join(src_dir, script_file)
                    if os.path.exists(script_path):
                        with open(script_path, 'r', encoding='utf-8') as f:
                            script_content = f.read()
                        all_scripts.append(script_content)
                        print(f"✅ Added script: {script_file}")
                    else:
                        missing_scripts.append(script_file)
                        print(f"⚠️  Warning: Script file not found: {script_file}")
                
                if missing_scripts:
                    print(f"⚠️  Missing scripts: {missing_scripts}")
                    print(f"   Available scripts in src/: {[f for f in os.listdir(src_dir) if f.endswith('.js')]}")
                
                if all_scripts:
                    # Combine all scripts with separators
                    script_separators = []
                    for i, script_name in enumerate(script_order):
                        script_separators.append(f"// ===== Script: {script_name} =====\n")
                    
                    combined_script = '\n\n'.join(script_separators) + '\n\n'
                    combined_script += '\n\n'.join(all_scripts)
                    merged += f'\n<script>{combined_script}</script>'
                    print(f"📦 Packed {len(all_scripts)} scripts in order")
                else:
                    print(f"⚠️  No scripts found to pack")
                
                # Encode the merged content
                merged_bytes = merged.encode('utf-8')
                package['files'][f"{app_name}.html"] = base64.b64encode(merged_bytes).decode('utf-8')
                print(f"✅ Merged source files into {app_name}.html")
                
            elif os.path.exists(html_file):
                # Use existing HTML file if no src/ directory
                print(f"📄 Using existing {app_name}.html file")
                with open(html_file, 'rb') as f:
                    package['files'][f"{app_name}.html"] = base64.b64encode(f.read()).decode('utf-8')
            else:
                print(f"❌ Error: No HTML file found and no src/ directory for {app_name}")
                return None
        
        # Show package summary
        print(f"✅ Packed successfully:")
        print(f"   📋 Files: {len(package['files'])}")
        if 'additional_files' in package and package['additional_files']:
            print(f"   📁 Additional VFS files: {len(package['additional_files'])}")
            for additional_file in package['additional_files']:
                vfs_path = additional_file['vfs_path']
                size_kb = additional_file['size'] / 1024
                print(f"      - {vfs_path} ({size_kb:.1f} KB)")
        
        return package
        
    except Exception as e:
        print(f"❌ Error packing app: {e}")
        return None

def dev_deploy(app_name, source_dir="user_apps_dev", server_url="http://localhost:5000", watch=False):
    """Quick pack and deploy an app for development"""
    
    print(f"🚀 Dev Deploy: {app_name}")
    print(f"📁 Source: {source_dir}")
    print(f"🌐 Server: {server_url}")
    
    # Step 1: Pack the app locally
    print(f"\n📦 Step 1: Packaging {app_name}...")
    
    package = pack_app_local(app_name, source_dir)
    if not package:
        return False
    
    # Step 2: Install via API
    print(f"\n🚀 Step 2: Installing {app_name}...")
    
    try:
        # Convert package to JSON string for multipart upload
        package_json = json.dumps(package)
        
        # Create multipart form data
        files = {
            'package': (f'{app_name}_packaged.app', package_json, 'application/json')
        }
        
        # Send to install API
        install_response = requests.post(f'{server_url}/api/user-apps/install', files=files)
        
        if install_response.status_code == 200:
            install_result = install_response.json()
            print(f"✅ Success: {install_result.get('message', 'App installed successfully')}")
            print(f"📱 App Name: {install_result.get('app_name', app_name)}")
            
            # Step 3: Auto-refresh user apps
            print(f"\n🔄 Step 3: Refreshing user apps...")
            try:
                refresh_response = requests.post(f'{server_url}/api/user-apps/refresh')
                if refresh_response.status_code == 200:
                    refresh_result = refresh_response.json()
                    print(f"✅ User apps refreshed successfully")
                    print(f"📊 Total apps: {refresh_result.get('total', 'Unknown')}")
                else:
                    print(f"⚠️  Warning: Could not refresh user apps (status: {refresh_response.status_code})")
            except Exception as e:
                print(f"⚠️  Warning: Could not refresh user apps: {e}")
            
            return True
        else:
            try:
                error_data = install_response.json()
                print(f"❌ Installation failed: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"❌ Installation failed: {install_response.status_code} - {install_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server")
        print(f" Make sure your Sypnex OS server is running at {server_url}")
        return False
    except Exception as e:
        print(f"❌ Error during deployment: {e}")
        return False

def deploy_all_apps(source_dir="user_apps_dev", server_url="http://localhost:5000"):
    """Deploy all apps in the source directory"""
    if not os.path.exists(source_dir):
        print(f"❌ Error: Source directory '{source_dir}' not found")
        return False
    
    apps = [d for d in os.listdir(source_dir) 
            if os.path.isdir(os.path.join(source_dir, d))]
    
    if not apps:
        print(f" No apps found in {source_dir}")
        return False
    
    print(f" Deploying {len(apps)} apps from {source_dir}...")
    
    success_count = 0
    for app_name in apps:
        print(f"\n{'='*50}")
        success = dev_deploy(app_name, source_dir, server_url, watch=False)
        if success:
            success_count += 1
    
    # Final refresh after all deployments
    if success_count > 0:
        print(f"\n🔄 Final refresh of user apps...")
        try:
            refresh_response = requests.post(f'{server_url}/api/user-apps/refresh')
            if refresh_response.status_code == 200:
                refresh_result = refresh_response.json()
                print(f"✅ Final refresh completed")
                print(f"📊 Total apps: {refresh_result.get('total', 'Unknown')}")
            else:
                print(f"⚠️  Warning: Could not perform final refresh (status: {refresh_response.status_code})")
        except Exception as e:
            print(f"⚠️  Warning: Could not perform final refresh: {e}")
    
    print(f"\n{'='*50}")
    print(f"🎉 Deployed {success_count}/{len(apps)} apps successfully!")
    return success_count == len(apps)

def watch_and_deploy(app_name, source_dir="user_apps_dev", server_url="http://localhost:5000"):
    """Watch for file changes and auto-deploy"""
    print(f" Watching {app_name} for changes...")
    print(f"💡 Press Ctrl+C to stop watching")
    
    app_dir = os.path.join(source_dir, app_name)
    if not os.path.exists(app_dir):
        print(f"❌ Error: App directory {app_dir} not found")
        return
    
    last_modified = 0
    
    try:
        while True:
            # Check for changes
            current_modified = os.path.getmtime(app_dir)
            
            if current_modified > last_modified:
                print(f"\n🔄 Changes detected in {app_name}, redeploying...")
                success = dev_deploy(app_name, source_dir, server_url, watch=False)
                if success:
                    last_modified = current_modified
                    print(f"✅ Redeployed successfully")
                else:
                    print(f"❌ Redeploy failed")
            
            time.sleep(2)  # Check every 2 seconds
            
    except KeyboardInterrupt:
        print(f"\n Stopped watching {app_name}")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("❌ Error: App name is required")
        print("Usage: python dev_deploy.py <app_name> [options]")
        print("\nExamples:")
        print("  python dev_deploy.py flow_editor")
        print("  python dev_deploy.py flow_editor --source user_apps_dev")
        print("  python dev_deploy.py flow_editor --watch")
        print("  python dev_deploy.py all")
        print("\nOptions:")
        print("  --source <dir>  # Source directory (default: user_apps_dev)")
        print("  --server <url>  # Server URL (default: http://localhost:5000)")
        print("  --watch         # Watch for changes and auto-redeploy")
        print("  all             # Deploy all apps in source directory")
        return
    
    app_name = sys.argv[1]
    source_dir = "user_apps_dev"
    server_url = "http://localhost:5000"
    watch = "--watch" in sys.argv
    
    # Parse options
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--source" and i + 1 < len(sys.argv):
            source_dir = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == "--server" and i + 1 < len(sys.argv):
            server_url = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    if app_name == "all":
        deploy_all_apps(source_dir, server_url)
    elif watch:
        watch_and_deploy(app_name, source_dir, server_url)
    else:
        dev_deploy(app_name, source_dir, server_url, watch)

if __name__ == "__main__":
    main() 
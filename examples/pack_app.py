#!/usr/bin/env python3
"""
Pack App Script - Package existing user apps into distributable format
Usage: python pack_app.py <app_name> [--source <dir>]
"""

import os
import sys
import json
import base64
from pathlib import Path
from datetime import datetime

def pack_app(app_name, source_dir="user_apps_dev"):
    """Pack an existing user app into a distributable format"""
    
    # Validate app name
    if not app_name or not app_name.strip():
        print("❌ Error: App name is required")
        print("Usage: python pack_app.py <app_name>")
        return False
    
    app_name = app_name.strip()
    
    # Define paths
    app_dir = os.path.join(source_dir, app_name)
    app_file = os.path.join(app_dir, f"{app_name}.app")
    
    # Check if app exists
    if not os.path.exists(app_dir):
        print(f"❌ Error: App '{app_name}' not found at {app_dir}")
        return False
    
    if not os.path.exists(app_file):
        print(f"❌ Error: App metadata file '{app_name}.app' not found")
        return False
    
    try:
        # Load the original .app metadata file
        with open(app_file, 'r', encoding='utf-8') as f:
            app_metadata = json.load(f)
        
        print(f"📦 Packing app: {app_metadata.get('name', app_name)}")
        print(f"📁 Source directory: {app_dir}")
        
        # Auto-pack if needed (for user apps with src/ directory)
        if app_metadata.get('type') != 'terminal_app':
            packed_html_file = auto_pack_app(app_name, app_dir)
            if packed_html_file:
                print(f"✅ Auto-packed HTML file: {packed_html_file}")
        
        # Prepare package
        package = {
            'app_metadata': app_metadata,  # Original .app content (unchanged)
            'files': {},
            'package_info': {
                'format_version': '1.0',
                'created_at': datetime.now().isoformat(),
                'packaged_by': 'Sypnex OS App Packager',
                'source_directory': app_dir
            }
        }
        
        # Add the original .app file (base64 encoded)
        with open(app_file, 'rb') as f:
            package['files'][f"{app_name}.app"] = base64.b64encode(f.read()).decode('utf-8')
        print(f"✅ Added {app_name}.app")
        
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
                
                # Build full path to source file (relative to app's src directory for now)
                src_dir = os.path.join(app_dir, 'src')
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
                print(f"✅ Added {app_name}.py")
            else:
                print(f"⚠️  Warning: Python file {app_name}.py not found")
        else:
            # User app - add HTML file (packed or original)
            html_file = os.path.join(app_dir, f"{app_name}.html")
            intermediate_html_created = False
            
            if os.path.exists(html_file):
                with open(html_file, 'rb') as f:
                    package['files'][f"{app_name}.html"] = base64.b64encode(f.read()).decode('utf-8')
                print(f"✅ Added {app_name}.html")
                
                # Check if this was an intermediate file created by auto-packing
                if packed_html_file and packed_html_file == html_file:
                    intermediate_html_created = True
            else:
                print(f"⚠️  Warning: HTML file {app_name}.html not found")
        
        # Create output file
        output_file = f"{app_name}_packaged.app"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(package, f, indent=2)
        
        # Clean up intermediate HTML file if it was auto-created
        if packed_html_file and intermediate_html_created:
            try:
                os.remove(packed_html_file)
                print(f"🧹 Cleaned up intermediate file: {os.path.basename(packed_html_file)}")
            except Exception as e:
                print(f"⚠️  Warning: Could not clean up intermediate file: {e}")
        
        # Calculate package size
        package_size = os.path.getsize(output_file)
        package_size_kb = package_size / 1024
        
        print(f"\n🎉 Successfully packaged '{app_name}'!")
        print(f"📦 Package file: {output_file}")
        print(f"📊 Package size: {package_size_kb:.1f} KB")
        print(f"📋 Files included:")
        for filename in package['files'].keys():
            print(f"   - {filename}")
        
        # Show additional files if any
        if 'additional_files' in package and package['additional_files']:
            print(f"📁 Additional VFS files:")
            for additional_file in package['additional_files']:
                vfs_path = additional_file['vfs_path']
                size_kb = additional_file['size'] / 1024
                print(f"   - {vfs_path} ({size_kb:.1f} KB)")
        
        print(f"\n💡 Next steps:")
        print(f"   1. Share the {output_file} file")
        print(f"   2. Recipient can install it using the app installer")
        print(f"   3. Package contains all necessary files for installation")
        if 'additional_files' in package and package['additional_files']:
            print(f"   4. VFS files will be automatically deployed during installation")
        
        return True
        
    except Exception as e:
        print(f"❌ Error packing app: {e}")
        import traceback
        traceback.print_exc()
        return False

def auto_pack_app(app_id, app_path):
    """Auto-pack a development app into a single HTML file if src/ exists"""
    src_dir = os.path.join(app_path, 'src')
    if not os.path.exists(src_dir):
        return None
    
    html_file = os.path.join(app_path, f"{app_id}.html")
    
    # Only repack if any src file is newer than the packed file
    if os.path.exists(html_file):
        html_mtime = os.path.getmtime(html_file)
        src_files = []
        for f in os.listdir(src_dir):
            if f.endswith(('.html', '.css', '.js')):
                src_files.append(os.path.getmtime(os.path.join(src_dir, f)))
        
        if src_files and html_mtime > max(src_files):
            return html_file  # Already up to date
    
    # Read app metadata to get script and style order
    app_file = os.path.join(app_path, f"{app_id}.app")
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
        print(f"⚠️  Warning: No index.html found in src/ for {app_id}")
        return None
    
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
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(merged)
    
    return html_file

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("❌ Error: App name is required")
        print("Usage: python pack_app.py <app_name> [--source <dir>]")
        print("\nExamples:")
        print("  python pack_app.py llm_chat")
        print("  python pack_app.py flow_editor --source user_apps_dev")
        print("\nOptions:")
        print("  --source <dir>  # Source directory (default: user_apps_dev)")
        print("\n💡 Make sure the app exists in the source directory")
        return
    
    app_name = sys.argv[1]
    
    # Parse options
    source_dir = "user_apps_dev"
    
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == "--source" and i + 1 < len(sys.argv):
            source_dir = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    pack_app(app_name, source_dir)

if __name__ == "__main__":
    main() 
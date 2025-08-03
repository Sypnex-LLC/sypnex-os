#!/usr/bin/env python3
"""Test VFS structure and installed apps"""

from core.virtual_file_manager import get_virtual_file_manager
import json

def test_vfs():
    vfs = get_virtual_file_manager()
    
    print("🔍 Testing VFS Structure...")
    
    # Check /apps directory
    apps_exists = vfs._path_exists('/apps')
    print(f"📁 /apps exists: {apps_exists}")
    
    # Check /apps/installed directory
    installed_exists = vfs._path_exists('/apps/installed')
    print(f"📁 /apps/installed exists: {installed_exists}")
    
    if installed_exists:
        # List installed apps
        items = vfs.list_directory('/apps/installed')
        print(f"📦 Found {len(items)} items in /apps/installed:")
        
        for item in items:
            if item['is_directory']:
                app_id = item['name']
                app_path = f"/apps/installed/{app_id}"
                
                # Check app metadata
                metadata_file = f"{app_path}/{app_id}.app"
                metadata_data = vfs.read_file(metadata_file)
                
                if metadata_data:
                    try:
                        metadata = json.loads(metadata_data['content'].decode('utf-8'))
                        app_name = metadata.get('name', app_id)
                        app_type = metadata.get('type', 'unknown')
                        
                        print(f"  📱 {app_name} ({app_type})")
                        print(f"    Path: {app_path}")
                        
                        # List app files
                        app_files = vfs.list_directory(app_path)
                        print(f"    Files: {[f['name'] for f in app_files]}")
                        print()
                        
                    except Exception as e:
                        print(f"  ❌ {app_id} (metadata error: {e})")
                else:
                    print(f"  ❌ {app_id} (no metadata)")

if __name__ == "__main__":
    test_vfs() 
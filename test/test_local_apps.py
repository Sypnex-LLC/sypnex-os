#!/usr/bin/env python3
"""Test local app IDs to ensure they have local_ prefix"""

import os
import json

def test_local_apps():
    user_apps_dir = "user_apps"
    
    print("🔍 Testing Local App IDs...")
    
    if not os.path.exists(user_apps_dir):
        print("❌ user_apps directory not found")
        return
    
    for app_dir in os.listdir(user_apps_dir):
        app_path = os.path.join(user_apps_dir, app_dir)
        
        if not os.path.isdir(app_path):
            continue
        
        # Look for .app metadata file
        app_metadata_file = os.path.join(app_path, f"{app_dir}.app")
        
        if not os.path.exists(app_metadata_file):
            print(f"⚠️  No metadata file found for {app_dir}")
            continue
        
        try:
            # Load metadata
            with open(app_metadata_file, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            app_id = metadata.get('id', 'unknown')
            app_name = metadata.get('name', app_dir)
            app_type = metadata.get('type', 'unknown')
            
            # Check if ID has local_ prefix
            has_local_prefix = app_id.startswith('local_')
            
            status = "✅" if has_local_prefix else "❌"
            prefix_status = "local_" if has_local_prefix else "NO PREFIX"
            
            print(f"{status} {app_name}")
            print(f"   ID: {app_id} ({prefix_status})")
            print(f"   Type: {app_type}")
            print()
            
        except Exception as e:
            print(f"❌ Error reading {app_dir}: {e}")
            print()

if __name__ == "__main__":
    test_local_apps() 
#!/usr/bin/env python3
"""
Install App Script - Install packaged apps via API
Usage: python install_app.py <package_file>
"""

import os
import sys
import json
import requests

def install_app(package_file, force_overwrite=False):
    """Install a packaged app via API
    
    Args:
        package_file (str): Path to the .app package file
        force_overwrite (bool): If True, overwrite existing app (API handles this)
    """
    
    # Validate package file
    if not package_file or not package_file.strip():
        print("❌ Error: Package file is required")
        print("Usage: python install_app.py <package_file>")
        return False
    
    package_file = package_file.strip()
    
    # Check if package file exists
    if not os.path.exists(package_file):
        print(f"❌ Error: Package file '{package_file}' not found")
        return False
    
    try:
        # Load package data to get app info
        with open(package_file, 'r', encoding='utf-8') as f:
            package_data = json.load(f)
        
        app_metadata = package_data.get('app_metadata', {})
        app_name = app_metadata.get('name', 'Unknown App')
        app_id = app_metadata.get('id', 'unknown')
        
        print(f"📦 Installing app: {app_name}")
        print(f"🆔 App ID: {app_id}")
        print(f"📋 Using API: http://localhost:5000")
        
        # Install via API (same as web UI)
        with open(package_file, 'rb') as f:
            files = {'package': (os.path.basename(package_file), f, 'application/json')}
            
            try:
                response = requests.post('http://localhost:5000/api/user-apps/install', files=files)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Success: {result.get('message', 'App installed successfully')}")
                    print(f"📱 App Name: {result.get('app_name', app_name)}")
                    return True
                else:
                    print(f"❌ API Error: {response.status_code}")
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data.get('error', 'Unknown error')}")
                    except:
                        print(f"   Response: {response.text}")
                    return False
                    
            except requests.exceptions.ConnectionError:
                print("❌ Error: Could not connect to server at http://localhost:5000")
                print(" Make sure your Sypnex OS server is running")
                return False
                
    except Exception as e:
        print(f"❌ Error installing app: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("❌ Error: Package file is required")
        print("Usage: python install_app.py <package_file>")
        print("\nExamples:")
        print("  python install_app.py llm_chat_packaged.app")
        print("  python install_app.py hello_terminal_packaged.app")
        print("\n Make sure your Sypnex OS server is running at http://localhost:5000")
        return
    
    command = sys.argv[1]
    install_app(command)

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Test Installation UI and API Endpoints
"""

import requests
import json
import os

def test_api_endpoints():
    base_url = "http://localhost:5000"
    
    print("🧪 Testing Installation UI and API Endpoints")
    print("=" * 50)
    
    # Test 1: Get user apps (should show both local and VFS apps)
    print("\n1. Testing GET /api/user-apps")
    try:
        response = requests.get(f"{base_url}/api/user-apps")
        if response.status_code == 200:
            apps = response.json()
            print(f"✅ Success: Found {len(apps)} apps")
            
            # Show app sources
            local_apps = [app for app in apps if app.get('source') == 'local']
            vfs_apps = [app for app in apps if app.get('source') == 'vfs']
            
            print(f"   📁 Local apps: {len(local_apps)}")
            for app in local_apps:
                print(f"      • {app['name']} ({app['id']})")
            
            print(f"   📦 VFS apps: {len(vfs_apps)}")
            for app in vfs_apps:
                print(f"      • {app['name']} ({app['id']})")
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Test refresh endpoint
    print("\n2. Testing POST /api/user-apps/refresh")
    try:
        response = requests.post(f"{base_url}/api/user-apps/refresh")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result['message']}")
            print(f"   Total: {result['total']}, User: {result['user_apps']}")
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Test uninstall endpoint (for an existing VFS app)
    print("\n3. Testing DELETE /api/user-apps/uninstall/llm_chat")
    try:
        response = requests.delete(f"{base_url}/api/user-apps/uninstall/llm_chat")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result['message']}")
        elif response.status_code == 404:
            print("⚠️  App not found (might already be uninstalled)")
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Test install endpoint (upload a package)
    print("\n4. Testing POST /api/user-apps/install")
    if os.path.exists("llm_chat_packaged.app"):
        try:
            with open("llm_chat_packaged.app", "rb") as f:
                files = {"package": ("llm_chat_packaged.app", f, "application/json")}
                response = requests.post(f"{base_url}/api/user-apps/install", files=files)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Success: {result['message']}")
                else:
                    print(f"❌ Failed: {response.status_code}")
                    print(f"   Error: {response.json().get('error', 'Unknown error')}")
        except Exception as e:
            print(f"❌ Error: {e}")
    else:
        print("⚠️  Skipped: llm_chat_packaged.app not found")
    
    print("\n🎉 Installation UI Testing Complete!")
    print("\nNext steps:")
    print("1. Open http://localhost:5000 in your browser")
    print("2. Navigate to User App Manager")
    print("3. Try the 'Install App' button")
    print("4. Test uninstalling apps with the trash icon")

if __name__ == "__main__":
    test_api_endpoints() 
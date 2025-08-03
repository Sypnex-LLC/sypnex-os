#!/usr/bin/env python3
"""Test enhanced UserAppManager discovery"""

from core.user_app_manager import UserAppManager

def test_discovery():
    print("🧪 Testing Enhanced UserAppManager Discovery")
    print("=" * 50)
    
    # Create UserAppManager instance
    manager = UserAppManager()
    
    print("\n📊 Discovery Results:")
    print("-" * 30)
    
    # Get all apps
    user_apps = manager.get_user_apps()
    
    print(f"📱 User Apps ({len(user_apps)}):")
    for app_id, app_data in user_apps.items():
        source = app_data.get('source', 'unknown')
        name = app_data.get('name', app_id)
        print(f"  • {name} ({app_id}) - Source: {source}")
    
    print(f"\n📈 Summary:")
    print(f"  Total Apps: {len(user_apps)}")
    print(f"  Local Apps: {len([a for a in user_apps.values() if a.get('source') == 'local'])}")
    print(f"  VFS Apps: {len([a for a in user_apps.values() if a.get('source') == 'vfs'])}")
    
    # Test app retrieval
    print(f"\n🔍 Testing App Retrieval:")
    print("-" * 30)
    
    # Test a local app
    local_app_id = "local_llm_chat"
    if local_app_id in user_apps:
        local_app = manager.get_user_app(local_app_id)
        print(f"✅ Local app '{local_app_id}' retrieved successfully")
        print(f"   Source: {local_app.get('source')}")
        print(f"   Has HTML content: {bool(local_app.get('html_content'))}")
    else:
        print(f"❌ Local app '{local_app_id}' not found")
    
    # Test a VFS app
    vfs_app_id = "llm_chat"
    if vfs_app_id in user_apps:
        vfs_app = manager.get_user_app(vfs_app_id)
        print(f"✅ VFS app '{vfs_app_id}' retrieved successfully")
        print(f"   Source: {vfs_app.get('source')}")
        print(f"   Has HTML content: {bool(vfs_app.get('html_content'))}")
    else:
        print(f"❌ VFS app '{vfs_app_id}' not found")

if __name__ == "__main__":
    test_discovery() 
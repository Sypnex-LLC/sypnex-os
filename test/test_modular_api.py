#!/usr/bin/env python3
"""
Test script to verify that the modular SypnexAPI loads correctly
"""

import os
import sys

def test_module_files():
    """Test that all module files exist"""
    modules = [
        'static/js/sypnex-api-core.js',
        'static/js/sypnex-api-settings.js', 
        'static/js/sypnex-api-socket.js',
        'static/js/sypnex-api-vfs.js',
        'static/js/sypnex-api-libraries.js',
        'static/js/sypnex-api-file-explorer.js',
        'static/js/sypnex-api-terminal.js'
    ]
    
    print("Testing SypnexAPI module files...")
    
    for module in modules:
        if os.path.exists(module):
            size = os.path.getsize(module)
            print(f"✅ {module} ({size} bytes)")
        else:
            print(f"❌ {module} - MISSING")
            return False
    
    return True

def test_module_content():
    """Test that modules contain expected content"""
    print("\nTesting module content...")
    
    # Test core module has SypnexAPI class
    with open('static/js/sypnex-api-core.js', 'r') as f:
        core_content = f.read()
        if 'class SypnexAPI' in core_content:
            print("✅ Core module contains SypnexAPI class")
        else:
            print("❌ Core module missing SypnexAPI class")
            return False
    
    # Test settings module extends prototype
    with open('static/js/sypnex-api-settings.js', 'r') as f:
        settings_content = f.read()
        if 'Object.assign(SypnexAPI.prototype' in settings_content:
            print("✅ Settings module extends SypnexAPI prototype")
        else:
            print("❌ Settings module doesn't extend prototype")
            return False
    
    # Test socket module has socket methods
    with open('static/js/sypnex-api-socket.js', 'r') as f:
        socket_content = f.read()
        if 'connectSocket' in socket_content:
            print("✅ Socket module contains connectSocket method")
        else:
            print("❌ Socket module missing connectSocket method")
            return False
    
    # Test VFS module has file methods
    with open('static/js/sypnex-api-vfs.js', 'r') as f:
        vfs_content = f.read()
        if 'listVirtualFiles' in vfs_content:
            print("✅ VFS module contains listVirtualFiles method")
        else:
            print("❌ VFS module missing listVirtualFiles method")
            return False
    
    return True

def main():
    """Main test function"""
    print("🧪 Testing Modular SypnexAPI")
    print("=" * 40)
    
    # Test file existence
    if not test_module_files():
        print("\n❌ Module files test failed")
        return False
    
    # Test module content
    if not test_module_content():
        print("\n❌ Module content test failed")
        return False
    
    print("\n✅ All tests passed! Modular SypnexAPI is ready.")
    print("\n📋 Module breakdown:")
    print("  • Core: Constructor, initialization, basic methods")
    print("  • Settings: App settings and user preferences")
    print("  • Socket: WebSocket communication")
    print("  • VFS: Virtual file system operations")
    print("  • Libraries: CDN library management")
    print("  • File Explorer: UI components")
    print("  • Terminal: Command execution")
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1) 
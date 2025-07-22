#!/usr/bin/env python3
"""
Sypnex OS Vendor Verification Script
Verifies that all vendor dependencies are properly downloaded and accessible
"""

import os
from pathlib import Path

def check_file_exists(file_path, description):
    """Check if a file exists and report status"""
    if file_path.exists():
        size = file_path.stat().st_size
        print(f"✅ {description}: {file_path.name} ({size:,} bytes)")
        return True
    else:
        print(f"❌ {description}: {file_path.name} (MISSING)")
        return False

def main():
    """Main verification function"""
    script_dir = Path(__file__).parent
    vendor_dir = script_dir / 'static' / 'vendor'
    
    print("🔍 Sypnex OS Vendor Verification")
    print("=" * 50)
    
    files_to_check = [
        # Bootstrap files
        (vendor_dir / 'bootstrap' / 'css' / 'bootstrap.min.css', 'Bootstrap CSS'),
        (vendor_dir / 'bootstrap' / 'js' / 'bootstrap.bundle.min.js', 'Bootstrap JS'),
        
        # Font Awesome files
        (vendor_dir / 'fontawesome' / 'css' / 'all.min.css', 'Font Awesome CSS'),
        (vendor_dir / 'fontawesome' / 'webfonts' / 'fa-solid-900.woff2', 'FA Solid Font (WOFF2)'),
        (vendor_dir / 'fontawesome' / 'webfonts' / 'fa-regular-400.woff2', 'FA Regular Font (WOFF2)'),
        (vendor_dir / 'fontawesome' / 'webfonts' / 'fa-brands-400.woff2', 'FA Brands Font (WOFF2)'),
        
        # Socket.IO
        (vendor_dir / 'socket.io' / 'socket.io.min.js', 'Socket.IO JS'),
    ]
    
    all_good = True
    
    for file_path, description in files_to_check:
        if not check_file_exists(file_path, description):
            all_good = False
    
    print("\n" + "=" * 50)
    
    if all_good:
        print("🎉 All vendor dependencies are properly installed!")
        print("🚀 Your Sypnex OS is now ready for 100% offline operation!")
        
        # Check if index.html has been updated
        index_file = script_dir / 'templates' / 'index.html'
        if index_file.exists():
            with open(index_file, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'vendor/bootstrap' in content and 'vendor/fontawesome' in content:
                    print("✅ index.html has been updated to use local vendor files")
                else:
                    print("⚠️  index.html may need to be updated to use local vendor files")
        
        print("\n📁 Vendor Directory Structure:")
        print(f"📂 {vendor_dir}")
        print("├── bootstrap/")
        print("│   ├── css/bootstrap.min.css")
        print("│   └── js/bootstrap.bundle.min.js")
        print("├── fontawesome/")
        print("│   ├── css/all.min.css")
        print("│   └── webfonts/ (9 font files)")
        print("└── socket.io/")
        print("    └── socket.io.min.js")
        
    else:
        print("❌ Some vendor dependencies are missing!")
        print("🔄 Try running 'python download_vendors.py' again")
    
    return all_good

if __name__ == "__main__":
    main()

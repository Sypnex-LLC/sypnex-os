#!/usr/bin/env python3
"""
Sypnex OS Vendor Management Script
Downloads CDN dependencies for offline use
"""

import os
import sys
import requests
from pathlib import Path

# Define the vendor dependencies
VENDOR_DEPENDENCIES = {
    # Bootstrap CSS
    'bootstrap/css/bootstrap.min.css': 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'bootstrap/css/bootstrap.min.css.map': 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css.map',
    
    # Font Awesome CSS
    'fontawesome/css/all.min.css': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    
    # Bootstrap JS
    'bootstrap/js/bootstrap.bundle.min.js': 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
    'bootstrap/js/bootstrap.bundle.min.js.map': 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js.map',
    
    # Socket.IO JS
    'socket.io/socket.io.min.js': 'https://cdn.socket.io/4.7.2/socket.io.min.js',
    'socket.io/socket.io.min.js.map': 'https://cdn.socket.io/4.7.2/socket.io.min.js.map',
}

# Font Awesome additional files (fonts)
FONTAWESOME_FONTS = {
    'fontawesome/webfonts/fa-brands-400.woff2': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
    'fontawesome/webfonts/fa-brands-400.woff': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff',
    'fontawesome/webfonts/fa-brands-400.ttf': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.ttf',
    'fontawesome/webfonts/fa-regular-400.woff2': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
    'fontawesome/webfonts/fa-regular-400.woff': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff',
    'fontawesome/webfonts/fa-regular-400.ttf': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.ttf',
    'fontawesome/webfonts/fa-solid-900.woff2': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'fontawesome/webfonts/fa-solid-900.woff': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff',
    'fontawesome/webfonts/fa-solid-900.ttf': 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.ttf',
}

def download_file(url, local_path):
    """Download a file from URL to local path"""
    try:
        print(f"Downloading: {url}")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        # Create directory if it doesn't exist
        local_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✓ Downloaded: {local_path}")
        return True
        
    except Exception as e:
        print(f"✗ Failed to download {url}: {e}")
        return False

def fix_fontawesome_css(css_file_path):
    """Fix Font Awesome CSS to use local font paths"""
    try:
        with open(css_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace CDN font URLs with local paths
        content = content.replace(
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/',
            '../webfonts/'
        )
        
        with open(css_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ Fixed Font Awesome CSS paths: {css_file_path}")
        return True
        
    except Exception as e:
        print(f"✗ Failed to fix Font Awesome CSS: {e}")
        return False

def main():
    """Main function to download all vendor dependencies"""
    # Get the script directory and find the static/vendor path
    script_dir = Path(__file__).parent
    vendor_dir = script_dir / 'static' / 'vendor'
    
    print("🚀 Sypnex OS Vendor Management")
    print("=" * 50)
    print(f"Target directory: {vendor_dir}")
    print()
    
    # Download main dependencies
    print("📦 Downloading main dependencies...")
    success_count = 0
    total_count = len(VENDOR_DEPENDENCIES)
    
    for local_path, url in VENDOR_DEPENDENCIES.items():
        full_path = vendor_dir / local_path
        if download_file(url, full_path):
            success_count += 1
    
    # Download Font Awesome fonts
    print("\n🔤 Downloading Font Awesome fonts...")
    font_success_count = 0
    font_total_count = len(FONTAWESOME_FONTS)
    
    for local_path, url in FONTAWESOME_FONTS.items():
        full_path = vendor_dir / local_path
        if download_file(url, full_path):
            font_success_count += 1
    
    # Fix Font Awesome CSS paths
    print("\n🔧 Fixing Font Awesome CSS paths...")
    fontawesome_css = vendor_dir / 'fontawesome' / 'css' / 'all.min.css'
    if fontawesome_css.exists():
        fix_fontawesome_css(fontawesome_css)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Download Summary:")
    print(f"Main dependencies: {success_count}/{total_count}")
    print(f"Font Awesome fonts: {font_success_count}/{font_total_count}")
    
    if success_count == total_count and font_success_count == font_total_count:
        print("✅ All dependencies downloaded successfully!")
        print("\n🔄 Next step: Update your index.html to use local vendor files")
        return True
    else:
        print("❌ Some downloads failed. Please check your internet connection and try again.")
        return False

if __name__ == "__main__":
    if not main():
        sys.exit(1)

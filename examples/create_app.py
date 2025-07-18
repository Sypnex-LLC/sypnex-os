#!/usr/bin/env python3
"""
Create App Script - Quickly create new user apps with proper structure
Usage: python create_app.py <app_name>
"""

import os
import sys
import json
from pathlib import Path

def create_app(app_name):
    """Create a new user app with the given name"""
    
    # Validate app name
    if not app_name or not app_name.strip():
        print("❌ Error: App name is required")
        print("Usage: python create_app.py <app_name>")
        return False
    
    app_name = app_name.strip()
    
    # Check for invalid characters
    invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for char in invalid_chars:
        if char in app_name:
            print(f"❌ Error: App name cannot contain '{char}'")
            return False
    
    # Define paths - get script directory and build paths relative to it
    script_dir = os.path.dirname(os.path.abspath(__file__))
    user_apps_dir = os.path.join(script_dir, "user_apps_dev")
    app_dir = os.path.join(user_apps_dir, app_name)
    src_dir = os.path.join(app_dir, "src")
    app_file = os.path.join(app_dir, f"{app_name}.app")
    
    # Check if app already exists
    if os.path.exists(app_dir):
        print(f"❌ Error: App '{app_name}' already exists at {app_dir}")
        return False
    
    try:
        # Create app directory
        os.makedirs(app_dir)
        print(f"✅ Created app directory: {app_dir}")
        
        # Create src directory
        os.makedirs(src_dir)
        print(f"✅ Created src directory: {src_dir}")
        
        # Create index.html
        index_html_content = f"""<div class="app-container">
    <div class="app-header">
        <h2><i class="fas fa-star"></i> {app_name.title()}</h2>
        <p>Hello {app_name.title()}!</p>
    </div>

    <div class="app-content">
        <p>Welcome to your new {app_name.title()} app!</p>
    </div>
</div>"""
        
        with open(os.path.join(src_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(index_html_content)
        print(f"✅ Created index.html")
        
        # Create style.css
        style_css_content = f"""/* {app_name.title()} App Styles */

/* Add your custom styles below */
"""
        
        with open(os.path.join(src_dir, "style.css"), "w", encoding="utf-8") as f:
            f.write(style_css_content)
        print(f"✅ Created style.css")
        
        # Create script.js
        script_js_content = f"""// {app_name.title()} App JavaScript

console.log('{app_name.title()} app loading...');

// Initialize when DOM is ready
function initApp() {{
    console.log('{app_name.title()} app initialized');
    
    // Check if SypnexAPI is available (local variable in sandboxed environment)
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {{
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }}

    console.log('SypnexAPI available:', sypnexAPI);
    console.log('App ID:', sypnexAPI.getAppId());
    console.log('Initialized:', sypnexAPI.isInitialized());
    
    // Example: Use SypnexAPI for OS integration
    // sypnexAPI.showNotification('Hello from {app_name}!');
    // sypnexAPI.openApp('terminal');
}}

// Initialize when DOM is ready
if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', initApp);
}} else {{
    // DOM is already loaded
    initApp();
}}

// Add your custom JavaScript below
"""
        
        with open(os.path.join(src_dir, "script.js"), "w", encoding="utf-8") as f:
            f.write(script_js_content)
        print(f"✅ Created script.js")
        
        # Create .app file
        app_config = {
            "id": app_name,
            "name": app_name.title() + " App",
            "description": "A " + app_name.title() + " application",
            "icon": "fas fa-star",
            "keywords": [app_name.lower(), "app", "user"],
            "author": "Developer",
            "version": "1.0.0",
            "type": "user_app",
            "settings": []
        }
        
        with open(app_file, "w", encoding="utf-8") as f:
            json.dump(app_config, f, indent=2)
        print(f"✅ Created {app_name}.app")
        
        # Success message
        print(f"\n🎉 Successfully created '{app_name}' app!")
        print(f"📁 Location: {app_dir}")
        print(f"📝 Files created:")
        print(f"   - {app_name}.app (app configuration)")
        print(f"   - src/index.html (main HTML file)")
        print(f"   - src/style.css (styling)")
        print(f"   - src/script.js (JavaScript logic)")
        print(f"\n🚀 Next steps:")
        print(f"   1. Edit the files in the src/ folder")
        print(f"   2. Refresh the User App Manager in your OS")
        print(f"   3. Your app will be automatically packed and available")
        print(f"\n💡 Tip: Use the SypnexAPI library for OS integration!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating app: {e}")
        # Clean up on error
        if os.path.exists(app_dir):
            import shutil
            shutil.rmtree(app_dir)
            print(f"🧹 Cleaned up partial app directory")
        return False

def main():
    """Main function"""
    if len(sys.argv) != 2:
        print("❌ Error: App name is required")
        print("Usage: python create_app.py <app_name>")
        print("\nExamples:")
        print("  python create_app.py calculator")
        print("  python create_app.py todo_list")
        print("  python create_app.py weather_app")
        return
    
    app_name = sys.argv[1]
    create_app(app_name)

if __name__ == "__main__":
    main() 
"""
Main application file for Sypnex OS
This is the refactored version that uses modular route organization
"""
from app_config import create_app, initialize_managers, initialize_system, BUILTIN_APPS
from routes import register_all_routes
from swagger_config import setup_auto_swagger
from flask import Response, url_for
from pathlib import Path
import time
import hashlib

try:
    from jsmin import jsmin
    JSMIN_AVAILABLE = True
except ImportError:
    JSMIN_AVAILABLE = False
    print("Warning: jsmin not available. Install with: pip install jsmin")

# Create Flask application
app = create_app()

# Initialize all managers
managers = initialize_managers()

# Initialize system (load requirements, discover plugins, etc.)
managers = initialize_system(managers)

# Register terminal manager routes
managers['terminal_manager'].register_routes(app)

# Register websocket routes
managers['websocket_manager'].register_routes(app)

# Register logs manager routes
managers['logs_manager'].register_routes(app)

# Register all application routes
register_all_routes(app, managers, BUILTIN_APPS)


# Initialize Swagger with automatic route discovery
# This must be done after all routes are registered
setup_auto_swagger(app)


# Cache-busting helper function
@app.template_global()
def cache_bust_url(endpoint, **values):
    """
    Generate URLs with cache-busting parameters
    Uses timestamp for dynamic content and file hash for static content
    """
    if endpoint in ['serve_bundled_os', 'serve_bundled_sypnex_api', 'serve_bundled_css']:
        # For dynamic bundles, use timestamp
        values['v'] = str(int(time.time()))
    elif 'filename' in values:
        # For static files, try to use file modification time
        try:
            static_path = Path(app.static_folder) / values['filename']
            if static_path.exists():
                values['v'] = str(int(static_path.stat().st_mtime))
            else:
                values['v'] = str(int(time.time()))
        except:
            values['v'] = str(int(time.time()))
    else:
        values['v'] = str(int(time.time()))
    
    return url_for(endpoint, **values)

@app.route('/static/js/os.js')
def serve_bundled_os():
    """
    Dynamically bundle all os-*.js files in the correct load order
    This replaces loading 10+ individual JavaScript files
    """
    from flask import request
    from app_config import validate_session_token
    
    # Get session token for bundle injection
    token = (request.headers.get('X-Session-Token') or 
            request.cookies.get('session_token'))
    
    # Validate session and get actual session token
    username = validate_session_token(token) if token else None
    session_token = token if username else 'INVALID_SESSION'
    
    js_dir = Path(app.static_folder) / 'js'
    
    # Define load order (critical for dependencies)
    load_order = [
        "os-core.js",
        "os-spotlight.js", 
        "os-builtin-app-tracker.js",  # Must be before windows.js
        "os-windows.js",
        "os-taskbar.js",
        "os-status.js",
        "os-dashboard.js",
        "os-terminal.js",
        "os-vfs.js",
        "os-resource-manager.js",
        "os-app-manager.js",
        "os-system-settings.js",
        "os-lock.js",
        "os-welcome.js",
        "os-init.js"  # Must be last!
    ]
    
    bundle_content = "// SYPNEX OS - Dynamically Bundled JavaScript\n"
    bundle_content += f"// Generated: {__import__('datetime').datetime.now()}\n"
    bundle_content += f"// User: {username or 'anonymous'}\n\n"
    
    for js_file in load_order:
        file_path = js_dir / js_file
        if file_path.exists():
            try:
                bundle_content += f"// === {js_file} ===\n"
                with open(file_path, 'r', encoding='utf-8') as f:
                    bundle_content += f.read() + "\n\n"
            except Exception as e:
                bundle_content += f"// ERROR loading {js_file}: {str(e)}\n\n"
        else:
            bundle_content += f"// MISSING: {js_file}\n\n"
    
    # Replace template tokens with actual session token
    bundle_content = bundle_content.replace('{{ACCESS_TOKEN}}', session_token)
    
    # Minify the bundle if jsmin is available
    if JSMIN_AVAILABLE:
        try:
            bundle_content = jsmin(bundle_content, quote_chars="'\"`")
        except Exception as e:
            print(f"Warning: Minification failed: {e}")
    
    response = Response(bundle_content, mimetype='application/javascript')
    
    # Add aggressive no-cache headers
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['Last-Modified'] = __import__('datetime').datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')
    
    return response

@app.route('/static/js/sypnex-api.js')
def serve_bundled_sypnex_api():
    """
    Dynamically bundle all sypnex-api-*.js files in the correct load order
    This replaces loading 8+ individual SypnexAPI modules
    """
    from flask import request
    from app_config import validate_session_token
    
    # Get bundle parameter, defaults to True
    bundle = request.args.get('bundle', 'true').lower() == 'true'
    
    # Get session token for bundle injection
    token = (request.headers.get('X-Session-Token') or 
            request.cookies.get('session_token'))
    
    # Validate session and get actual session token
    username = validate_session_token(token) if token else None
    session_token = token if username else 'INVALID_SESSION'
    
    js_dir = Path(app.static_folder) / 'js'
    
    # Define load order (critical for dependencies)
    api_modules = [
        "sypnex-api-core.js",
        "sypnex-api-ui.js",        # UI components (modals, confirmations, etc.)
        "sypnex-api-scaling.js",  # Add scaling utilities early after core
        "sypnex-api-settings.js", 
        "sypnex-api-socket.js",
        "sypnex-api-vfs.js",
        "sypnex-api-libraries.js",
        "sypnex-api-file-explorer.js",
        "sypnex-api-terminal.js",
        "sypnex-api-logs.js",
        "sypnex-api-app-management.js",
        "sypnex-api-network.js",
    ]
    
    bundle_content = "// SypnexAPI - Dynamically Bundled JavaScript API\n"
    bundle_content += f"// Generated: {__import__('datetime').datetime.now()}\n"
    bundle_content += f"// Minified: {bundle and JSMIN_AVAILABLE}\n\n"
    
    for js_file in api_modules:
        file_path = js_dir / js_file
        if file_path.exists():
            try:
                bundle_content += f"// === {js_file} ===\n"
                with open(file_path, 'r', encoding='utf-8') as f:
                    bundle_content += f.read() + "\n\n"
            except Exception as e:
                bundle_content += f"// ERROR loading {js_file}: {str(e)}\n\n"
        else:
            bundle_content += f"// MISSING: {js_file}\n\n"
    
    # Replace template tokens with actual session token
    bundle_content = bundle_content.replace('{{ACCESS_TOKEN}}', session_token)
    
    # Minify the bundle if jsmin is available AND bundle is True
    if JSMIN_AVAILABLE and bundle:
        try:
            bundle_content = jsmin(bundle_content, quote_chars="'\"`")
        except Exception as e:
            print(f"Warning: Minification failed: {e}")
    
    response = Response(bundle_content, mimetype='application/javascript')
    
    # Add aggressive no-cache headers
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['Last-Modified'] = __import__('datetime').datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')
    
    return response

@app.route('/static/css/os.css')
def serve_bundled_css():
    """
    Dynamically bundle all OS CSS files in the correct load order
    This replaces loading 9+ individual CSS files
    """
    css_dir = Path(app.static_folder) / 'css'
    
    # Define load order (same as in index.html)
    css_load_order = [
        "os-base.css",
        "os-lock.css",
        "os-welcome.css",
        "os-spotlight.css",
        "os-status.css",
        "os-desktop.css",
        "os-windows.css",
        "os-dashboard.css",
        "os-taskbar.css",
        "app-standards.css"
    ]
    
    # System Apps CSS with their app IDs for scoping
    system_app_css = [
        ("os-resource-manager.css", "resource-manager"),
        ("os-virtual-file-system.css", "virtual-file-system"),
        ("os-user-app-manager.css", "user-app-manager"),
        ("os-terminal.css", "terminal"),
        ("os-system-settings.css", "system-settings")
    ]
    
    bundle_content = "/* SYPNEX OS - Dynamically Bundled CSS */\n"
    bundle_content += f"/* Generated: {__import__('datetime').datetime.now()} */\n\n"
    
    # Load main OS CSS files (unscoped)
    for css_file in css_load_order:
        file_path = css_dir / css_file
        if file_path.exists():
            try:
                bundle_content += f"/* === {css_file} === */\n"
                with open(file_path, 'r', encoding='utf-8') as f:
                    bundle_content += f.read() + "\n\n"
            except Exception as e:
                bundle_content += f"/* ERROR loading {css_file}: {str(e)} */\n\n"
        else:
            bundle_content += f"/* MISSING: {css_file} */\n\n"
    
    # Load and scope system app CSS files
    from app_utils import scope_system_app_css
    
    for css_file, app_id in system_app_css:
        file_path = css_dir / css_file
        if file_path.exists():
            try:
                bundle_content += f"/* === {css_file} (scoped to {app_id}) === */\n"
                with open(file_path, 'r', encoding='utf-8') as f:
                    css_content = f.read()
                
                # Apply CSS scoping to prevent conflicts
                scoped_css = scope_system_app_css(css_content, app_id)
                bundle_content += scoped_css + "\n\n"
            except Exception as e:
                bundle_content += f"/* ERROR loading {css_file}: {str(e)} */\n\n"
        else:
            bundle_content += f"/* MISSING: {css_file} */\n\n"
    
    response = Response(bundle_content, mimetype='text/css')
    
    # Add aggressive no-cache headers for CSS too
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.headers['Last-Modified'] = __import__('datetime').datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')
    
    return response

# Register terminal manager routes

if __name__ == '__main__':
    # Use SocketIO for WebSocket support
    managers['websocket_manager'].socketio.run(app, debug=False, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True) 
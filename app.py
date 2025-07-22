"""
Main application file for Sypnex OS
This is the refactored version that uses modular route organization
"""
from app_config import create_app, initialize_managers, initialize_system, BUILTIN_APPS
from routes import register_all_routes
from swagger_config import setup_auto_swagger
from flask import Response
from pathlib import Path

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



@app.route('/static/js/os.js')
def serve_bundled_os():
    """
    Dynamically bundle all os-*.js files in the correct load order
    This replaces loading 10+ individual JavaScript files
    """
    js_dir = Path(app.static_folder) / 'js'
    
    # Define load order (critical for dependencies)
    load_order = [
        "os-core.js",
        "os-spotlight.js", 
        "os-windows.js",
        "os-taskbar.js",
        "os-status.js",
        "os-dashboard.js",
        "os-terminal.js",
        "os-vfs.js",
        "os-websocket-server.js",
        "os-resource-manager.js",
        "os-app-manager.js",
        "os-system-settings.js",
        "os-lock.js",
        "os-init.js"  # Must be last!
    ]
    
    bundle_content = "// SYPNEX OS - Dynamically Bundled JavaScript\n"
    bundle_content += f"// Generated: {__import__('datetime').datetime.now()}\n\n"
    
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
    
    return Response(bundle_content, mimetype='application/javascript')

@app.route('/static/js/sypnex-api.js')
def serve_bundled_sypnex_api():
    """
    Dynamically bundle all sypnex-api-*.js files in the correct load order
    This replaces loading 8+ individual SypnexAPI modules
    """
    js_dir = Path(app.static_folder) / 'js'
    
    # Define load order (critical for dependencies)
    api_modules = [
        "sypnex-api-core.js",
        "sypnex-api-settings.js", 
        "sypnex-api-socket.js",
        "sypnex-api-vfs.js",
        "sypnex-api-libraries.js",
        "sypnex-api-file-explorer.js",
        "sypnex-api-terminal.js",
        "sypnex-api-logs.js",
    ]
    
    bundle_content = "// SypnexAPI - Dynamically Bundled JavaScript API\n"
    bundle_content += f"// Generated: {__import__('datetime').datetime.now()}\n\n"
    
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
    
    return Response(bundle_content, mimetype='application/javascript')

# Register terminal manager routes

if __name__ == '__main__':
    # Use SocketIO for WebSocket support
    managers['websocket_manager'].socketio.run(app, debug=False, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True) 
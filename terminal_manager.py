import os
import sys
import subprocess
import tempfile
from flask import Blueprint, request, jsonify
from command_registry import (
    CommandRegistry, BaseCommand, UserTerminalAppCommand,
    HelpCommand, ShowAppsCommand,
    ShowServicesCommand, StartServiceCommand, StopServiceCommand, 
    ServiceLogsCommand, RefreshServicesCommand, ServiceConfigCommand,
    LsCommand, CdCommand, PwdCommand, CatCommand, MvCommand, RmCommand,
    EchoCommand, TouchCommand, MkdirCommand, ClsCommand, PythonCommand,
    PipCommand
)

class TerminalManager:
    def __init__(self, user_app_manager=None, websocket_manager=None, logs_manager=None):
        self.logs_manager = logs_manager
        self.user_app_manager = user_app_manager
        self.websocket_manager = websocket_manager
        
        # Initialize command registry
        self.registry = CommandRegistry()
        
        # Create context for commands
        self.context = type('Context', (), {})()
        self.context.user_app_manager = user_app_manager
        self.context.websocket_manager = websocket_manager
        self.registry.set_context(self.context)
        
        # Register built-in commands
        self._register_builtin_commands()
        
        print("TerminalManager: Initialized with command registry")
    
    def _register_builtin_commands(self):
        """Register all built-in commands"""
        # Help command (needs registry reference)
        self.registry.register(HelpCommand(self.registry))
        
        # Show apps command (needs registry reference)
        self.registry.register(ShowAppsCommand(self.registry))
               
        # Service commands
        self.registry.register(ShowServicesCommand())
        self.registry.register(StartServiceCommand())
        self.registry.register(StopServiceCommand())
        self.registry.register(ServiceLogsCommand())
        self.registry.register(RefreshServicesCommand())
        self.registry.register(ServiceConfigCommand())
        
        # File system commands
        self.registry.register(LsCommand())
        self.registry.register(CdCommand())
        self.registry.register(PwdCommand())
        self.registry.register(CatCommand())
        self.registry.register(MvCommand())
        self.registry.register(RmCommand())
        self.registry.register(EchoCommand())
        self.registry.register(TouchCommand())
        self.registry.register(MkdirCommand())
        self.registry.register(ClsCommand())
        
        # Python execution command
        self.registry.register(PythonCommand())
        
        # Pip package management command
        self.registry.register(PipCommand())
        
        print(f"TerminalManager: Registered {len(self.registry.commands)} built-in commands")
    
    def register_routes(self, app):
        """Register Flask routes for the terminal"""
        self.blueprint = Blueprint('terminal', __name__)
        
        @self.blueprint.route('/api/terminal/execute', methods=['POST'])
        def execute_command():
            """Execute a command using the new registry system"""
            data = request.json
            command = data.get('command', '').strip()
            
            print(f"TerminalManager: Executing command: '{command}'")
            print(f"TerminalManager: Available commands: {list(self.registry.commands.keys())}")
            
            if not command:
                return jsonify({'error': 'No command provided'}), 400
            
            try:
                # Execute command using registry
                result = self.registry.execute_command(command)
                
                print(f"TerminalManager: Command result: {result}")
                
                if result.get('success', False):
                    return jsonify(result)
                else:
                    return jsonify(result), 400
                    
            except Exception as e:
                print(f"TerminalManager: Command execution error: {e}")
                return jsonify({
                    'error': f'Command execution failed: {str(e)}',
                    'command': command,
                    'success': False
                }), 500
        
        @self.blueprint.route('/api/terminal/apps')
        def get_terminal_apps():
            """Get list of available terminal apps"""
            print("TerminalManager: GET /api/terminal/apps called")
            terminal_apps = []
            
            # Get user terminal apps from registry
            for name, command in self.registry.commands.items():
                if isinstance(command, UserTerminalAppCommand):
                    terminal_apps.append({
                        'id': name,
                        'name': command.app_name,
                        'description': command.description
                    })
            
            print(f"TerminalManager: Found {len(terminal_apps)} terminal apps")
            return jsonify(terminal_apps)
        
        @self.blueprint.route('/api/terminal/commands')
        def get_commands():
            """Get list of all available commands"""
            commands = []
            
            for name, command in self.registry.commands.items():
                commands.append({
                    'name': name,
                    'help': command.get_help(),
                    'usage': command.get_usage(),
                    'aliases': command.aliases,
                    'type': 'user_app' if isinstance(command, UserTerminalAppCommand) else 'builtin'
                })
            
            return jsonify(commands)
        

        
        # Register the blueprint with the main app
        app.register_blueprint(self.blueprint)
        print("TerminalManager: Registered routes with app")
    
    def get_info(self):
        """Get terminal app info for registration"""
        return {
            'id': 'terminal',
            'name': 'Terminal',
            'icon': 'fas fa-terminal',
            'description': 'Command line interface with extensible command system',
            'keywords': ['terminal', 'command', 'cli', 'shell'],
            'template': 'apps/terminal.html',
            'type': 'System'
        }
    
    def register_command(self, command):
        """Register a new command (for services and other components to use)"""
        self.registry.register(command)
        print(f"TerminalManager: Registered new command: {command.name}")
    
    def register_function_command(self, name, handler, help_text=None, aliases=None):
        """Register a function as a command (for services and other components to use)"""
        self.registry.register_function(name, handler, help_text, aliases)
        print(f"TerminalManager: Registered function command: {name}")
    
    def execute_command(self, command_line):
        """Execute a command (for programmatic use)"""
        return self.registry.execute_command(command_line)
    
    def refresh_user_apps(self):
        """Refresh the list of user terminal apps (now handled through VFS)"""
        print("TerminalManager: User terminal apps are now handled through VFS system")
    
 
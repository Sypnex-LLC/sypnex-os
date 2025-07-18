import os
import sys
import json
import importlib.util
import io
import shlex
import threading
import tempfile
import subprocess
import time
from pathlib import Path
from contextlib import redirect_stdout, redirect_stderr
from abc import ABC, abstractmethod
from datetime import datetime
from service_manager import get_service_manager
from virtual_file_manager import get_virtual_file_manager

class BaseCommand(ABC):
    """Base class for all terminal commands"""
    
    def __init__(self, name, help_text=None, aliases=None):
        self.name = name
        self.help_text = help_text or f"Command: {name}"
        self.aliases = aliases or []
    
    @abstractmethod
    def execute(self, args, context):
        """Execute the command with given arguments and context"""
        pass
    
    def get_help(self):
        """Get help text for this command"""
        return self.help_text
    
    def get_usage(self):
        """Get usage information for this command"""
        return f"{self.name} [options]"

class CommandRegistry:
    """Registry for managing all terminal commands"""
    
    def __init__(self):
        self.commands = {}
        self.aliases = {}
        self.context = None
    
    def set_context(self, context):
        """Set the terminal context"""
        self.context = context
    
    def register(self, command):
        """Register a command instance"""
        if not isinstance(command, BaseCommand):
            raise ValueError("Command must inherit from BaseCommand")
        
        self.commands[command.name] = command
        
        # Register aliases
        for alias in command.aliases:
            self.aliases[alias] = command.name
    
    def register_function(self, name, handler, help_text=None, aliases=None):
        """Register a function as a command"""
        class FunctionCommand(BaseCommand):
            def __init__(self, name, handler, help_text, aliases):
                super().__init__(name, help_text, aliases)
                self.handler = handler
            
            def execute(self, args, context):
                return self.handler(args, context)
        
        command = FunctionCommand(name, handler, help_text, aliases)
        self.register(command)
    
    def get_command(self, name):
        """Get a command by name or alias"""
        # Check direct command name
        if name in self.commands:
            return self.commands[name]
        
        # Check aliases
        if name in self.aliases:
            return self.commands[self.aliases[name]]
        
        return None
    
    def execute_command(self, command_line):
        """Execute a command line string"""
        if not command_line.strip():
            return {'output': '', 'success': True}
        
        try:
            # Parse command line
            parts = shlex.split(command_line)
            if not parts:
                return {'output': '', 'success': True}
            
            # Handle multi-word commands like "show apps"
            command_name = parts[0]
            args = parts[1:] if len(parts) > 1 else []
            
            # Handle ./ prefix for user terminal apps
            if command_name.startswith('./'):
                command_name = command_name[2:]  # Remove ./ prefix
            
            # Try to find the command, starting with the first word
            command = self.get_command(command_name)
            
            # If not found and we have more parts, try combining them
            if not command and len(parts) > 1:
                # Try combinations like "show apps", "show apps list", etc.
                for i in range(2, len(parts) + 1):
                    combined_name = ' '.join(parts[:i])
                    # Handle ./ prefix for combined names too
                    if combined_name.startswith('./'):
                        combined_name = combined_name[2:]
                    command = self.get_command(combined_name)
                    if command:
                        command_name = combined_name
                        args = parts[i:] if i < len(parts) else []
                        break
            
            if not command:
                return {
                    'error': f'Unknown command: {command_name}. Type "help" for available commands.',
                    'success': False
                }
            
            # Execute command
            result = command.execute(args, self.context)
            
            # Ensure result is a dict
            if isinstance(result, str):
                result = {'output': result, 'success': True}
            elif not isinstance(result, dict):
                result = {'output': str(result), 'success': True}
            
            # Add command name to result
            result['command'] = command_line
            return result
            
        except Exception as e:
            return {
                'error': f'Command execution failed: {str(e)}',
                'command': command_line,
                'success': False
            }
    
    def get_all_commands(self):
        """Get all registered commands"""
        return list(self.commands.keys())
    
    def get_help_text(self):
        """Get help text for all commands"""
        help_text = "Available Commands:\n"
        help_text += "==================\n\n"
        
        # Group commands by type
        built_in = []
        user_apps = []
        
        for name, command in self.commands.items():
            if isinstance(command, UserTerminalAppCommand):
                user_apps.append((name, command))
            else:
                built_in.append((name, command))
        
        # Built-in commands
        if built_in:
            help_text += "Built-in Commands:\n"
            help_text += "------------------\n"
            for name, command in sorted(built_in):
                help_text += f"{name:<20} - {command.get_help()}\n"
            help_text += "\n"
        
        # User terminal apps
        if user_apps:
            help_text += "Terminal Apps:\n"
            help_text += "--------------\n"
            for name, command in sorted(user_apps):
                help_text += f"./{name:<20} - {command.get_help()}\n"
            help_text += "\n"
        
        return help_text

class TerminalContext:
    """Context for terminal commands"""
    
    def __init__(self):
        self.current_directory = os.getcwd()
        self.current_vfs_directory = '/'  # Virtual file system current directory
        self.environment = os.environ.copy()
        self.user_apps_dir = Path("user_apps")

class HelpCommand(BaseCommand):
    """Built-in help command"""
    
    def __init__(self, registry):
        super().__init__('help', 'Show available commands')
        self.registry = registry
    
    def execute(self, args, context):
        if args:
            # Show help for specific command
            command_name = args[0]
            command = self.registry.get_command(command_name)
            if command:
                help_text = f"Help for '{command_name}':\n"
                help_text += "=" * (len(command_name) + 10) + "\n\n"
                help_text += command.get_help() + "\n\n"
                help_text += f"Usage: {command.get_usage()}\n"
                return {'output': help_text, 'success': True}
            else:
                return {'error': f'Unknown command: {command_name}', 'success': False}
        else:
            # Show general help
            return {'output': self.registry.get_help_text(), 'success': True}

class ShowAppsCommand(BaseCommand):
    """Built-in show apps command"""
    
    def __init__(self, registry):
        super().__init__('show apps', 'List available terminal apps')
        self.registry = registry
    
    def execute(self, args, context):
        user_apps = []
        
        # Get user terminal apps from registry
        for name, command in self.registry.commands.items():
            if isinstance(command, UserTerminalAppCommand):
                user_apps.append({
                    'id': name,
                    'name': command.app_name,
                    'description': command.description
                })
        
        if not user_apps:
            output = "No terminal apps found.\n"
            output += "To create a terminal app, add a .py file to user_apps/ with 'terminal_app' type.\n"
        else:
            output = "Available terminal apps:\n"
            output += "=======================\n"
            for app in user_apps:
                output += f"./{app['id']} - {app['name']}\n"
                if app.get('description'):
                    output += f"    {app['description']}\n"
                output += "\n"
        
        return {'output': output, 'success': True}

class UserTerminalAppCommand(BaseCommand):
    """Command wrapper for user terminal apps"""
    
    def __init__(self, app_id, app_name, description, file_path):
        super().__init__(app_id, description or f"Terminal app: {app_name}")
        self.app_id = app_id
        self.app_name = app_name
        self.description = description
        self.file_path = file_path
    
    def execute(self, args, context):
        """Execute the user terminal app"""
        try:
            # Capture stdout and stderr
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()
            
            # Mock input function to avoid stdin issues
            def mock_input(prompt=""):
                return "Test User"  # Return a default value for input()
            
            # Import and execute the module
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                # Clear the module from cache if it exists to enable hot reloading
                if self.app_id in sys.modules:
                    del sys.modules[self.app_id]
                
                # Load the module
                spec = importlib.util.spec_from_file_location(self.app_id, self.file_path)
                module = importlib.util.module_from_spec(spec)
                
                # Replace input function with mock
                module.input = mock_input
                
                # Execute the module
                spec.loader.exec_module(module)
                
                # If the module has a main function, call it
                if hasattr(module, 'main'):
                    module.main()
            
            # Get captured output
            output = stdout_capture.getvalue()
            stderr_output = stderr_capture.getvalue()
            
            if stderr_output:
                output += f"\nSTDERR:\n{stderr_output}"
            
            return {'output': output, 'success': True}
            
        except Exception as e:
            return {'error': f'Failed to execute terminal app "{self.app_id}": {str(e)}', 'success': False}
    
    def get_usage(self):
        return f"./{self.app_id}"

class ShowServicesCommand(BaseCommand):
    """Built-in show services command"""
    
    def __init__(self):
        super().__init__('show services', 'List all available services')
    
    def execute(self, args, context):
        try:
            service_manager = get_service_manager()
            services = service_manager.get_all_services()
            
            if not services:
                output = "No services found.\n"
                output += "Services are Python files ending with '_service.py' in the services/ directory.\n"
            else:
                output = "Available Services:\n"
                output += "==================\n\n"
                
                for service in services:
                    status_icon = "🟢" if service['running'] else "🔴"
                    output += f"{status_icon} {service['name']} ({service['id']})\n"
                    if service['description']:
                        output += f"    {service['description']}\n"
                    output += f"    Version: {service['version']}\n"
                    output += f"    Author: {service['author']}\n"
                    output += f"    Status: {'Running' if service['running'] else 'Stopped'}\n"
                    if service['running'] and service['uptime']:
                        output += f"    Uptime: {int(service['uptime'])} seconds\n"
                    if service['last_error']:
                        output += f"    Last Error: {service['last_error']}\n"
                    output += "\n"
            
            return {'output': output, 'success': True}
            
        except Exception as e:
            return {'error': f'Failed to load services: {str(e)}', 'success': False}

class StartServiceCommand(BaseCommand):
    """Built-in start service command"""
    
    def __init__(self):
        super().__init__('start service', 'Start a service')
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: start service <service_id>', 'success': False}
        
        service_id = args[0]
        
        try:
            service_manager = get_service_manager()
            success = service_manager.start_service(service_id)
            
            if success:
                output = f"Service '{service_id}' started successfully!\n"
                output += "Use 'show services' to view service status."
                return {'output': output, 'success': True}
            else:
                return {'error': f'Failed to start service: {service_id}', 'success': False}
                
        except Exception as e:
            return {'error': f'Failed to start service: {str(e)}', 'success': False}

class StopServiceCommand(BaseCommand):
    """Built-in stop service command"""
    
    def __init__(self):
        super().__init__('stop service', 'Stop a service')
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: stop service <service_id>', 'success': False}
        
        service_id = args[0]
        
        try:
            service_manager = get_service_manager()
            success = service_manager.stop_service(service_id)
            
            if success:
                output = f"Service '{service_id}' stopped successfully!\n"
                output += "Use 'show services' to view service status."
                return {'output': output, 'success': True}
            else:
                return {'error': f'Failed to stop service: {service_id}', 'success': False}
                
        except Exception as e:
            return {'error': f'Failed to stop service: {str(e)}', 'success': False}

class ServiceLogsCommand(BaseCommand):
    """Built-in service logs command"""
    
    def __init__(self):
        super().__init__('service logs', 'Show logs for a service')
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: service logs <service_id> [limit]', 'success': False}
        
        service_id = args[0]
        limit = int(args[1]) if len(args) > 1 else 20
        
        try:
            service_manager = get_service_manager()
            logs = service_manager.get_service_logs(service_id, limit)
            
            if not logs:
                output = f"No logs found for service '{service_id}'.\n"
            else:
                output = f"Logs for service '{service_id}':\n"
                output += "=" * (len(service_id) + 20) + "\n\n"
                
                for log in logs:
                    timestamp = log['timestamp'].replace('T', ' ').replace('Z', '')
                    level_icon = "ℹ️" if log['level'] == 'INFO' else "❌"
                    output += f"{level_icon} [{timestamp}] {log['message']}\n"
            
            return {'output': output, 'success': True}
            
        except Exception as e:
            return {'error': f'Failed to load service logs: {str(e)}', 'success': False}

class RefreshServicesCommand(BaseCommand):
    """Command to refresh the list of available services"""
    
    def __init__(self):
        super().__init__('refresh services', 'Refresh the list of available services')
    
    def execute(self, args, context):
        service_manager = get_service_manager()
        service_manager.refresh_services()
        return {
            'output': 'Services refreshed successfully',
            'success': True
        }

class ServiceConfigCommand(BaseCommand):
    """Command to view and modify service configurations"""
    
    def __init__(self):
        super().__init__('service config', 'View and modify service configurations')
    
    def execute(self, args, context):
        if not args:
            return {
                'error': 'Usage: service config <service_id> [set <key> <value>]',
                'success': False
            }
        
        service_id = args[0]
        service_manager = get_service_manager()
        
        # Check if service exists
        if service_id not in service_manager.services:
            return {
                'error': f'Service "{service_id}" not found',
                'success': False
            }
        
        # If no additional args, show current config
        if len(args) == 1:
            return self._show_config(service_id, service_manager)
        
        # Handle set command
        if len(args) >= 4 and args[1] == 'set':
            key = args[2]
            value_str = args[3]
            return self._set_config(service_id, key, value_str, service_manager)
        
        return {
            'error': 'Usage: service config <service_id> [set <key> <value>]',
            'success': False
        }
    
    def _show_config(self, service_id, service_manager):
        """Show current configuration for a service"""
        config = service_manager.config_manager.load_config(service_id)
        
        if not config:
            return {
                'output': f'No configuration found for service "{service_id}"',
                'success': True
            }
        
        # Format config as JSON for display
        import json
        formatted_config = json.dumps(config, indent=2)
        
        return {
            'output': f'Configuration for service "{service_id}":\n{formatted_config}',
            'success': True
        }
    
    def _set_config(self, service_id, key, value_str, service_manager):
        """Set a configuration value for a service"""
        try:
            # Parse the value (handle different types)
            value = self._parse_value(value_str)
            
            # Handle dot notation for nested keys
            if '.' in key:
                success = self._set_nested_config(service_id, key, value, service_manager)
            else:
                success = service_manager.config_manager.update_config(service_id, {key: value})
            
            if success:
                return {
                    'output': f'Updated configuration for service "{service_id}": {key} = {value}',
                    'success': True
                }
            else:
                return {
                    'error': f'Failed to update configuration for service "{service_id}"',
                    'success': False
                }
                
        except ValueError as e:
            return {
                'error': f'Invalid value: {e}',
                'success': False
            }
    
    def _parse_value(self, value_str):
        """Parse a string value into appropriate type"""
        # Remove quotes if present
        if (value_str.startswith('"') and value_str.endswith('"')) or \
           (value_str.startswith("'") and value_str.endswith("'")):
            return value_str[1:-1]
        
        # Try to parse as boolean
        if value_str.lower() in ('true', 'false'):
            return value_str.lower() == 'true'
        
        # Try to parse as number
        try:
            if '.' in value_str:
                return float(value_str)
            else:
                return int(value_str)
        except ValueError:
            # Return as string
            return value_str
    
    def _set_nested_config(self, service_id, key_path, value, service_manager):
        """Set a nested configuration value using dot notation"""
        try:
            # Load current config
            config = service_manager.config_manager.load_config(service_id)
            
            # Navigate to the nested location
            keys = key_path.split('.')
            current = config
            
            # Navigate to the parent of the target key
            for key in keys[:-1]:
                if key not in current:
                    return False  # Can't create new keys, only modify existing ones
                current = current[key]
            
            # Set the value
            current[keys[-1]] = value
            
            # Save the updated config
            return service_manager.config_manager.save_config(service_id, config)
            
        except Exception:
            return False

# File System Commands for Virtual File System

class LsCommand(BaseCommand):
    """List directory contents (ls command)"""
    
    def __init__(self):
        super().__init__('ls', 'List directory contents', ['dir', 'list'])
    
    def execute(self, args, context):
        try:
            # Parse arguments
            path = getattr(context, 'current_vfs_directory', '/')
            show_hidden = False
            long_format = False
            
            i = 0
            while i < len(args):
                if args[i].startswith('-'):
                    if 'a' in args[i]:
                        show_hidden = True
                    if 'l' in args[i]:
                        long_format = True
                    i += 1
                else:
                    path = args[i]
                    i += 1
            
            # Get virtual file manager
            vfs = get_virtual_file_manager()
            
            # List directory contents
            items = vfs.list_directory(path)
            
            if not items:
                return {'output': f'Directory {path} is empty', 'success': True}
            
            # Format output
            if long_format:
                output = f"total {len(items)}\n"
                for item in items:
                    # Format size
                    if item['is_directory']:
                        size = "0"
                    else:
                        size = str(item['size'])
                    
                    # Format date
                    date_str = item['updated_at'].split('T')[0] if item['updated_at'] else 'Unknown'
                    
                    # Add file type indicators
                    name = item['name']
                    if item['is_directory']:
                        name += "/"
                    elif name.endswith('.py'):
                        name += "*"  # Executable indicator
                    
                    output += f"{size} {date_str} {name}\n"
            else:
                # Simple format - organize by type
                directories = []
                files = []
                
                for item in items:
                    if item['is_directory']:
                        directories.append(item['name'])
                    else:
                        files.append(item['name'])
                
                # Sort both lists
                directories.sort()
                files.sort()
                
                # Combine with proper spacing
                all_items = directories + files
                if all_items:
                    # Calculate columns for better formatting
                    max_width = max(len(name) for name in all_items) if all_items else 0
                    terminal_width = 80  # Assume 80 columns
                    columns = max(1, terminal_width // (max_width + 2))
                    
                    # Format in columns
                    output = ""
                    for i in range(0, len(all_items), columns):
                        row = all_items[i:i + columns]
                        formatted_row = []
                        for name in row:
                            if name in directories:
                                # Directory - add trailing slash
                                formatted_row.append(f"{name}/")
                            else:
                                # File - add executable indicator only
                                if name.endswith('.py'):
                                    formatted_row.append(f"{name}*")  # Executable
                                else:
                                    formatted_row.append(name)
                        output += "  ".join(formatted_row) + "\n"
                else:
                    output = ""
            
            return {'output': output, 'success': True}
            
        except Exception as e:
            return {'error': f'Error listing directory: {str(e)}', 'success': False}

class CdCommand(BaseCommand):
    """Change directory (cd command)"""
    
    def __init__(self):
        super().__init__('cd', 'Change directory')
    
    def execute(self, args, context):
        try:
            if not args:
                # cd without args goes to home (root in our case)
                new_path = '/'
            else:
                path = args[0]
                
                if path == '~':
                    new_path = '/'
                elif path == '-':
                    # TODO: Implement previous directory tracking
                    return {'error': 'Previous directory not implemented yet', 'success': False}
                elif path.startswith('/'):
                    # Absolute path
                    new_path = path
                else:
                    # Relative path
                    current = getattr(context, 'current_vfs_directory', '/')
                    if current.endswith('/'):
                        new_path = current + path
                    else:
                        new_path = current + '/' + path
            
            # Normalize path
            vfs = get_virtual_file_manager()
            
            # Handle .. (parent directory)
            if '..' in new_path:
                parts = new_path.split('/')
                normalized_parts = []
                for part in parts:
                    if part == '..':
                        if normalized_parts:
                            normalized_parts.pop()
                    elif part and part != '.':
                        normalized_parts.append(part)
                new_path = '/' + '/'.join(normalized_parts) if normalized_parts else '/'
            
            # Check if directory exists
            items = vfs.list_directory(new_path)
            
            # Update context
            context.current_vfs_directory = new_path
            
            return {'output': f'Changed to directory: {new_path}', 'success': True}
            
        except Exception as e:
            return {'error': f'Error changing directory: {str(e)}', 'success': False}

class PwdCommand(BaseCommand):
    """Print working directory (pwd command)"""
    
    def __init__(self):
        super().__init__('pwd', 'Print working directory')
    
    def execute(self, args, context):
        current = getattr(context, 'current_vfs_directory', '/')
        return {'output': current, 'success': True}

class CatCommand(BaseCommand):
    """Display file contents (cat command)"""
    
    def __init__(self):
        super().__init__('cat', 'Display file contents')
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: cat <file>', 'success': False}
        
        try:
            file_path = args[0]
            
            # Handle relative paths
            if not file_path.startswith('/'):
                current = getattr(context, 'current_vfs_directory', '/')
                if current.endswith('/'):
                    file_path = current + file_path
                else:
                    file_path = current + '/' + file_path
            
            vfs = get_virtual_file_manager()
            file_data = vfs.read_file(file_path)
            
            if not file_data:
                return {'error': f'File not found: {file_path}', 'success': False}
            
            if file_data['is_directory']:
                return {'error': f'{file_path} is a directory', 'success': False}
            
            # Convert content to string
            content = file_data['content'].decode('utf-8') if file_data['content'] else ''
            return {'output': content, 'success': True}
            
        except Exception as e:
            return {'error': f'Error reading file: {str(e)}', 'success': False}

class MvCommand(BaseCommand):
    """Move/rename files and directories (mv command)"""
    
    def __init__(self):
        super().__init__('mv', 'Move or rename files and directories')
    
    def execute(self, args, context):
        if len(args) < 2:
            return {'error': 'Usage: mv <source> <destination>', 'success': False}
        
        try:
            source = args[0]
            destination = args[1]
            
            # Handle relative paths
            current = getattr(context, 'current_vfs_directory', '/')
            
            if not source.startswith('/'):
                if current.endswith('/'):
                    source = current + source
                else:
                    source = current + '/' + source
            
            if not destination.startswith('/'):
                if current.endswith('/'):
                    destination = current + destination
                else:
                    destination = current + '/' + destination
            
            vfs = get_virtual_file_manager()
            
            # Read source file/directory
            if vfs._is_directory(source):
                # For directories, use get_file_info
                source_data = vfs.get_file_info(source)
                if not source_data:
                    return {'error': f'Source not found: {source}', 'success': False}
                print(f"MV: Source directory data: {source_data}")
                
                # Check if destination exists
                dest_data = vfs.get_file_info(destination)
                if dest_data:
                    return {'error': f'Destination already exists: {destination}', 'success': False}
                
                # Create new directory at destination
                print(f"MV: Creating directory at {destination}")
                success = vfs.create_directory(destination)
            else:
                # For files, use read_file to get content
                source_data = vfs.read_file(source)
                if not source_data:
                    return {'error': f'Source not found: {source}', 'success': False}
                print(f"MV: Source file data: {source_data}")
                
                # Check if destination exists
                dest_data = vfs.get_file_info(destination)
                if dest_data:
                    return {'error': f'Destination already exists: {destination}', 'success': False}
                
                # Create new file at destination with content
                content = source_data.get('content', b'')
                print(f"MV: Creating file at {destination} with content length {len(content)}")
                success = vfs.create_file(destination, content)
            
            if not success:
                return {'error': f'Failed to create destination: {destination}', 'success': False}
            
            # Delete source
            success = vfs.delete_path(source)
            if not success:
                # If we failed to delete source, try to clean up the destination
                vfs.delete_path(destination)
                return {'error': f'Failed to delete source: {source}', 'success': False}
            
            return {'output': f'Moved {source} to {destination}', 'success': True}
            
        except Exception as e:
            return {'error': f'Error moving file: {str(e)}', 'success': False}

class RmCommand(BaseCommand):
    """Remove files and directories (rm command)"""
    
    def __init__(self):
        super().__init__('rm', 'Remove files and directories')
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: rm <file> [file2] ...', 'success': False}
        
        try:
            recursive = False
            
            # Parse options
            files_to_delete = []
            for arg in args:
                if arg == '-r' or arg == '-rf':
                    recursive = True
                else:
                    files_to_delete.append(arg)
            
            if not files_to_delete:
                return {'error': 'No files specified for deletion', 'success': False}
            
            vfs = get_virtual_file_manager()
            current = getattr(context, 'current_vfs_directory', '/')
            
            deleted_count = 0
            errors = []
            
            for file_path in files_to_delete:
                # Handle relative paths
                if not file_path.startswith('/'):
                    if current.endswith('/'):
                        file_path = current + file_path
                    else:
                        file_path = current + '/' + file_path
                
                # Check if file/directory exists
                file_data = vfs.get_file_info(file_path)
                if not file_data:
                    errors.append(f'File not found: {file_path}')
                    continue
                
                # Check if trying to delete directory without -r
                if file_data['is_directory'] and not recursive:
                    errors.append(f'Cannot remove directory {file_path}: use -r for recursive deletion')
                    continue
                
                # Delete the file/directory
                success = vfs.delete_path(file_path)
                if success:
                    deleted_count += 1
                else:
                    errors.append(f'Failed to delete: {file_path}')
            
            # Build output
            output = f'Deleted {deleted_count} item(s)\n'
            if errors:
                output += '\nErrors:\n' + '\n'.join(errors)
            
            return {'output': output, 'success': True}
            
        except Exception as e:
            return {'error': f'Error removing files: {str(e)}', 'success': False}

class EchoCommand(BaseCommand):
    """Echo text to terminal or file (echo command)"""
    
    def __init__(self):
        super().__init__('echo', 'Display a line of text or write to file')
    
    def execute(self, args, context):
        if not args:
            return {'output': '', 'success': True}
        
        try:
            # Parse arguments
            text_parts = []
            redirect_to_file = None
            append_mode = False
            
            i = 0
            while i < len(args):
                if args[i] == '>':
                    if i + 1 < len(args):
                        redirect_to_file = args[i + 1]
                        i += 2
                    else:
                        return {'error': 'No file specified for redirection', 'success': False}
                elif args[i] == '>>':
                    if i + 1 < len(args):
                        redirect_to_file = args[i + 1]
                        append_mode = True
                        i += 2
                    else:
                        return {'error': 'No file specified for redirection', 'success': False}
                else:
                    text_parts.append(args[i])
                    i += 1
            
            # Join text parts
            text = ' '.join(text_parts)
            
            # Handle file redirection
            if redirect_to_file:
                # Handle relative paths
                if not redirect_to_file.startswith('/'):
                    current = getattr(context, 'current_vfs_directory', '/')
                    if current.endswith('/'):
                        redirect_to_file = current + redirect_to_file
                    else:
                        redirect_to_file = current + '/' + redirect_to_file
                
                print(f"ECHO: Writing to file: {redirect_to_file}")
                print(f"ECHO: Current VFS directory: {getattr(context, 'current_vfs_directory', '/')}")
                
                vfs = get_virtual_file_manager()
                
                # Check if file exists
                existing_file = vfs.get_file_info(redirect_to_file)
                
                if existing_file and existing_file['is_directory']:
                    return {'error': f'{redirect_to_file} is a directory', 'success': False}
                
                if append_mode and existing_file:
                    # Append to existing file - need to read the actual content
                    file_data = vfs.read_file(redirect_to_file)
                    if file_data:
                        existing_content = file_data['content'].decode('utf-8') if file_data['content'] else ''
                        new_content = existing_content + text + '\n'
                        success = vfs.write_file(redirect_to_file, new_content.encode('utf-8'))
                    else:
                        success = vfs.create_file(redirect_to_file, text.encode('utf-8'))
                elif existing_file:
                    # Overwrite existing file
                    success = vfs.write_file(redirect_to_file, text.encode('utf-8'))
                else:
                    # Create new file
                    success = vfs.create_file(redirect_to_file, text.encode('utf-8'))
                
                if success:
                    action = 'appended to' if append_mode else 'written to'
                    return {'output': f'Text {action} {redirect_to_file}', 'success': True}
                else:
                    return {'error': f'Failed to write to {redirect_to_file}', 'success': False}
            else:
                # Just echo to terminal
                return {'output': text, 'success': True}
                
        except Exception as e:
            return {'error': f'Error with echo command: {str(e)}', 'success': False}

class TouchCommand(BaseCommand):
    """Create empty files or update timestamps (touch command)"""
    
    def __init__(self):
        super().__init__('touch', 'Create empty files or update timestamps')
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: touch <file> [file2] ...', 'success': False}
        
        try:
            vfs = get_virtual_file_manager()
            current = getattr(context, 'current_vfs_directory', '/')
            
            created_count = 0
            updated_count = 0
            errors = []
            
            for file_path in args:
                # Handle relative paths
                if not file_path.startswith('/'):
                    if current.endswith('/'):
                        file_path = current + file_path
                    else:
                        file_path = current + '/' + file_path
                
                # Check if file already exists
                existing_file = vfs.get_file_info(file_path)
                
                if existing_file:
                    if existing_file['is_directory']:
                        errors.append(f'Cannot touch directory: {file_path}')
                        continue
                    else:
                        # Update timestamp by rewriting the same content
                        success = vfs.write_file(file_path, existing_file['content'] or b'')
                        if success:
                            updated_count += 1
                        else:
                            errors.append(f'Failed to update timestamp: {file_path}')
                else:
                    # Create new empty file
                    success = vfs.create_file(file_path, b'')
                    if success:
                        created_count += 1
                    else:
                        errors.append(f'Failed to create file: {file_path}')
            
            # Build output
            output_parts = []
            if created_count > 0:
                output_parts.append(f'Created {created_count} file(s)')
            if updated_count > 0:
                output_parts.append(f'Updated {updated_count} file(s)')
            
            output = '; '.join(output_parts) if output_parts else 'No files processed'
            
            if errors:
                output += '\n\nErrors:\n' + '\n'.join(errors)
            
            return {'output': output, 'success': True}
            
        except Exception as e:
            return {'error': f'Error with touch command: {str(e)}', 'success': False}

class MkdirCommand(BaseCommand):
    """Create directories (mkdir command)"""
    
    def __init__(self):
        super().__init__('mkdir', 'Create directories')
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: mkdir <directory> [directory2] ...', 'success': False}
        
        try:
            vfs = get_virtual_file_manager()
            current = getattr(context, 'current_vfs_directory', '/')
            
            created_count = 0
            errors = []
            
            for dir_path in args:
                # Handle relative paths
                if not dir_path.startswith('/'):
                    if current.endswith('/'):
                        dir_path = current + dir_path
                    else:
                        dir_path = current + '/' + dir_path
                
                # Check if directory already exists
                existing_dir = vfs.get_file_info(dir_path)
                if existing_dir:
                    if existing_dir['is_directory']:
                        errors.append(f'Directory already exists: {dir_path}')
                    else:
                        errors.append(f'File already exists: {dir_path}')
                    continue
                
                # Create the directory
                success = vfs.create_directory(dir_path)
                if success:
                    created_count += 1
                else:
                    errors.append(f'Failed to create directory: {dir_path}')
            
            # Build output
            if created_count > 0:
                output = f'Created {created_count} directory(ies)'
            else:
                output = 'No directories created'
            
            if errors:
                output += '\n\nErrors:\n' + '\n'.join(errors)
            
            return {'output': output, 'success': True}
            
        except Exception as e:
            return {'error': f'Error with mkdir command: {str(e)}', 'success': False}

class ClsCommand(BaseCommand):
    """Clear terminal screen (cls command)"""
    
    def __init__(self):
        super().__init__('cls', 'Clear terminal screen', ['clear'])
    
    def execute(self, args, context):
        # Return a special result that the frontend can interpret as a clear command
        return {'output': '', 'success': True, 'clear_screen': True} 

class PythonCommand(BaseCommand):
    """Execute Python code from VFS files with real-time output"""
    
    def __init__(self):
        super().__init__('python', 'Execute Python code from file or inline (runs in background)')
        # Track running processes
        self.running_processes = {}
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: python <file> or python -c "code"', 'success': False}
        
        try:
            if args[0] == '--stop' and len(args) > 1:
                # Stop specific process
                execution_id = args[1]
                if self.stop_process(execution_id):
                    return {'output': f'Stopped Python process: {execution_id}', 'success': True}
                else:
                    return {'error': f'Process not found: {execution_id}', 'success': False}
            elif args[0] == '--stop-all':
                # Stop all processes
                count = len(self.running_processes)
                self.stop_all_processes()
                return {'output': f'Stopped {count} Python processes', 'success': True}
            elif args[0] == '--list':
                # List running processes
                if self.running_processes:
                    process_list = '\n'.join([f"  {exec_id}" for exec_id in self.running_processes.keys()])
                    return {'output': f'Running Python processes:\n{process_list}', 'success': True}
                else:
                    return {'output': 'No Python processes running', 'success': True}
            elif args[0] == '-c' and len(args) > 1:
                # Inline code execution
                code = ' '.join(args[1:])
                return self._execute_inline(code, context)
            else:
                # File execution
                file_path = args[0]
                script_args = args[1:] if len(args) > 1 else []  # Get remaining arguments
                return self._execute_file(file_path, script_args, context)
                
        except Exception as e:
            return {'error': f'Python execution failed: {str(e)}', 'success': False}
    
    def _execute_inline(self, code, context):
        """Execute inline Python code"""
        execution_id = f"python_inline_{int(time.time())}_{os.getpid()}"
        
        # Get websocket manager from context if available
        websocket_manager = getattr(context, 'websocket_manager', None)
        
        # Start background execution
        thread = threading.Thread(
            target=self._execute_in_background,
            args=(code, [], execution_id, context, websocket_manager),  # Empty args for inline
            daemon=True
        )
        thread.start()
        
        return {
            'output': f'Python inline execution started (ID: {execution_id})\n',
            'execution_id': execution_id,
            'success': True,
            'background': True
        }
    
    def _execute_file(self, file_path, script_args, context):
        """Execute Python code from a VFS file"""
        # Handle relative paths (like your existing commands)
        if not file_path.startswith('/'):
            current = getattr(context, 'current_vfs_directory', '/')
            if current.endswith('/'):
                file_path = current + file_path
            else:
                file_path = current + '/' + file_path
        
        # Read from VFS
        vfs = get_virtual_file_manager()
        file_data = vfs.read_file(file_path)
        
        if not file_data:
            return {'error': f'File not found: {file_path}', 'success': False}
        
        if file_data['is_directory']:
            return {'error': f'{file_path} is a directory', 'success': False}
        
        # Get Python content
        content = file_data['content'].decode('utf-8') if file_data['content'] else ''
        
        # Start execution in background thread
        execution_id = f"python_{int(time.time())}_{os.getpid()}"
        
        # Get websocket manager from context if available
        websocket_manager = getattr(context, 'websocket_manager', None)
        
        # Start background execution
        thread = threading.Thread(
            target=self._execute_in_background,
            args=(content, script_args, execution_id, context, websocket_manager),
            daemon=True
        )
        thread.start()
        
        return {
            'output': f'Python execution started (ID: {execution_id})\n',
            'execution_id': execution_id,
            'success': True,
            'background': True  # Signal to terminal this is background execution
        }
    
    def _execute_in_background(self, code, script_args, execution_id, context, websocket_manager):
        """Execute Python code in background thread with WebSocket output"""
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Build command with arguments
            cmd = ['python', temp_file] + script_args
            
            # Start subprocess
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Track the process
            self.running_processes[execution_id] = process
            
            # Stream output to WebSocket
            while process.poll() is None:
                stdout_line = process.stdout.readline()
                stderr_line = process.stderr.readline()
                
                if stdout_line:
                    self._send_websocket_output(execution_id, stdout_line.strip(), 'stdout', websocket_manager)
                
                if stderr_line:
                    self._send_websocket_output(execution_id, stderr_line.strip(), 'stderr', websocket_manager)
            
            # Get final output
            stdout, stderr = process.communicate()
            
            # Send final output
            if stdout:
                for line in stdout.splitlines():
                    if line.strip():
                        self._send_websocket_output(execution_id, line.strip(), 'stdout', websocket_manager)
            
            if stderr:
                for line in stderr.splitlines():
                    if line.strip():
                        self._send_websocket_output(execution_id, line.strip(), 'stderr', websocket_manager)
            
            # Send completion message
            self._send_websocket_output(
                execution_id, 
                f"\n[Python execution completed with exit code: {process.returncode}]", 
                'completion',
                websocket_manager
            )
            
        except Exception as e:
            self._send_websocket_output(execution_id, f"Error: {str(e)}", 'error', websocket_manager)
        finally:
            # Cleanup
            try:
                # Remove from tracking
                if execution_id in self.running_processes:
                    del self.running_processes[execution_id]
                # Delete temporary file
                os.unlink(temp_file)
            except:
                pass
    
    def _send_websocket_output(self, execution_id, output, output_type, websocket_manager=None):
        """Send output to WebSocket for real-time terminal display"""
        try:
            # Use provided websocket_manager or try to get from Flask context
            if websocket_manager:
                websocket_manager.broadcast_to_room('terminal', 'terminal_output', {
                    'execution_id': execution_id,
                    'output': output,
                    'type': output_type,
                    'timestamp': datetime.now().isoformat()
                })
            else:
                # Fallback to Flask context
                from flask import current_app
                if hasattr(current_app, 'websocket_manager'):
                    current_app.websocket_manager.broadcast_to_room('terminal', 'terminal_output', {
                        'execution_id': execution_id,
                        'output': output,
                        'type': output_type,
                        'timestamp': datetime.now().isoformat()
                    })
        except Exception as e:
            print(f"WebSocket output error: {e}")
    
    def stop_process(self, execution_id):
        """Stop a running Python process"""
        if execution_id in self.running_processes:
            process = self.running_processes[execution_id]
            try:
                process.terminate()
                # Wait a bit for graceful termination
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't terminate gracefully
                process.kill()
            except Exception as e:
                print(f"Error stopping process {execution_id}: {e}")
            finally:
                # Remove from tracking
                if execution_id in self.running_processes:
                    del self.running_processes[execution_id]
            return True
        return False
    
    def stop_all_processes(self):
        """Stop all running Python processes"""
        execution_ids = list(self.running_processes.keys())
        for execution_id in execution_ids:
            self.stop_process(execution_id)
    
    def get_usage(self):
        return "python <file> | python -c \"code\" | python --stop <id> | python --stop-all | python --list"
    
    def get_help(self):
        return "Execute Python code. Scripts run in background and continue after terminal closes. Use --list to see running processes, --stop to terminate." 

class PipCommand(BaseCommand):
    """Install Python packages using pip with VFS persistence"""
    
    def __init__(self):
        super().__init__('pip', 'Install Python packages using pip with VFS persistence', ['pip3'])
    
    def execute(self, args, context):
        if not args:
            return {'error': 'Usage: pip install <package> [package2] ... | pip load <file> | pip list | pip uninstall <package> | pip show <package>', 'success': False}
        
        try:
            if args[0] == 'install' and len(args) > 1:
                packages = args[1:]
                return self._install_packages(packages, context)
            elif args[0] == 'load' and len(args) > 1:
                filename = args[1]
                return self._load_requirements(filename, context)
            elif args[0] == 'list':
                return self._list_packages(context)
            elif args[0] == 'uninstall' and len(args) > 1:
                packages = args[1:]
                return self._uninstall_packages(packages, context)
            elif args[0] == 'show' and len(args) > 1:
                package = args[1]
                return self._show_package(package, context)
            else:
                return {'error': 'Usage: pip install <package> | pip load <file> | pip list | pip uninstall <package> | pip show <package>', 'success': False}
                
        except Exception as e:
            return {'error': f'Pip command failed: {str(e)}', 'success': False}
    
    def _install_packages(self, packages, context):
        """Install packages using pip and auto-save to VFS"""
        try:
            # Capture stdout and stderr
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()
            
            # Build pip command
            pip_cmd = [sys.executable, '-m', 'pip', 'install'] + packages
            
            # Run pip install
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                result = subprocess.run(
                    pip_cmd,
                    capture_output=True,
                    text=True,
                    check=False  # Don't raise exception on non-zero exit
                )
            
            output = stdout_capture.getvalue()
            stderr_output = stderr_capture.getvalue()
            
            if result.returncode == 0:
                success_msg = f"Successfully installed: {', '.join(packages)}\n"
                if output:
                    success_msg += f"\nOutput:\n{output}"
                
                # Auto-save to VFS
                try:
                    vfs = get_virtual_file_manager()
                    freeze_result = subprocess.run(
                        [sys.executable, '-m', 'pip', 'freeze'],
                        capture_output=True,
                        text=True,
                        check=True
                    )
                    
                    # Save to persistent location in VFS
                    vfs.create_file("/user_requirements.txt", freeze_result.stdout.encode('utf-8'))
                    success_msg += "\n✅ Auto-saved requirements to /user_requirements.txt"
                    
                except Exception as e:
                    success_msg += f"\n⚠️ Warning: Could not auto-save requirements: {e}"
                
                return {'output': success_msg, 'success': True}
            else:
                error_msg = f"Failed to install packages: {', '.join(packages)}\n"
                if stderr_output:
                    error_msg += f"\nError:\n{stderr_output}"
                if output:
                    error_msg += f"\nOutput:\n{output}"
                return {'error': error_msg, 'success': False}
                
        except Exception as e:
            return {'error': f'Installation failed: {str(e)}', 'success': False}
    

    
    def _load_requirements(self, filename, context):
        """Install packages from requirements file in VFS"""
        try:
            # Read from VFS
            vfs = get_virtual_file_manager()
            file_data = vfs.read_file(f"/{filename}")
            
            if not file_data:
                return {'error': f'Requirements file not found: /{filename}', 'success': False}
            
            # Create temporary requirements file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(file_data['content'].decode('utf-8'))
                temp_file = f.name
            
            try:
                result = subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', '-r', temp_file],
                    capture_output=True,
                    text=True,
                    check=False
                )
                
                if result.returncode == 0:
                    return {'output': f"✅ Installed packages from /{filename}", 'success': True}
                else:
                    return {'error': f'Failed to install from /{filename}: {result.stderr}', 'success': False}
                    
            finally:
                # Clean up temp file
                os.unlink(temp_file)
                
        except Exception as e:
            return {'error': f'Load requirements failed: {str(e)}', 'success': False}
    
    def _list_packages(self, context):
        """List installed packages"""
        try:
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'list'],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                return {'output': result.stdout, 'success': True}
            else:
                return {'error': f'Failed to list packages: {result.stderr}', 'success': False}
                
        except Exception as e:
            return {'error': f'List packages failed: {str(e)}', 'success': False}
    
    def _uninstall_packages(self, packages, context):
        """Uninstall packages"""
        try:
            # Capture stdout and stderr
            stdout_capture = io.StringIO()
            stderr_capture = io.StringIO()
            
            # Build pip command
            pip_cmd = [sys.executable, '-m', 'pip', 'uninstall', '-y'] + packages
            
            # Run pip uninstall
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                result = subprocess.run(
                    pip_cmd,
                    capture_output=True,
                    text=True,
                    check=False
                )
            
            output = stdout_capture.getvalue()
            stderr_output = stderr_capture.getvalue()
            
            if result.returncode == 0:
                success_msg = f"Successfully uninstalled: {', '.join(packages)}\n"
                if output:
                    success_msg += f"\nOutput:\n{output}"
                
                # Auto-save updated requirements to VFS
                try:
                    vfs = get_virtual_file_manager()
                    freeze_result = subprocess.run(
                        [sys.executable, '-m', 'pip', 'freeze'],
                        capture_output=True,
                        text=True,
                        check=True
                    )
                    
                    # Save to persistent location in VFS
                    vfs.create_file("/user_requirements.txt", freeze_result.stdout.encode('utf-8'))
                    success_msg += "\n✅ Auto-saved updated requirements to /user_requirements.txt"
                    
                except Exception as e:
                    success_msg += f"\n⚠️ Warning: Could not auto-save requirements: {e}"
                
                return {'output': success_msg, 'success': True}
            else:
                error_msg = f"Failed to uninstall packages: {', '.join(packages)}\n"
                if stderr_output:
                    error_msg += f"\nError:\n{stderr_output}"
                return {'error': error_msg, 'success': False}
                
        except Exception as e:
            return {'error': f'Uninstall failed: {str(e)}', 'success': False}
    
    def _show_package(self, package, context):
        """Show package information"""
        try:
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'show', package],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                return {'output': result.stdout, 'success': True}
            else:
                return {'error': f'Package not found: {package}', 'success': False}
                
        except Exception as e:
            return {'error': f'Show package failed: {str(e)}', 'success': False}
    
    def get_usage(self):
        return "pip install <package> [package2] ... | pip load <file> | pip list | pip uninstall <package> | pip show <package>"
    
    def get_help(self):
        return "Install, load, list, uninstall, or show Python packages using pip with VFS persistence" 
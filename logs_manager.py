"""
Logs Manager for Sypnex OS
Handles logging operations with VFS storage and file size management
"""

import json
import os
from datetime import datetime
from flask import Blueprint, request, jsonify
from virtual_file_manager import VirtualFileManager


class LogsManager:
    def __init__(self, vfs_manager):
        self.vfs_manager = vfs_manager
        self.blueprint = Blueprint('logs', __name__)
        self.max_file_size = 2 * 1024 * 1024  # 2MB in bytes (configurable later via system settings)
        self.setup_routes()
        self.ensure_log_directories()
    
    def ensure_log_directories(self):
        """Create log directory structure in VFS"""
        directories = [
            '/logs',
            '/logs/core-os',
            '/logs/user-apps', 
            '/logs/services',
            '/logs/system'  # For failed log attempts and system logs
        ]
        for directory in directories:
            if not self.vfs_manager.get_file_info(directory):
                self.vfs_manager.create_directory(directory)
    
    def _get_file_size(self, file_path):
        """Get the size of a file in the VFS"""
        try:
            file_info = self.vfs_manager.get_file_info(file_path)
            if file_info:
                return file_info.get('size', 0)
            return 0
        except Exception:
            return 0
    
    def _handle_file_size_limit(self, log_path):
        """Check if file exceeds size limit and handle rotation"""
        if self._get_file_size(log_path) >= self.max_file_size:
            try:
                # Delete the old file and let a new one be created
                self.vfs_manager.delete_path(log_path)
                return True  # Indicates file was rotated
            except Exception as e:
                # Log this failure to system logs if possible
                self._log_system_error(f"Failed to rotate log file {log_path}: {str(e)}")
                return False
        return False
    
    def _log_system_error(self, message):
        """Log system-level errors (like failed log operations)"""
        try:
            error_log_path = '/logs/system/errors.log'
            error_entry = {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'level': 'ERROR',
                'component': 'logs-manager',
                'message': message,
                'source': 'system'
            }
            
            # Check size limit for error log too
            if self._get_file_size(error_log_path) >= self.max_file_size:
                try:
                    self.vfs_manager.delete_path(error_log_path)
                except Exception:
                    pass  # Can't do much if we can't even clear the error log
            
            # Read existing content
            existing_content = ""
            file_data = self.vfs_manager.read_file(error_log_path)
            if file_data:
                existing_content = file_data['content'].decode('utf-8') if file_data['content'] else ""
            
            # Append new error entry
            new_content = existing_content + json.dumps(error_entry) + '\n'
            
            # Create file if it doesn't exist, otherwise update it
            if not self.vfs_manager.get_file_info(error_log_path):
                self.vfs_manager.create_file(error_log_path, new_content.encode('utf-8'), 'text/plain')
            else:
                self.vfs_manager.write_file(error_log_path, new_content.encode('utf-8'))
            
        except Exception:
            # If we can't even log the error, there's not much we can do
            # In a future version, this could fall back to console output
            pass
    
    def setup_routes(self):
        @self.blueprint.route('/api/logs/write', methods=['POST'])
        def write_log():
            """Write a log entry"""
            try:
                data = request.json
                
                # Validate required fields
                required_fields = ['level', 'message', 'component']
                if not all(field in data for field in required_fields):
                    return jsonify({'error': 'Missing required fields: level, message, component'}), 400
                
                # Valid log levels
                valid_levels = ['debug', 'info', 'warn', 'error', 'critical']
                if data['level'].lower() not in valid_levels:
                    return jsonify({'error': f'Invalid log level. Must be one of: {valid_levels}'}), 400
                
                # Create log entry
                log_entry = {
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'level': data['level'].upper(),
                    'component': data['component'],
                    'message': data['message'],
                    'details': data.get('details', {}),
                    'source': data.get('source', 'unknown')
                }
                
                # Determine log file path
                component_type = data['component'].lower()
                if component_type not in ['core-os', 'user-apps', 'services']:
                    component_type = 'user-apps'  # default fallback
                
                # Log file naming: /logs/component-type/YYYY-MM-DD.log
                log_date = datetime.utcnow().strftime('%Y-%m-%d')
                log_path = f'/logs/{component_type}/{log_date}.log'
                
                # Check and handle file size limit
                file_rotated = self._handle_file_size_limit(log_path)
                
                # Read existing content if file exists
                existing_content = ""
                file_data = self.vfs_manager.read_file(log_path)
                if file_data:
                    existing_content = file_data['content'].decode('utf-8') if file_data['content'] else ""
                
                # Append new log entry
                new_content = existing_content + json.dumps(log_entry) + '\n'
                
                # Create file if it doesn't exist, otherwise update it
                if not self.vfs_manager.get_file_info(log_path):
                    self.vfs_manager.create_file(log_path, new_content.encode('utf-8'), 'text/plain')
                else:
                    self.vfs_manager.write_file(log_path, new_content.encode('utf-8'))
                
                response_data = {
                    'success': True, 
                    'log_path': log_path,
                    'file_rotated': file_rotated
                }
                
                return jsonify(response_data), 200
                
            except Exception as e:
                error_msg = f'Failed to write log: {str(e)}'
                self._log_system_error(error_msg)
                return jsonify({'error': error_msg}), 500
        
        @self.blueprint.route('/api/logs/read', methods=['GET'])
        def read_logs():
            """Read logs with filtering options"""
            try:
                # Query parameters
                component = request.args.get('component', 'all')
                level = request.args.get('level', 'all')
                date = request.args.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
                limit = int(request.args.get('limit', 100))
                source = request.args.get('source', 'all')
                
                logs = []
                
                # Determine which component logs to read
                valid_components = ['core-os', 'user-apps',  'services', 'system']
                components_to_read = valid_components if component == 'all' else [component]
                
                for comp in components_to_read:
                    log_path = f'/logs/{comp}/{date}.log'
                    
                    file_data = self.vfs_manager.read_file(log_path)
                    if file_data:
                        content = file_data['content'].decode('utf-8') if file_data['content'] else ""
                        
                        # Parse log entries
                        for line in content.strip().split('\n'):
                            if line:
                                try:
                                    log_entry = json.loads(line)
                                    
                                    # Apply filters
                                    if level != 'all' and log_entry.get('level', '').lower() != level.lower():
                                        continue
                                    
                                    if source != 'all' and log_entry.get('source', '').lower() != source.lower():
                                        continue
                                    
                                    logs.append(log_entry)
                                    
                                except json.JSONDecodeError:
                                    continue  # Skip malformed log entries
                
                # Sort by timestamp (newest first) and apply limit
                logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                logs = logs[:limit]
                
                return jsonify({
                    'logs': logs,
                    'total': len(logs),
                    'filters': {
                        'component': component,
                        'level': level,
                        'date': date,
                        'source': source,
                        'limit': limit
                    }
                }), 200
                
            except Exception as e:
                error_msg = f'Failed to read logs: {str(e)}'
                self._log_system_error(error_msg)
                return jsonify({'error': error_msg}), 500
        
        @self.blueprint.route('/api/logs/dates', methods=['GET'])
        def get_log_dates():
            """Get available log dates for each component"""
            try:
                available_dates = {}
                components = ['core-os', 'user-apps',  'services', 'system']
                
                for component in components:
                    component_path = f'/logs/{component}'
                    available_dates[component] = []
                    
                    if self.vfs_manager.get_file_info(component_path):
                        # List files in component directory
                        files = self.vfs_manager.list_directory(component_path)
                        
                        # Extract dates from .log files
                        for file_info in files:
                            if file_info['name'].endswith('.log'):
                                date = file_info['name'].replace('.log', '')
                                if date != 'errors':  # Skip the errors.log file
                                    available_dates[component].append(date)
                        
                        # Sort dates
                        available_dates[component].sort(reverse=True)
                
                return jsonify({'available_dates': available_dates}), 200
                
            except Exception as e:
                error_msg = f'Failed to get log dates: {str(e)}'
                self._log_system_error(error_msg)
                return jsonify({'error': error_msg}), 500
        
        @self.blueprint.route('/api/logs/clear', methods=['DELETE'])
        def clear_logs():
            """Clear logs (with optional filters)"""
            try:
                component = request.args.get('component', 'all')
                date = request.args.get('date', 'all')
                
                valid_components = ['core-os', 'user-apps', 'services', 'system']
                components_to_clear = valid_components if component == 'all' else [component]
                cleared_files = []
                
                for comp in components_to_clear:
                    if date == 'all':
                        # Clear all logs for this component
                        component_path = f'/logs/{comp}'
                        if self.vfs_manager.get_file_info(component_path):
                            files = self.vfs_manager.list_directory(component_path)
                            for file_info in files:
                                if file_info['name'].endswith('.log'):
                                    file_path = f"{component_path}/{file_info['name']}"
                                    self.vfs_manager.delete_path(file_path)
                                    cleared_files.append(file_path)
                    else:
                        # Clear specific date
                        log_path = f'/logs/{comp}/{date}.log'
                        if self.vfs_manager.get_file_info(log_path):
                            self.vfs_manager.delete_path(log_path)
                            cleared_files.append(log_path)
                
                return jsonify({
                    'success': True,
                    'cleared_files': cleared_files,
                    'count': len(cleared_files)
                }), 200
                
            except Exception as e:
                error_msg = f'Failed to clear logs: {str(e)}'
                self._log_system_error(error_msg)
                return jsonify({'error': error_msg}), 500
        
        @self.blueprint.route('/api/logs/stats', methods=['GET'])
        def get_log_stats():
            """Get logging statistics"""
            try:
                stats = {
                    'total_log_files': 0,
                    'total_size_bytes': 0,
                    'components': {},
                    'max_file_size': self.max_file_size
                }
                
                components = ['core-os', 'user-apps', 'services', 'system']
                
                for component in components:
                    component_path = f'/logs/{component}'
                    component_stats = {
                        'file_count': 0,
                        'size_bytes': 0,
                        'files': []
                    }
                    
                    if self.vfs_manager.get_file_info(component_path):
                        files = self.vfs_manager.list_directory(component_path)
                        
                        for file_info in files:
                            if file_info['name'].endswith('.log'):
                                file_path = f"{component_path}/{file_info['name']}"
                                file_size = self._get_file_size(file_path)
                                
                                component_stats['files'].append({
                                    'name': file_info['name'],
                                    'size_bytes': file_size,
                                    'size_mb': round(file_size / (1024 * 1024), 2)
                                })
                                
                                component_stats['file_count'] += 1
                                component_stats['size_bytes'] += file_size
                    
                    stats['components'][component] = component_stats
                    stats['total_log_files'] += component_stats['file_count']
                    stats['total_size_bytes'] += component_stats['size_bytes']
                
                stats['total_size_mb'] = round(stats['total_size_bytes'] / (1024 * 1024), 2)
                stats['max_file_size_mb'] = round(self.max_file_size / (1024 * 1024), 2)
                
                return jsonify(stats), 200
                
            except Exception as e:
                error_msg = f'Failed to get log stats: {str(e)}'
                self._log_system_error(error_msg)
                return jsonify({'error': error_msg}), 500
    
    def log(self, level, message, component='core-os', source='system', details=None):
        """
        Convenience method for core OS components to write logs directly
        This bypasses the HTTP API for internal OS components
        """
        try:
            # Validate log level
            valid_levels = ['debug', 'info', 'warn', 'error', 'critical']
            if level.lower() not in valid_levels:
                level = 'info'  # fallback to info if invalid level
            
            # Create log entry
            log_entry = {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'level': level.upper(),
                'component': component,
                'message': message,
                'details': details or {},
                'source': source
            }
            
            # Determine log file path
            component_type = component.lower()
            if component_type not in ['core-os', 'user-apps', 'services']:
                component_type = 'core-os'  # default for internal components
            
            # Log file naming: /logs/component-type/YYYY-MM-DD.log
            log_date = datetime.utcnow().strftime('%Y-%m-%d')
            log_path = f'/logs/{component_type}/{log_date}.log'
            
            # Check and handle file size limit
            self._handle_file_size_limit(log_path)
            
            # Read existing content if file exists
            existing_content = ""
            file_data = self.vfs_manager.read_file(log_path)
            if file_data:
                existing_content = file_data['content'].decode('utf-8') if file_data['content'] else ""
            
            # Append new log entry
            new_content = existing_content + json.dumps(log_entry) + '\n'
            
            # Create file if it doesn't exist, otherwise update it
            if not self.vfs_manager.get_file_info(log_path):
                self.vfs_manager.create_file(log_path, new_content.encode('utf-8'), 'text/plain')
            else:
                self.vfs_manager.write_file(log_path, new_content.encode('utf-8'))
            
            return True
            
        except Exception as e:
            # Log this failure to system error log
            self._log_system_error(f"Failed to write internal log: {str(e)}")
            return False
    
    def register_routes(self, app):
        """Register the logs manager routes with the Flask app"""
        app.register_blueprint(self.blueprint)

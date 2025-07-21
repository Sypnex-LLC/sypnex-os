#!/usr/bin/env python3
"""
Service Manager - Manages Sypnex OS services
Handles service discovery, lifecycle management, and persistence
"""

import os
import sys
import importlib.util
from typing import Dict, List, Optional, Any
from datetime import datetime
import threading
import time
from services.config_manager import get_config_manager


class ServiceManager:
    """
    Manages Sypnex OS services including discovery, lifecycle, and persistence.
    """
    
    def __init__(self, logs_manager=None, vfs_manager=None, services_dir="services"):
        self.logs_manager = logs_manager
        self.vfs_manager = vfs_manager
        self.services_dir = services_dir
        self.services = {}  # service_id -> service_instance
        self.service_classes = {}  # service_id -> service_class
        self.running_services = {}  # service_id -> True/False (runtime state)
        self.lock = threading.Lock()
        
        # Initialize config manager
        print(f"[SERVICE_MANAGER] Initializing config manager with VFS manager: {self.vfs_manager is not None}")
        self.config_manager = get_config_manager(self.vfs_manager)
        
        # Install default service configurations before discovery
        self.install_defaults()
        
        # Discover all services on startup
        self.discover_services()
        
        # Auto-start services that have auto_start=true in their config
        self._auto_start_services()
    
    def install_defaults(self):
        """Install default service configurations from defaults/ directory to VFS."""
        # Hardcoded array of required services
        required_services = [
            'log_cleanup_service',
            'system_health_service'
        ]
        
        defaults_dir = "defaults"
        
        if not self.vfs_manager:
            print("[SERVICE_MANAGER] No VFS manager available - cannot install default services")
            return
        
        print(f"[SERVICE_MANAGER] Installing default service configurations...")
        
        for service_id in required_services:
            # Check if config already exists in VFS
            config_path = f"/services/configs/{service_id}.json"
            
            if self.vfs_manager.get_file_info(config_path):
                print(f"[SERVICE_MANAGER] Config for {service_id} already exists in VFS")
                continue
            
            # Look for template file in defaults directory
            template_path = os.path.join(defaults_dir, f"{service_id}.template")
            
            if not os.path.exists(template_path):
                print(f"[SERVICE_MANAGER] Warning: Template file {template_path} not found for service {service_id}")
                continue
            
            try:
                # Read template file from filesystem
                with open(template_path, 'r', encoding='utf-8') as f:
                    template_content = f.read()
                
                # Create the config file in VFS
                success = self.vfs_manager.create_file(
                    config_path,
                    template_content.encode('utf-8'),
                    'application/json'
                )
                
                if success:
                    print(f"[SERVICE_MANAGER] Installed default config for {service_id} to VFS")
                    if self.logs_manager:
                        self.logs_manager.log(
                            level='info',
                            message=f'Installed default service configuration for {service_id}',
                            component='services',
                            source='service_manager',
                            details={'service_id': service_id, 'config_path': config_path}
                        )
                else:
                    print(f"[SERVICE_MANAGER] Failed to create config file for {service_id} in VFS")
                    
            except Exception as e:
                print(f"[SERVICE_MANAGER] Error installing default config for {service_id}: {e}")
                if self.logs_manager:
                    self.logs_manager.log(
                        level='error',
                        message=f'Failed to install default service configuration for {service_id}: {e}',
                        component='services',
                        source='service_manager',
                        details={'service_id': service_id, 'error': str(e)}
                    )
    
    def discover_services(self):
        """Discover all services in the services directory on startup."""
        if not os.path.exists(self.services_dir):
            print(f"Services directory '{self.services_dir}' not found")
            return
        
        # Clear existing services
        self.services.clear()
        self.service_classes.clear()
        self.running_services.clear()
        
        # Scan services directory
        for filename in os.listdir(self.services_dir):
            if filename.endswith('_service.py') and filename != 'base_service.py':
                service_id = filename[:-3]  # Remove .py extension
                
                # Check if service has a config file - skip if not found
                config_manager = get_config_manager(self.vfs_manager)
                if not config_manager.config_exists(service_id):
                    print(f"Skipping service {service_id} - no config file found")
                    continue
                
                # Load the service
                success, error, service_info = self._load_single_service(service_id)
                if success:
                    print(f"Discovered service: {service_info['name']} ({service_info['id']})")
                else:
                    print(f"Failed to load service {service_id}: {error}")
    
    def _auto_start_services(self):
        """Auto-start services that have auto_start=true in their config."""
        config_manager = get_config_manager(self.vfs_manager)
        
        for service_id in self.services.keys():
            service_config = config_manager.load_config(service_id)
            auto_start = service_config.get('auto_start', False)
            
            if auto_start:
                print(f"Auto-starting service: {service_id}")
                self.start_service(service_id)
    
    def _load_single_service(self, service_id: str):
        """Load a specific service from disk. Returns (success, error_message, service_config)."""
        service_file = f"{service_id}.py"
        service_path = os.path.join(self.services_dir, service_file)
        
        if not os.path.exists(service_path):
            return False, f"Service file '{service_file}' not found in services directory", None
        
        # Check if service has a config file - required
        config_manager = get_config_manager(self.vfs_manager)
        if not config_manager.config_exists(service_id):
            return False, f"Config file for service '{service_id}' not found in VFS", None
        
        # Load config first - this is now the source of truth
        service_config = config_manager.load_config(service_id)
        if not service_config:
            return False, f"Failed to load config for service '{service_id}'", None
        
        # Validate config has required fields
        required_fields = ['id', 'name']
        for field in required_fields:
            if field not in service_config:
                return False, f"Config missing required field '{field}' for service '{service_id}'", None
        
        # Validate service ID matches filename
        if service_config['id'] != service_id:
            return False, f"Service ID mismatch: expected '{service_id}', got '{service_config['id']}'", None
        
        try:
            # Load service module
            spec = importlib.util.spec_from_file_location(service_id, service_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Find service class (should be the only class that extends ServiceBase)
            service_class = None
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and 
                    hasattr(attr, '__bases__') and 
                    any('ServiceBase' in str(base) for base in attr.__bases__)):
                    service_class = attr
                    break
            
            if not service_class:
                return False, f"No service class found in {service_file}", None
            
            # Create service instance
            service_instance = service_class()
            
            # Load config into service instance
            service_instance.config = service_config
            
            # Pass logs manager to service instance
            service_instance.logs_manager = self.logs_manager
            
            # Pass VFS manager to service instance
            service_instance.vfs_manager = self.vfs_manager
            
            # Store service (using config ID)
            self.service_classes[service_config['id']] = service_class
            self.services[service_config['id']] = service_instance
            self.running_services[service_config['id']] = False  # Initially not running
            
            print(f"Loaded service: {service_config['name']} ({service_config['id']})")
            return True, None, service_config
            
        except Exception as e:
            return False, f"Error loading service {service_file}: {e}", None
    
    def get_all_services(self) -> List[Dict[str, Any]]:
        """Get information about all services from config files."""
        services_info = []
        
        with self.lock:
            for service_id, service in self.services.items():
                # Get config info (source of truth)
                config_manager = get_config_manager(self.vfs_manager)
                service_config = config_manager.load_config(service_id)
                
                if not service_config:
                    print(f"Warning: No config found for service {service_id}")
                    continue
                
                # Get runtime status
                service_status = service.status()
                
                services_info.append({
                    'id': service_config.get('id', service_id),
                    'name': service_config.get('name', 'Unknown'),
                    'description': service_config.get('description', ''),
                    'version': service_config.get('version', '1.0.0'),
                    'author': service_config.get('author', 'Unknown'),
                    'running': service_status['running'],
                    'uptime': service_status['uptime'],
                    'last_error': service_status['last_error'],
                    'auto_start': service_config.get('auto_start', False),
                    'stats': service_status['stats']
                })
        
        return services_info
    
    def get_service(self, service_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific service."""
        with self.lock:
            if service_id not in self.services:
                return None
            
            service = self.services[service_id]
            
            # Get config info (source of truth)
            config_manager = get_config_manager(self.vfs_manager)
            service_config = config_manager.load_config(service_id)
            
            if not service_config:
                return None
            
            # Get runtime status
            service_status = service.status()
            
            return {
                'id': service_config.get('id', service_id),
                'name': service_config.get('name', 'Unknown'),
                'description': service_config.get('description', ''),
                'version': service_config.get('version', '1.0.0'),
                'author': service_config.get('author', 'Unknown'),
                'running': service_status['running'],
                'uptime': service_status['uptime'],
                'last_error': service_status['last_error'],
                'auto_start': service_config.get('auto_start', False),
                'stats': service_status['stats']
            }
    
    def start_service(self, service_id: str) -> bool:
        """Start a service."""
        with self.lock:
            if service_id not in self.services:
                print(f"Service {service_id} not found")
                return False
            
            service = self.services[service_id]
            
            if service.is_running():
                print(f"Service {service_id} is already running")
                return False
            
            # Start the service
            success = service.start()
            
            if success:
                # Update memory state
                self.running_services[service_id] = True
                self._log_service_event(service_id, 'INFO', f'Service {service_id} started')
                print(f"Service {service_id} started successfully")
            else:
                self._log_service_event(service_id, 'ERROR', f'Failed to start service {service_id}')
                print(f"Failed to start service {service_id}")
            
            return success
    
    def stop_service(self, service_id: str) -> bool:
        """Stop a service."""
        with self.lock:
            if service_id not in self.services:
                print(f"Service {service_id} not found")
                return False
            
            service = self.services[service_id]
            
            if not service.is_running():
                print(f"Service {service_id} is not running")
                return False
            
            # Stop the service
            success = service.stop()
            
            if success:
                # Update memory state
                self.running_services[service_id] = False
                self._log_service_event(service_id, 'INFO', f'Service {service_id} stopped')
                print(f"Service {service_id} stopped successfully")
            else:
                self._log_service_event(service_id, 'ERROR', f'Failed to stop service {service_id}')
                print(f"Failed to stop service {service_id}")
            
            return success
    
    def _log_service_event(self, service_id: str, level: str, message: str):
        """Log a service event using the VFS logs manager."""
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level=level.lower(),
                    message=message,
                    component='services',
                    source=service_id,
                    details={'service_id': service_id}
                )
            except Exception as e:
                # Fallback to console if logging fails
                print(f"Failed to log service event for {service_id}: {e}")
        else:
            # Fallback to console if no logs_manager
            print(f"[{level}] {service_id}: {message}")
    
    def reload_service(self, service_id: str):
        """Reload a specific service from disk."""
        try:
            # Stop service if running
            was_running = False
            if service_id in self.services and self.services[service_id].is_running():
                was_running = True
                self.stop_service(service_id)
            
            # Remove from memory if exists
            if service_id in self.services:
                del self.services[service_id]
            if service_id in self.service_classes:
                del self.service_classes[service_id]
            
            # Load the service
            success, error, service_config = self._load_single_service(service_id)
            
            if not success:
                return {
                    'success': False,
                    'error': error
                }
            
            # Check if service should auto-start from config
            auto_start = service_config.get('auto_start', False)
            
            if auto_start:
                print(f"Auto-starting reloaded service: {service_id}")
                self.start_service(service_id)
            
            return {
                'success': True,
                'service_config': service_config,
                'auto_started': auto_start
            }
                
        except Exception as e:
            return {
                'success': False,
                'error': f"Unexpected error: {e}"
            }
    
    def shutdown_all_services(self):
        """Stop all running services."""
        with self.lock:
            for service_id, service in self.services.items():
                if service.is_running():
                    print(f"Stopping service: {service_id}")
                    service.stop()
                    self.running_services[service_id] = False


# Global service manager instance
service_manager_instance = None


def get_service_manager(logs_manager=None, vfs_manager=None) -> ServiceManager:
    """Get the global service manager instance."""
    global service_manager_instance
    if service_manager_instance is None:
        service_manager_instance = ServiceManager(logs_manager, vfs_manager)
    return service_manager_instance 
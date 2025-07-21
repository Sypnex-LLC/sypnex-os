#!/usr/bin/env python3
"""
Service Configuration Manager
Handles configuration files for services using VFS storage
"""

import json
from typing import Dict, Any, Optional


class ServiceConfigManager:
    """
    Manages configuration files for services using VFS.
    
    Services can have configuration files in JSON format that can be
    updated via the UI (future feature) and loaded by the service.
    """
    
    def __init__(self, vfs_manager=None, config_dir="/services/configs"):
        self.vfs_manager = vfs_manager
        self.config_dir = config_dir
        self.ensure_config_directory()
    
    def ensure_config_directory(self):
        """Create config directory structure in VFS if it doesn't exist"""
        if self.vfs_manager:
            print(f"[CONFIG_MANAGER] Checking VFS directories...")
            
            # First ensure /services directory exists
            services_dir = "/services"
            if not self.vfs_manager.get_file_info(services_dir):
                print(f"[CONFIG_MANAGER] Creating {services_dir} directory...")
                self.vfs_manager.create_directory(services_dir)
                print(f"[CONFIG_MANAGER] Created {services_dir} directory")
            else:
                print(f"[CONFIG_MANAGER] {services_dir} directory already exists")
            
            # Then ensure /services/configs directory exists
            if not self.vfs_manager.get_file_info(self.config_dir):
                print(f"[CONFIG_MANAGER] Creating {self.config_dir} directory...")
                self.vfs_manager.create_directory(self.config_dir)
                print(f"[CONFIG_MANAGER] Created {self.config_dir} directory")
            else:
                print(f"[CONFIG_MANAGER] {self.config_dir} directory already exists")
        else:
            print(f"[CONFIG_MANAGER] No VFS manager available - cannot create directories")
    
    def get_config_path(self, service_id: str) -> str:
        """Get the configuration file path for a service."""
        return f"{self.config_dir}/{service_id}.json"
    
    def load_config(self, service_id: str) -> Dict[str, Any]:
        """
        Load configuration for a service from VFS.
        
        Args:
            service_id: The service identifier
            
        Returns:
            Dictionary containing the service configuration
        """
        if not self.vfs_manager:
            return {}
            
        config_path = self.get_config_path(service_id)
        
        if not self.vfs_manager.get_file_info(config_path):
            return {}
        
        try:
            file_data = self.vfs_manager.read_file(config_path)
            if file_data and file_data['content']:
                content = file_data['content'].decode('utf-8')
                return json.loads(content)
            return {}
        except (json.JSONDecodeError, Exception) as e:
            print(f"Error loading config for service {service_id}: {e}")
            return {}
    
    def list_configs(self) -> list:
        """
        List all available configuration files from VFS.
        
        Returns:
            List of service IDs that have configuration files
        """
        if not self.vfs_manager:
            return []
            
        configs = []
        try:
            if self.vfs_manager.get_file_info(self.config_dir):
                files = self.vfs_manager.list_directory(self.config_dir)
                for file_info in files:
                    if file_info['name'].endswith('.json'):
                        service_id = file_info['name'][:-5]  # Remove .json extension
                        configs.append(service_id)
        except Exception as e:
            print(f"Error listing configs: {e}")
        return configs
    
    def config_exists(self, service_id: str) -> bool:
        """
        Check if a configuration file exists for a service in VFS.
        
        Args:
            service_id: The service identifier
            
        Returns:
            True if configuration exists, False otherwise
        """
        if not self.vfs_manager:
            return False
        return bool(self.vfs_manager.get_file_info(self.get_config_path(service_id)))


# Global configuration manager instance
config_manager_instance = None


def get_config_manager(vfs_manager=None) -> ServiceConfigManager:
    """Get the global configuration manager instance."""
    global config_manager_instance
    if config_manager_instance is None:
        config_manager_instance = ServiceConfigManager(vfs_manager)
    return config_manager_instance 
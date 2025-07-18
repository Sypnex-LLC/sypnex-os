#!/usr/bin/env python3
"""
Service Configuration Manager
Handles configuration files for services, similar to user apps
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional


class ServiceConfigManager:
    """
    Manages configuration files for services.
    
    Services can have configuration files in JSON format that can be
    updated via the UI (future feature) and loaded by the service.
    """
    
    def __init__(self, config_dir="services/configs"):
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(exist_ok=True)
    
    def get_config_path(self, service_id: str) -> Path:
        """Get the configuration file path for a service."""
        return self.config_dir / f"{service_id}.json"
    
    def load_config(self, service_id: str) -> Dict[str, Any]:
        """
        Load configuration for a service.
        
        Args:
            service_id: The service identifier
            
        Returns:
            Dictionary containing the service configuration
        """
        config_path = self.get_config_path(service_id)
        
        if not config_path.exists():
            return {}
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error loading config for service {service_id}: {e}")
            return {}
    
    def save_config(self, service_id: str, config: Dict[str, Any]) -> bool:
        """
        Save configuration for a service.
        
        Args:
            service_id: The service identifier
            config: Configuration dictionary to save
            
        Returns:
            True if saved successfully, False otherwise
        """
        config_path = self.get_config_path(service_id)
        
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            return True
        except IOError as e:
            print(f"Error saving config for service {service_id}: {e}")
            return False
    
    def update_config(self, service_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update specific configuration values for a service.
        
        Args:
            service_id: The service identifier
            updates: Dictionary of configuration updates
            
        Returns:
            True if updated successfully, False otherwise
        """
        current_config = self.load_config(service_id)
        current_config.update(updates)
        return self.save_config(service_id, current_config)
    
    def delete_config(self, service_id: str) -> bool:
        """
        Delete configuration file for a service.
        
        Args:
            service_id: The service identifier
            
        Returns:
            True if deleted successfully, False otherwise
        """
        config_path = self.get_config_path(service_id)
        
        if config_path.exists():
            try:
                config_path.unlink()
                return True
            except IOError as e:
                print(f"Error deleting config for service {service_id}: {e}")
                return False
        return True
    
    def list_configs(self) -> list:
        """
        List all available configuration files.
        
        Returns:
            List of service IDs that have configuration files
        """
        configs = []
        for config_file in self.config_dir.glob("*.json"):
            service_id = config_file.stem
            configs.append(service_id)
        return configs
    
    def config_exists(self, service_id: str) -> bool:
        """
        Check if a configuration file exists for a service.
        
        Args:
            service_id: The service identifier
            
        Returns:
            True if configuration exists, False otherwise
        """
        return self.get_config_path(service_id).exists()


# Global configuration manager instance
config_manager_instance = None


def get_config_manager() -> ServiceConfigManager:
    """Get the global configuration manager instance."""
    global config_manager_instance
    if config_manager_instance is None:
        config_manager_instance = ServiceConfigManager()
    return config_manager_instance 
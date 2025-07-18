#!/usr/bin/env python3
"""
Service Manager - Manages Sypnex OS services
Handles service discovery, lifecycle management, and persistence
"""

import os
import sys
import sqlite3
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
    
    def __init__(self, logs_manager=None, services_dir="services", db_path="data/user_preferences.db"):
        self.logs_manager = logs_manager
        self.services_dir = services_dir
        self.db_path = db_path
        self.services = {}  # service_id -> service_instance
        self.service_classes = {}  # service_id -> service_class
        self.lock = threading.Lock()
        
        # Initialize config manager
        self.config_manager = get_config_manager()
        
        # Initialize database
        self._init_database()
        
        # Discover services
        self.discover_services()
        
        # Restore service states on startup
        self._restore_service_states()
    
    def _init_database(self):
        """Initialize the database with service tables."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Create services table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS services (
                    service_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    version TEXT,
                    author TEXT,
                    auto_start BOOLEAN DEFAULT 0,
                    enabled BOOLEAN DEFAULT 1,
                    running BOOLEAN DEFAULT 0,
                    last_started TIMESTAMP,
                    last_stopped TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create service logs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS service_logs (
                    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    service_id TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    FOREIGN KEY (service_id) REFERENCES services(service_id)
                )
            ''')
            
            conn.commit()
    
    def discover_services(self):
        """Discover all services in the services directory."""
        if not os.path.exists(self.services_dir):
            print(f"Services directory '{self.services_dir}' not found")
            return
        
        # Clear existing services
        self.services.clear()
        self.service_classes.clear()
        
        # Scan services directory
        for filename in os.listdir(self.services_dir):
            if filename.endswith('_service.py') and filename != 'base_service.py':
                service_id = filename[:-3]  # Remove .py extension
                service_path = os.path.join(self.services_dir, filename)
                
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
                    
                    if service_class:
                        # Create service instance
                        service_instance = service_class()
                        service_info = service_instance.get_info()
                        
                        # Validate service info
                        if 'id' not in service_info:
                            print(f"Warning: Service {service_id} missing 'id' in get_info()")
                            continue
                        
                        # Store service
                        self.service_classes[service_info['id']] = service_class
                        self.services[service_info['id']] = service_instance
                        
                        # Register in database
                        self._register_service(service_info)
                        
                        print(f"Discovered service: {service_info['name']} ({service_info['id']})")
                        
                    else:
                        print(f"Warning: No service class found in {filename}")
                        
                except Exception as e:
                    print(f"Error loading service {filename}: {e}")
    
    def _register_service(self, service_info: Dict[str, Any]):
        """Register a service in the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Check if service already exists
            cursor.execute('SELECT service_id FROM services WHERE service_id = ?', 
                         (service_info['id'],))
            
            if cursor.fetchone():
                # Update existing service
                cursor.execute('''
                    UPDATE services 
                    SET name = ?, description = ?, version = ?, author = ?, 
                        auto_start = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE service_id = ?
                ''', (
                    service_info['name'],
                    service_info.get('description', ''),
                    service_info.get('version', '1.0.0'),
                    service_info.get('author', ''),
                    service_info.get('auto_start', False),
                    service_info['id']
                ))
            else:
                # Insert new service
                cursor.execute('''
                    INSERT INTO services (service_id, name, description, version, author, auto_start)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    service_info['id'],
                    service_info['name'],
                    service_info.get('description', ''),
                    service_info.get('version', '1.0.0'),
                    service_info.get('author', ''),
                    service_info.get('auto_start', False)
                ))
            
            conn.commit()
    
    def _restore_service_states(self):
        """Restore service states from database on startup."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT service_id, running FROM services WHERE enabled = 1')
            
            for service_id, was_running in cursor.fetchall():
                if was_running and service_id in self.services:
                    print(f"Restoring service: {service_id}")
                    self.start_service(service_id)
    
    def get_all_services(self) -> List[Dict[str, Any]]:
        """Get information about all services."""
        services_info = []
        
        with self.lock:
            for service_id, service in self.services.items():
                service_info = service.get_info()
                service_status = service.status()
                
                # Get database info
                db_info = self._get_service_db_info(service_id)
                
                services_info.append({
                    'id': service_id,
                    'name': service_info['name'],
                    'description': service_info.get('description', ''),
                    'version': service_info.get('version', '1.0.0'),
                    'author': service_info.get('author', ''),
                    'running': service_status['running'],
                    'uptime': service_status['uptime'],
                    'last_error': service_status['last_error'],
                    'enabled': db_info.get('enabled', True),
                    'last_started': db_info.get('last_started'),
                    'last_stopped': db_info.get('last_stopped'),
                    'stats': service_status['stats']
                })
        
        return services_info
    
    def get_service(self, service_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific service."""
        with self.lock:
            if service_id not in self.services:
                return None
            
            service = self.services[service_id]
            service_info = service.get_info()
            service_status = service.status()
            db_info = self._get_service_db_info(service_id)
            
            return {
                'id': service_id,
                'name': service_info['name'],
                'description': service_info.get('description', ''),
                'version': service_info.get('version', '1.0.0'),
                'author': service_info.get('author', ''),
                'running': service_status['running'],
                'uptime': service_status['uptime'],
                'last_error': service_status['last_error'],
                'enabled': db_info.get('enabled', True),
                'last_started': db_info.get('last_started'),
                'last_stopped': db_info.get('last_stopped'),
                'stats': service_status['stats']
            }
    
    def _get_service_db_info(self, service_id: str) -> Dict[str, Any]:
        """Get service information from database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT enabled, last_started, last_stopped 
                FROM services WHERE service_id = ?
            ''', (service_id,))
            
            row = cursor.fetchone()
            if row:
                return {
                    'enabled': bool(row[0]),
                    'last_started': row[1],
                    'last_stopped': row[2]
                }
            return {}
    
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
                # Update database
                self._update_service_status(service_id, True)
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
                # Update database
                self._update_service_status(service_id, False)
                self._log_service_event(service_id, 'INFO', f'Service {service_id} stopped')
                print(f"Service {service_id} stopped successfully")
            else:
                self._log_service_event(service_id, 'ERROR', f'Failed to stop service {service_id}')
                print(f"Failed to stop service {service_id}")
            
            return success
    
    def _update_service_status(self, service_id: str, running: bool):
        """Update service status in database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if running:
                cursor.execute('''
                    UPDATE services 
                    SET running = 1, last_started = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE service_id = ?
                ''', (service_id,))
            else:
                cursor.execute('''
                    UPDATE services 
                    SET running = 0, last_stopped = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE service_id = ?
                ''', (service_id,))
            
            conn.commit()
    
    def _log_service_event(self, service_id: str, level: str, message: str):
        """Log a service event to the database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO service_logs (service_id, level, message)
                VALUES (?, ?, ?)
            ''', (service_id, level, message))
            conn.commit()
    
    def get_service_logs(self, service_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent logs for a service."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT timestamp, level, message 
                FROM service_logs 
                WHERE service_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (service_id, limit))
            
            logs = []
            for row in cursor.fetchall():
                logs.append({
                    'timestamp': row[0],
                    'level': row[1],
                    'message': row[2]
                })
            
            return logs
    
    def refresh_services(self):
        """Refresh service discovery."""
        self.discover_services()
        return {
            'services': len(self.services),
            'discovered': list(self.services.keys())
        }
    
    def shutdown_all_services(self):
        """Stop all running services."""
        with self.lock:
            for service_id, service in self.services.items():
                if service.is_running():
                    print(f"Stopping service: {service_id}")
                    service.stop()
                    self._update_service_status(service_id, False)


# Global service manager instance
service_manager_instance = None


def get_service_manager(logs_manager=None) -> ServiceManager:
    """Get the global service manager instance."""
    global service_manager_instance
    if service_manager_instance is None:
        service_manager_instance = ServiceManager(logs_manager)
    return service_manager_instance 
#!/usr/bin/env python3
"""
ServiceBase - Base class for Sypnex OS services
All services should extend this class and implement required methods
"""

import threading
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from services.config_manager import get_config_manager


class ServiceBase(ABC):
    """
    Base class for Sypnex OS services.
    
    Services are background processes that run continuously and provide
    system functionality. They are discovered automatically and can be
    started/stopped via terminal commands.
    """
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.start_time = None
        self.last_error = None
        self._stop_event = threading.Event()
        self.config_manager = get_config_manager()
        self.config = {}
    

    
    def start(self) -> bool:
        """
        Start the service.
        
        Returns:
            True if service started successfully, False otherwise
        """
        if self.running:
            return False
        
        try:
            self.running = True
            self.start_time = time.time()
            self._stop_event.clear()
            
            # Start the service thread
            self.thread = threading.Thread(target=self._run, daemon=True)
            self.thread.start()
            
            # Call the service-specific start method
            self.on_start()
            
            return True
            
        except Exception as e:
            self.running = False
            self.last_error = str(e)
            return False
    
    def stop(self) -> bool:
        """
        Stop the service gracefully.
        
        Returns:
            True if service stopped successfully, False otherwise
        """
        if not self.running:
            return False
        
        try:
            self.running = False
            self._stop_event.set()
            
            # Call the service-specific stop method
            self.on_stop()
            
            # Wait for thread to finish (with timeout)
            if self.thread and self.thread.is_alive():
                self.thread.join(timeout=10)
            
            return True
            
        except Exception as e:
            self.last_error = str(e)
            return False
    
    def status(self) -> Dict[str, Any]:
        """
        Get current service status.
        
        Returns:
            Dict containing service status:
            - running: Whether service is currently running
            - uptime: Service uptime in seconds
            - last_error: Last error message (if any)
            - stats: Service-specific statistics
        """
        uptime = 0
        if self.start_time and self.running:
            uptime = time.time() - self.start_time
        
        return {
            'running': self.running,
            'uptime': uptime,
            'last_error': self.last_error,
            'stats': self.get_stats()
        }
    
    def is_running(self) -> bool:
        """Check if service is currently running."""
        return self.running and self.thread and self.thread.is_alive()
    
    def should_stop(self) -> bool:
        """Check if service should stop (for use in main loop)."""
        return self._stop_event.is_set()
    
    # Service-specific methods (override as needed)
    
    def on_start(self):
        """Called when service starts. Override for service-specific startup logic."""
        # Config is loaded by service manager during service discovery
        pass
    
    def on_stop(self):
        """Called when service stops. Override for service-specific cleanup logic."""
        pass
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service-specific statistics. Override to provide custom stats."""
        return {}
    
    def get_config(self) -> Dict[str, Any]:
        """Get current service configuration."""
        return self.config.copy()

    @abstractmethod
    def _run(self):
        """
        Main service loop. Override this method to implement service logic.
        
        This method should run in an infinite loop until should_stop() returns True.
        Example:
        
        def _run(self):
            while not self.should_stop():
                # Your service logic here
                time.sleep(1)
        """
        pass 
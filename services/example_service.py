#!/usr/bin/env python3
"""
Example Service - Demonstrates how to create a Sypnex OS service
"""

import time
import random
from services.base_service import ServiceBase


class ExampleService(ServiceBase):
    """
    Example service that demonstrates basic service functionality.
    
    This service simulates a simple monitoring task that runs in the background.
    """
    
    def __init__(self):
        super().__init__()
        self.counter = 0
        self.last_check = None

    def on_start(self):
        """Called when service starts."""
        print("Example Service: Starting up...")
        self.counter = 0
        self.last_check = time.time()
    
    def on_stop(self):
        """Called when service stops."""
        print("Example Service: Shutting down...")
    
    def get_stats(self):
        """Return service-specific statistics."""
        return {
            'checks_performed': self.counter,
            'last_check': self.last_check,
            'random_value': random.randint(1, 100)
        }
    
    def _run(self):
        """Main service loop."""
        print("Example Service: Main loop started")
        
        while not self.should_stop():
            try:
                # Simulate some work
                self.counter += 1
                self.last_check = time.time()
                
                # Use configuration values
                check_interval = self.config.get('check_interval', 5)
                error_simulation = self.config.get('features', {}).get('error_simulation', True)
                detailed_logging = self.config.get('features', {}).get('detailed_logging', False)
                
                # Simulate occasional errors (if enabled)
                if error_simulation and random.random() < 0.1:  # 10% chance of error
                    raise Exception("Simulated error for demonstration")
                
                # Log progress (based on configuration)
                if detailed_logging or self.counter % 10 == 0:
                    print(f"Example Service: Completed {self.counter} checks")
                
                # Sleep for configured interval
                time.sleep(check_interval)
                
            except Exception as e:
                print(f"Example Service: Error - {e}")
                self.last_error = str(e)
                time.sleep(10)  # Wait longer after an error
        
        print("Example Service: Main loop stopped") 
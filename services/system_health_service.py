#!/usr/bin/env python3
"""
System Health Monitor Service - Monitors CPU and memory usage
"""

import time
import psutil
from services.base_service import ServiceBase


class SystemHealthService(ServiceBase):
    """
    System Health Monitor Service that tracks CPU and memory usage.
    
    This service monitors system resources and logs metrics periodically
    based on the configured check interval.
    """
    
    def __init__(self):
        super().__init__()
        self.total_checks = 0
        self.last_cpu_percent = 0.0
        self.last_memory_percent = 0.0
        self.last_memory_used = 0
        self.last_memory_total = 0
        self.cpu_readings = []
        self.memory_readings = []
        self.max_readings = 100  # Keep last 100 readings for averages
        
    def on_start(self):
        """Called when service starts."""
        message = "System Health Monitor starting up..."
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message=message,
                    component='services',
                    source='system_health_service'
                )
            except Exception as e:
                eprint(f"Failed to log startup: {e}")
        else:
            print(message)
        # Initialize CPU monitoring (first call returns 0.0, so we call it once)
        psutil.cpu_percent(interval=None)
        
    def on_stop(self):
        """Called when service stops."""
        message = "System Health Monitor shutting down..."
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message=message,
                    component='services',
                    source='system_health_service'
                )
            except Exception as e:
                eprint(f"Failed to log shutdown: {e}")
        else:
            print(message)
        
    def get_stats(self):
        """Return service-specific statistics."""
        cpu_avg = sum(self.cpu_readings) / len(self.cpu_readings) if self.cpu_readings else 0.0
        memory_avg = sum(self.memory_readings) / len(self.memory_readings) if self.memory_readings else 0.0
        
        return {
            'total_checks': self.total_checks,
            'current_cpu_percent': self.last_cpu_percent,
            'current_memory_percent': self.last_memory_percent,
            'current_memory_used_gb': round(self.last_memory_used / (1024**3), 2),
            'current_memory_total_gb': round(self.last_memory_total / (1024**3), 2),
            'avg_cpu_percent': round(cpu_avg, 1),
            'avg_memory_percent': round(memory_avg, 1),
            'max_cpu_percent': max(self.cpu_readings) if self.cpu_readings else 0.0,
            'max_memory_percent': max(self.memory_readings) if self.memory_readings else 0.0
        }
    
    def _collect_metrics(self):
        """Collect current system metrics."""
        try:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent(interval=None)
            
            # Get memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used = memory.used
            memory_total = memory.total
            
            # Store current values
            self.last_cpu_percent = cpu_percent
            self.last_memory_percent = memory_percent
            self.last_memory_used = memory_used
            self.last_memory_total = memory_total
            
            # Add to rolling averages
            self.cpu_readings.append(cpu_percent)
            self.memory_readings.append(memory_percent)
            
            # Keep only last N readings
            if len(self.cpu_readings) > self.max_readings:
                self.cpu_readings.pop(0)
            if len(self.memory_readings) > self.max_readings:
                self.memory_readings.pop(0)
            
            self.total_checks += 1
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent,
                'memory_used_gb': round(memory_used / (1024**3), 2),
                'memory_total_gb': round(memory_total / (1024**3), 2)
            }
            
        except Exception as e:
            self.last_error = f"Failed to collect metrics: {e}"
            return None
    
    def _log_metrics(self, metrics):
        """Log metrics using the logs manager."""
        if not metrics:
            return
            
        # Get configuration
        log_level = self.config.get('log_level', 'DEBUG').lower()
        detailed_logging = self.config.get('features', {}).get('detailed_logging', True)
        alert_on_thresholds = self.config.get('features', {}).get('alert_on_thresholds', True)
        
        cpu_warning_threshold = self.config.get('thresholds', {}).get('cpu_warning', 80)
        memory_warning_threshold = self.config.get('thresholds', {}).get('memory_warning', 85)
        
        # Create log message
        if detailed_logging:
            message = (f"CPU: {metrics['cpu_percent']:.1f}%, "
                      f"Memory: {metrics['memory_percent']:.1f}% "
                      f"({metrics['memory_used_gb']}GB/{metrics['memory_total_gb']}GB)")
        else:
            message = f"CPU: {metrics['cpu_percent']:.1f}%, Memory: {metrics['memory_percent']:.1f}%"
        
        # Log regular metrics
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level=log_level,
                    message=message,
                    component='services',
                    source='system_health_service',
                    details={
                        'cpu_percent': metrics['cpu_percent'],
                        'memory_percent': metrics['memory_percent'],
                        'memory_used_gb': metrics['memory_used_gb'],
                        'memory_total_gb': metrics['memory_total_gb']
                    }
                )
            except Exception as e:
                eprint(f"Failed to log metrics: {e}")
        else:
            # Fallback to console if no logs_manager
            print(f"[{log_level.upper()}] System Health Monitor: {message}")
        
        # Check thresholds and log alerts
        if alert_on_thresholds:
            if metrics['cpu_percent'] >= cpu_warning_threshold:
                alert_msg = f"CPU usage high: {metrics['cpu_percent']:.1f}% (threshold: {cpu_warning_threshold}%)"
                if self.logs_manager:
                    try:
                        self.logs_manager.log(
                            level='warning',
                            message=alert_msg,
                            component='services',
                            source='system_health_service',
                            details={'cpu_percent': metrics['cpu_percent'], 'threshold': cpu_warning_threshold}
                        )
                    except Exception as e:
                        eprint(f"Failed to log CPU alert: {e}")
                else:
                    print(f"[WARN] System Health Monitor: {alert_msg}")
                
            if metrics['memory_percent'] >= memory_warning_threshold:
                alert_msg = f"Memory usage high: {metrics['memory_percent']:.1f}% (threshold: {memory_warning_threshold}%)"
                if self.logs_manager:
                    try:
                        self.logs_manager.log(
                            level='warning',
                            message=alert_msg,
                            component='services',
                            source='system_health_service',
                            details={'memory_percent': metrics['memory_percent'], 'threshold': memory_warning_threshold}
                        )
                    except Exception as e:
                        eprint(f"Failed to log memory alert: {e}")
                else:
                    print(f"[WARN] System Health Monitor: {alert_msg}")
    
    def _run(self):
        """Main service loop."""
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message="Main loop started",
                    component='services',
                    source='system_health_service'
                )
            except Exception as e:
                eprint(f"Failed to log main loop start: {e}")
        else:
            print("System Health Monitor: Main loop started")
        
        while not self.should_stop():
            try:
                # Collect system metrics
                metrics = self._collect_metrics()
                
                if metrics:
                    # Log the metrics
                    self._log_metrics(metrics)
                
                # Sleep for configured interval
                check_interval = self.config.get('check_interval', 30)
                time.sleep(check_interval)
                
            except Exception as e:
                error_msg = f"Error in main loop: {e}"
                if self.logs_manager:
                    try:
                        self.logs_manager.log(
                            level='error',
                            message=error_msg,
                            component='services',
                            source='system_health_service',
                            details={'error': str(e)}
                        )
                    except:
                        eprint(f"System Health Monitor: {error_msg}")
                else:
                    eprint(f"System Health Monitor: {error_msg}")
                self.last_error = str(e)
                time.sleep(10)  # Wait longer after an error
        
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message="Main loop stopped",
                    component='services',
                    source='system_health_service'
                )
            except Exception as e:
                eprint(f"Failed to log main loop stop: {e}")
        else:
            print("System Health Monitor: Main loop stopped")

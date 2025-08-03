"""
Simple performance monitoring utilities for Sypnex OS
"""
import time
from functools import wraps

def monitor_performance(threshold=1.0):
    """
    Decorator to monitor performance of route functions.
    Logs slow requests over the threshold to logs manager.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            start = time.time()
            result = f(*args, **kwargs)
            duration = time.time() - start
            
            # Only log if slow (over threshold)
            if duration > threshold:
                # Try to get logs_manager from Flask app context
                try:
                    from flask import current_app
                    if hasattr(current_app, 'logs_manager'):
                        current_app.logs_manager.log(
                            level='warn',
                            message=f"Slow request detected: {f.__name__} took {duration:.2f}s (threshold: {threshold}s)",
                            component='core-os',
                            source='performance-monitor',
                            details={'function': f.__name__, 'duration_seconds': duration, 'threshold_seconds': threshold}
                        )
                    else:
                        print(f"🐌 SLOW REQUEST: {f.__name__} took {duration:.2f}s")
                except:
                    # Fallback to print if logging fails
                    print(f"🐌 SLOW REQUEST: {f.__name__} took {duration:.2f}s")
            
            return result
        return wrapper
    return decorator

def monitor_critical_performance(threshold=0.5):
    """
    Decorator for critical operations with custom threshold.
    Use for app launches, file operations, etc.
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            start = time.time()
            result = f(*args, **kwargs)
            duration = time.time() - start
            
            if duration > threshold:
                # Try to get logs_manager from Flask app context
                try:
                    from flask import current_app
                    if hasattr(current_app, 'logs_manager'):
                        current_app.logs_manager.log(
                            level='error',
                            message=f"Critical slow operation: {f.__name__} took {duration:.2f}s (threshold: {threshold}s)",
                            component='core-os',
                            source='performance-monitor',
                            details={'function': f.__name__, 'duration_seconds': duration, 'threshold_seconds': threshold}
                        )
                    else:
                        print(f"🚨 CRITICAL SLOW: {f.__name__} took {duration:.2f}s (threshold: {threshold}s)")
                except:
                    # Fallback to print if logging fails
                    print(f"🚨 CRITICAL SLOW: {f.__name__} took {duration:.2f}s (threshold: {threshold}s)")
            
            return result
        return wrapper
    return decorator

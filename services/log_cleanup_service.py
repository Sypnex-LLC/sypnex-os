#!/usr/bin/env python3
"""
Log Cleanup Service - Manages VFS log file sizes
"""

import time
from services.base_service import ServiceBase


class LogCleanupService(ServiceBase):
    """
    Log Cleanup Service that monitors VFS log directory and removes files >= 2MB.
    
    This service scans the /logs directory recursively and deletes files that
    exceed the configured size limit to prevent log directory from growing too large.
    """
    
    def __init__(self):
        super().__init__()
        self.total_scans = 0
        self.total_files_deleted = 0
        self.total_bytes_freed = 0
        self.last_scan_time = None
        self.last_scan_results = {
            'files_checked': 0,
            'files_deleted': 0,
            'bytes_freed': 0
        }
        
    def on_start(self):
        """Called when service starts."""
        message = "Log Cleanup Service starting up..."
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message=message,
                    component='services',
                    source='log_cleanup_service'
                )
            except Exception as e:
                print(f"Failed to log startup: {e}")
        else:
            print(message)
        
    def on_stop(self):
        """Called when service stops."""
        message = "Log Cleanup Service shutting down..."
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message=message,
                    component='services',
                    source='log_cleanup_service'
                )
            except Exception as e:
                print(f"Failed to log shutdown: {e}")
        else:
            print(message)
        
    def get_stats(self):
        """Return service-specific statistics."""
        return {
            'total_scans': self.total_scans,
            'total_files_deleted': self.total_files_deleted,
            'total_bytes_freed': self.total_bytes_freed,
            'last_scan_time': self.last_scan_time,
            'last_scan_files_checked': self.last_scan_results['files_checked'],
            'last_scan_files_deleted': self.last_scan_results['files_deleted'],
            'last_scan_bytes_freed': self.last_scan_results['bytes_freed']
        }
    
    def _scan_directory_recursive(self, directory_path, size_limit_mb):
        """
        Recursively scan directory for files exceeding size limit.
        Returns (files_checked, files_deleted, bytes_freed)
        """
        files_checked = 0
        files_deleted = 0
        bytes_freed = 0
        
        if not self.vfs_manager:
            if self.logs_manager:
                try:
                    self.logs_manager.log(
                        level='error',
                        message="VFS manager not available for log cleanup",
                        component='services',
                        source='log_cleanup_service'
                    )
                except:
                    print("Log Cleanup Service: VFS manager not available")
            return files_checked, files_deleted, bytes_freed
        
        try:
            # List directory contents
            items = self.vfs_manager.list_directory(directory_path)
            
            if not items:
                if self.logs_manager:
                    try:
                        self.logs_manager.log(
                            level='debug',
                            message=f"No items found in directory: {directory_path}",
                            component='services',
                            source='log_cleanup_service',
                            details={'directory_path': directory_path}
                        )
                    except:
                        print(f"Log Cleanup Service: No items in {directory_path}")
                return files_checked, files_deleted, bytes_freed
            
            # Debug log showing what we found
            if self.logs_manager:
                try:
                    self.logs_manager.log(
                        level='debug',
                        message=f"Found {len(items)} items in {directory_path}",
                        component='services',
                        source='log_cleanup_service',
                        details={'directory_path': directory_path, 'item_count': len(items)}
                    )
                except:
                    print(f"Log Cleanup Service: Found {len(items)} items in {directory_path}")
            
            for item in items:
                item_path = item.get('path', '')
                is_directory = item.get('is_directory', False)
                item_size = item.get('size', 0)
                
                # Debug log each item
                if self.logs_manager:
                    try:
                        self.logs_manager.log(
                            level='debug',
                            message=f"Processing item: {item_path}",
                            component='services',
                            source='log_cleanup_service',
                            details={
                                'path': item_path,
                                'is_directory': is_directory,
                                'size': item_size
                            }
                        )
                    except:
                        print(f"Log Cleanup Service: Processing {item_path} (dir: {is_directory}, size: {item_size})")
                
                if is_directory:
                    # Recursively scan subdirectories
                    sub_checked, sub_deleted, sub_freed = self._scan_directory_recursive(
                        item_path, size_limit_mb
                    )
                    files_checked += sub_checked
                    files_deleted += sub_deleted
                    bytes_freed += sub_freed
                    
                else:  # is a file
                    files_checked += 1
                    
                    # Convert size limit from MB to bytes
                    size_limit_bytes = size_limit_mb * 1024 * 1024
                    
                    if item_size >= size_limit_bytes:
                        # File is too large, delete it
                        try:
                            self.vfs_manager.delete_path(item_path)
                            files_deleted += 1
                            bytes_freed += item_size
                            
                            if self.logs_manager:
                                try:
                                    self.logs_manager.log(
                                        level='info',
                                        message=f"Deleted oversized log file: {item_path}",
                                        component='services',
                                        source='log_cleanup_service',
                                        details={
                                            'file_path': item_path,
                                            'file_size_mb': round(item_size / (1024 * 1024), 2),
                                            'size_limit_mb': size_limit_mb
                                        }
                                    )
                                except:
                                    print(f"Log Cleanup Service: Deleted {item_path} ({round(item_size / (1024 * 1024), 2)}MB)")
                                    
                        except Exception as e:
                            if self.logs_manager:
                                try:
                                    self.logs_manager.log(
                                        level='error',
                                        message=f"Failed to delete log file: {item_path}",
                                        component='services',
                                        source='log_cleanup_service',
                                        details={'file_path': item_path, 'error': str(e)}
                                    )
                                except:
                                    print(f"Log Cleanup Service: Failed to delete {item_path}: {e}")
                            
        except Exception as e:
            if self.logs_manager:
                try:
                    self.logs_manager.log(
                        level='error',
                        message=f"Error scanning directory: {directory_path}",
                        component='services',
                        source='log_cleanup_service',
                        details={'directory': directory_path, 'error': str(e)}
                    )
                except:
                    print(f"Log Cleanup Service: Error scanning {directory_path}: {e}")
        
        return files_checked, files_deleted, bytes_freed
    
    def _perform_cleanup(self):
        """Perform log cleanup scan."""
        # Get configuration
        size_limit_mb = self.config.get('size_limit_mb', 2)  # Default 2MB
        logs_directory = self.config.get('logs_directory', '/logs')
        
        scan_start_time = time.time()
        
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='debug',
                    message=f"Starting log cleanup scan of {logs_directory}",
                    component='services',
                    source='log_cleanup_service',
                    details={'size_limit_mb': size_limit_mb}
                )
            except:
                print(f"Log Cleanup Service: Starting scan of {logs_directory}")
        
        # Perform recursive scan
        files_checked, files_deleted, bytes_freed = self._scan_directory_recursive(
            logs_directory, size_limit_mb
        )
        
        # Update statistics
        self.total_scans += 1
        self.total_files_deleted += files_deleted
        self.total_bytes_freed += bytes_freed
        self.last_scan_time = scan_start_time
        self.last_scan_results = {
            'files_checked': files_checked,
            'files_deleted': files_deleted,
            'bytes_freed': bytes_freed
        }
        
        # Log scan results
        scan_duration = time.time() - scan_start_time
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message=f"Log cleanup scan completed",
                    component='services',
                    source='log_cleanup_service',
                    details={
                        'files_checked': files_checked,
                        'files_deleted': files_deleted,
                        'bytes_freed_mb': round(bytes_freed / (1024 * 1024), 2),
                        'scan_duration_seconds': round(scan_duration, 2)
                    }
                )
            except:
                print(f"Log Cleanup Service: Scan complete - checked {files_checked}, deleted {files_deleted}, freed {round(bytes_freed / (1024 * 1024), 2)}MB")
    
    def _run(self):
        """Main service loop."""
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message="Main loop started",
                    component='services',
                    source='log_cleanup_service'
                )
            except Exception as e:
                print(f"Failed to log main loop start: {e}")
        else:
            print("Log Cleanup Service: Main loop started")
        
        while not self.should_stop():
            try:
                # Perform cleanup scan
                self._perform_cleanup()
                
                # Sleep for configured interval
                cleanup_interval = self.config.get('cleanup_interval', 3600)  # Default 1 hour
                time.sleep(cleanup_interval)
                
            except Exception as e:
                error_msg = f"Error in main loop: {e}"
                if self.logs_manager:
                    try:
                        self.logs_manager.log(
                            level='error',
                            message=error_msg,
                            component='services',
                            source='log_cleanup_service',
                            details={'error': str(e)}
                        )
                    except:
                        print(f"Log Cleanup Service: {error_msg}")
                else:
                    print(f"Log Cleanup Service: {error_msg}")
                self.last_error = str(e)
                time.sleep(300)  # Wait 5 minutes after an error
        
        if self.logs_manager:
            try:
                self.logs_manager.log(
                    level='info',
                    message="Main loop stopped",
                    component='services',
                    source='log_cleanup_service'
                )
            except Exception as e:
                print(f"Failed to log main loop stop: {e}")
        else:
            print("Log Cleanup Service: Main loop stopped")

"""
Metrics routes for Sypnex OS - provides system metrics for external monitoring
These endpoints are designed to be consumed by orchestration systems for SaaS deployments
"""
from flask import jsonify
import os
from datetime import datetime

def register_metrics_routes(app, managers):
    """Register metrics routes"""
    
    @app.route('/api/metrics/vfs', methods=['GET'])
    def get_vfs_metrics():
        """
        Get Virtual File System metrics
        ---
        tags:
          - Metrics
        summary: Get VFS storage usage and statistics
        description: Returns detailed information about VFS storage usage, file counts, and database size
        responses:
          200:
            description: VFS metrics retrieved successfully
          500:
            description: Error retrieving VFS metrics
        """
        try:
            # Get VFS stats from the virtual file manager
            vfs_stats = managers['virtual_file_manager'].get_system_stats()
            
            # Get instance name directly from environment
            instance_name = os.getenv('INSTANCE_NAME', 'unknown')
            
            return jsonify({
                'success': True,
                'instance_name': instance_name,
                'data': vfs_stats
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/metrics/activity', methods=['GET'])
    def get_activity_metrics():
        """
        Get user activity metrics
        ---
        tags:
          - Metrics
        summary: Get login activity and security metrics
        description: Returns last login time and failed login attempts for security monitoring
        responses:
          200:
            description: Activity metrics retrieved successfully
          500:
            description: Error retrieving activity metrics
        """
        try:
            # Get last successful login
            last_login = managers['user_preferences'].get_preference('system', 'last_login', None)
            
            # Get failed login stats
            failed_count = managers['user_preferences'].get_preference('system', 'failed_login_count', 0)
            last_failed = managers['user_preferences'].get_preference('system', 'last_failed_login', None)
            
            # Get system configuration preferences (non-intrusive)
            developer_mode = managers['user_preferences'].get_preference('system', 'developer_mode', False)
            app_scale = managers['user_preferences'].get_preference('ui', 'app_scale', 1.0)
            show_notifications = managers['user_preferences'].get_preference('system', 'show_notifications', True)
            welcome_completed = managers['user_preferences'].get_preference('system', 'welcome_completed', False)
            
            # Calculate days since last login
            days_since_login = None
            if last_login:
                try:
                    last_login_dt = datetime.fromisoformat(last_login.replace('Z', '+00:00'))
                    days_since_login = (datetime.now() - last_login_dt).days
                except:
                    days_since_login = None
            
            # Get instance name directly from environment
            instance_name = os.getenv('INSTANCE_NAME', 'unknown')
            
            return jsonify({
                'success': True,
                'instance_name': instance_name,
                'data': {
                    'last_login': last_login,
                    'days_since_login': days_since_login,
                    'failed_login_count': failed_count,
                    'last_failed_login': last_failed,
                    'system_config': {
                        'developer_mode': developer_mode,
                        'app_scale': app_scale,
                        'show_notifications': show_notifications,
                        'welcome_completed': welcome_completed
                    },
                    'collected_at': datetime.now().isoformat()
                }
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

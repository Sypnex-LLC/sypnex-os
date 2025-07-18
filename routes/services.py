"""
Service management routes for the Sypnex OS application
"""
from flask import request, jsonify

def register_service_routes(app, managers):
    """Register service management routes"""
    
    @app.route('/api/services', methods=['GET'])
    def get_services():
        """Get all services"""
        try:
            services = managers['service_manager'].get_all_services()
            return jsonify({
                'services': services,
                'total': len(services)
            })
        except Exception as e:
            print(f"Error getting services: {e}")
            return jsonify({'error': 'Failed to get services'}), 500

    @app.route('/api/services/<service_id>', methods=['GET'])
    def get_service(service_id):
        """Get a specific service"""
        try:
            service = managers['service_manager'].get_service(service_id)
            if not service:
                return jsonify({'error': 'Service not found'}), 404
            return jsonify(service)
        except Exception as e:
            print(f"Error getting service {service_id}: {e}")
            return jsonify({'error': 'Failed to get service'}), 500

    @app.route('/api/services/<service_id>/start', methods=['POST'])
    def start_service(service_id):
        """Start a service"""
        try:
            success = managers['service_manager'].start_service(service_id)
            if success:
                return jsonify({'message': f'Service {service_id} started successfully'})
            else:
                return jsonify({'error': f'Failed to start service {service_id}'}), 400
        except Exception as e:
            print(f"Error starting service {service_id}: {e}")
            return jsonify({'error': 'Failed to start service'}), 500

    @app.route('/api/services/<service_id>/stop', methods=['POST'])
    def stop_service(service_id):
        """Stop a service"""
        try:
            success = managers['service_manager'].stop_service(service_id)
            if success:
                return jsonify({'message': f'Service {service_id} stopped successfully'})
            else:
                return jsonify({'error': f'Failed to stop service {service_id}'}), 400
        except Exception as e:
            print(f"Error stopping service {service_id}: {e}")
            return jsonify({'error': 'Failed to stop service'}), 500

    @app.route('/api/services/<service_id>/logs', methods=['GET'])
    def get_service_logs(service_id):
        """Get logs for a service"""
        try:
            limit = request.args.get('limit', 50, type=int)
            logs = managers['service_manager'].get_service_logs(service_id, limit)
            return jsonify({
                'service_id': service_id,
                'logs': logs,
                'total': len(logs)
            })
        except Exception as e:
            print(f"Error getting logs for service {service_id}: {e}")
            return jsonify({'error': 'Failed to get service logs'}), 500

    @app.route('/api/services/refresh', methods=['POST'])
    def refresh_services():
        """Refresh service discovery"""
        try:
            result = managers['service_manager'].refresh_services()
            return jsonify({
                'message': 'Services refreshed successfully',
                'services': result['services'],
                'discovered': result['discovered']
            })
        except Exception as e:
            print(f"Error refreshing services: {e}")
            return jsonify({'error': 'Failed to refresh services'}), 500

    @app.route('/api/services/<service_id>/config', methods=['GET'])
    def get_service_config(service_id):
        """Get configuration for a service"""
        try:
            from services.config_manager import get_config_manager
            config_manager = get_config_manager()
            config = config_manager.load_config(service_id)
            return jsonify({
                'service_id': service_id,
                'config': config
            })
        except Exception as e:
            print(f"Error getting config for service {service_id}: {e}")
            return jsonify({'error': 'Failed to get service config'}), 500

    @app.route('/api/services/<service_id>/config', methods=['POST'])
    def update_service_config(service_id):
        """Update configuration for a service"""
        try:
            data = request.json
            if not data:
                return jsonify({'error': 'No configuration data provided'}), 400
            
            from services.config_manager import get_config_manager
            config_manager = get_config_manager()
            success = config_manager.update_config(service_id, data)
            
            if success:
                # Update running service if it exists
                service = managers['service_manager'].services.get(service_id)
                if service and hasattr(service, 'update_config'):
                    service.update_config(data)
                
                return jsonify({
                    'message': f'Configuration updated for service {service_id}',
                    'service_id': service_id
                })
            else:
                return jsonify({'error': 'Failed to update service configuration'}), 500
        except Exception as e:
            print(f"Error updating config for service {service_id}: {e}")
            return jsonify({'error': 'Failed to update service config'}), 500 
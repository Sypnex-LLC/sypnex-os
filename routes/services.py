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
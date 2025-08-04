"""
Flow Runner API proxy routes
Proxies requests to the sidecar Flow Runner API
"""
import requests
from flask import request, jsonify

def register_flow_runner_routes(app, managers):
    """Register Flow Runner API proxy routes"""
    
    FLOW_RUNNER_BASE_URL = "http://localhost:8080"
    
    @app.route('/api/flow-runner/jobs', methods=['GET'])
    def flow_runner_get_jobs():
        """Proxy GET requests to Flow Runner jobs API"""
        try:
            response = requests.get(f"{FLOW_RUNNER_BASE_URL}/api/jobs", timeout=10)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Flow Runner API unavailable: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500
    
    @app.route('/api/flow-runner/jobs', methods=['POST'])
    def flow_runner_submit_job():
        """Proxy POST requests to Flow Runner jobs API"""
        try:
            # Forward the JSON data from the request
            response = requests.post(
                f"{FLOW_RUNNER_BASE_URL}/api/jobs",
                json=request.get_json(),
                timeout=10
            )
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Flow Runner API unavailable: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500
    
    @app.route('/api/flow-runner/jobs/<job_id>', methods=['GET'])
    def flow_runner_get_job(job_id):
        """Proxy GET requests for specific job"""
        try:
            response = requests.get(f"{FLOW_RUNNER_BASE_URL}/api/jobs/{job_id}", timeout=10)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Flow Runner API unavailable: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500
    
    @app.route('/api/flow-runner/jobs/<job_id>', methods=['DELETE'])
    def flow_runner_cancel_job(job_id):
        """Proxy DELETE requests to cancel job"""
        try:
            response = requests.delete(f"{FLOW_RUNNER_BASE_URL}/api/jobs/{job_id}", timeout=10)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Flow Runner API unavailable: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500
    
    @app.route('/api/flow-runner/jobs/<job_id>/delete', methods=['DELETE'])
    def flow_runner_delete_job(job_id):
        """Proxy DELETE requests to permanently delete job"""
        try:
            response = requests.delete(f"{FLOW_RUNNER_BASE_URL}/api/jobs/{job_id}/delete", timeout=10)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Flow Runner API unavailable: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500
    
    @app.route('/api/flow-runner/stats', methods=['GET'])
    def flow_runner_get_stats():
        """Proxy GET requests to Flow Runner stats API"""
        try:
            response = requests.get(f"{FLOW_RUNNER_BASE_URL}/api/stats", timeout=10)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Flow Runner API unavailable: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500
    
    @app.route('/api/flow-runner/health', methods=['GET'])
    def flow_runner_health():
        """Proxy GET requests to Flow Runner health check"""
        try:
            response = requests.get(f"{FLOW_RUNNER_BASE_URL}/api/health", timeout=5)
            return jsonify(response.json()), response.status_code
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Flow Runner API unavailable: {str(e)}'}), 503
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500

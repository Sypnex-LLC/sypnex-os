"""
System routes for the Sypnex OS application
"""
from flask import request, jsonify
import requests
import base64

def register_system_routes(app, managers):
    """Register system routes"""
    
    @app.route('/api/proxy/http', methods=['POST'])
    def http_proxy():
        """Proxy HTTP requests for user apps to bypass CORS restrictions"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No request data provided'}), 400
            
            url = data.get('url')
            method = data.get('method', 'GET')
            headers = data.get('headers', {})
            body = data.get('body')
            timeout = data.get('timeout', 30)
            
            if not url:
                return jsonify({'error': 'URL is required'}), 400
            
            # Make the request
            # Use json parameter for JSON requests, data for other content types
            if method.upper() == 'POST' and headers.get('Content-Type', '').lower() == 'application/json':
                response = requests.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=body,
                    timeout=timeout,
                    allow_redirects=True
                )
            else:
                response = requests.request(
                    method=method,
                    url=url,
                    headers=headers,
                    data=body,
                    timeout=timeout,
                    allow_redirects=True
                )
            
            # Check if response is binary
            content_type = response.headers.get('content-type', '').lower()
            is_binary = any(binary_type in content_type for binary_type in ['audio/', 'image/', 'application/octet-stream', 'video/'])
            
            if is_binary:
                # For binary data, return base64 encoded content
                content = base64.b64encode(response.content).decode('utf-8')
            else:
                # For text data, return as text
                content = response.text
            
            # Return response data
            return jsonify({
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'content': content,
                'is_binary': is_binary,
                'url': response.url
            })
            
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Request failed: {str(e)}'}), 500
        except Exception as e:
            return jsonify({'error': f'Proxy error: {str(e)}'}), 500

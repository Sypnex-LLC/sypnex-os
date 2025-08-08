"""
SypnexOS Core - Cryptographic Operations Routes
Provides generic encrypt/decrypt endpoints for user applications
"""

from flask import Blueprint, request, jsonify
import json

def register_crypto_routes(app, managers):
    """Register crypto routes with the Flask application"""
    user_preferences = managers['user_preferences']
    
    @app.route('/api/crypto/encrypt', methods=['POST'])
    def encrypt_value():
        """
        Encrypt a value using the instance's SESSION_SECRET_KEY
        
        POST /api/crypto/encrypt
        {
            "value": "secret-data-to-encrypt"
        }
        
        Returns:
        {
            "success": true,
            "encrypted": "gAAAAABhZ8x7..."
        }
        """
        try:
            data = request.get_json()
            if not data or 'value' not in data:
                return jsonify({
                    'success': False,
                    'error': 'Missing "value" field in request body'
                }), 400
            
            value = data['value']
            if not isinstance(value, str):
                # Convert non-strings to JSON string for encryption
                value = json.dumps(value)
            
            # Use the existing encryption method from UserPreferences
            encrypted_value = user_preferences._encrypt_value(value)
            
            return jsonify({
                'success': True,
                'encrypted': encrypted_value
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Encryption failed: {str(e)}'
            }), 500
    
    @app.route('/api/crypto/decrypt', methods=['POST'])
    def decrypt_value():
        """
        Decrypt a value using the instance's SESSION_SECRET_KEY
        
        POST /api/crypto/decrypt
        {
            "encrypted": "gAAAAABhZ8x7..."
        }
        
        Returns:
        {
            "success": true,
            "value": "decrypted-data"
        }
        """
        try:
            data = request.get_json()
            if not data or 'encrypted' not in data:
                return jsonify({
                    'success': False,
                    'error': 'Missing "encrypted" field in request body'
                }), 400
            
            encrypted_value = data['encrypted']
            if not isinstance(encrypted_value, str):
                return jsonify({
                    'success': False,
                    'error': 'Encrypted value must be a string'
                }), 400
            
            # Use the existing decryption method from UserPreferences
            decrypted_value = user_preferences._decrypt_value(encrypted_value)
            
            return jsonify({
                'success': True,
                'value': decrypted_value
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Decryption failed: {str(e)}'
            }), 500
    
    @app.route('/api/crypto/status', methods=['GET'])
    def crypto_status():
        """
        Check if cryptographic services are available
        
        GET /api/crypto/status
        
        Returns:
        {
            "success": true,
            "encryption_available": true,
            "algorithm": "Fernet (AES 128)"
        }
        """
        try:
            # Test encryption availability
            test_value = "test"
            encrypted = user_preferences._encrypt_value(test_value)
            decrypted = user_preferences._decrypt_value(encrypted)
            
            return jsonify({
                'success': True,
                'encryption_available': decrypted == test_value,
                'algorithm': 'Fernet (AES 128)',
                'key_source': 'SESSION_SECRET_KEY environment variable'
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'encryption_available': False,
                'error': str(e)
            }), 500

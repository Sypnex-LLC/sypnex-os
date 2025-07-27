"""
Authentication routes for Sypnex OS
Handles login, logout, and session management
"""
from flask import request, jsonify, render_template, redirect, url_for, make_response
from app_config import verify_password, create_session_token, validate_session_token, get_active_sessions
import json

def register_auth_routes(app, managers):
    """Register authentication routes"""
    
    @app.route('/login', methods=['GET'])
    def login_page():
        """Display the login page"""
        return render_template('login.html')
    
    @app.route('/login', methods=['POST'])
    def login_submit():
        """Handle login form submission"""
        try:
            data = request.get_json() if request.is_json else request.form
            username = data.get('username', '').strip()
            password = data.get('password', '')
            
            if not username or not password:
                return jsonify({'error': 'Username and password are required'}), 400
            
            # Verify credentials
            if verify_password(username, password):
                # Create session token
                session_token = create_session_token(username)
                
                if request.is_json:
                    # API response
                    return jsonify({
                        'success': True,
                        'message': f'Welcome back, {username}!',
                        'session_token': session_token,
                        'redirect': '/'
                    })
                else:
                    # Form response - redirect to main page with token in cookie
                    response = make_response(redirect('/'))
                    # Set cookie with 24-hour expiration
                    response.set_cookie('session_token', session_token, 
                                      max_age=24*60*60, httponly=False, secure=False, samesite='Lax')
                    return response
            else:
                error_msg = 'Invalid username or password'
                if request.is_json:
                    return jsonify({'error': error_msg}), 401
                else:
                    return render_template('login.html', error=error_msg), 401
                    
        except Exception as e:
            error_msg = f'Login failed: {str(e)}'
            if request.is_json:
                return jsonify({'error': error_msg}), 500
            else:
                return render_template('login.html', error=error_msg), 500
    
    @app.route('/logout', methods=['POST'])
    def logout():
        """Handle logout - JWT is stateless, just clear client-side storage"""
        try:
            # With JWT, logout is handled client-side by clearing the token
            # No server-side session to invalidate
            
            if request.is_json:
                return jsonify({
                    'success': True, 
                    'message': 'Logged out successfully',
                    'note': 'JWT token cleared client-side'
                })
            else:
                response = make_response(redirect('/login'))
                response.set_cookie('session_token', '', expires=0)
                return response
                
        except Exception as e:
            return jsonify({'error': f'Logout failed: {str(e)}'}), 500
    
    @app.route('/api/auth/status')
    def auth_status():
        """Check authentication status"""
        try:
            # Get token from header or cookie (removed URL parameter fallback)
            token = (request.headers.get('X-Session-Token') or 
                    request.cookies.get('session_token'))
            
            username = validate_session_token(token) if token else None
            
            if username:
                return jsonify({
                    'authenticated': True,
                    'username': username,
                    'token': token
                })
            else:
                return jsonify({'authenticated': False}), 401
                
        except Exception as e:
            return jsonify({'error': f'Auth status check failed: {str(e)}'}), 500
    
    @app.route('/api/auth/sessions')
    def list_sessions():
        """List active sessions (for debugging)"""
        try:
            # Require authentication to view sessions
            token = (request.headers.get('X-Session-Token') or 
                    request.cookies.get('session_token'))
            
            if not validate_session_token(token):
                return jsonify({'error': 'Authentication required'}), 401
            
            sessions = get_active_sessions()
            return jsonify({
                'active_sessions': sessions,
                'total_count': len(sessions)
            })
            
        except Exception as e:
            return jsonify({'error': f'Failed to list sessions: {str(e)}'}), 500

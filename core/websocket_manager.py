from flask import Blueprint, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import threading
import time
from datetime import datetime
from core.system_boot_manager import get_system_boot_manager

class WebSocketManager:
    def __init__(self, logs_manager=None):
        self.logs_manager = logs_manager
        print("WebSocketManager: Initializing...")
        self.blueprint = None  # Will be created in register_routes
        self.socketio = None  # Will be initialized in register_routes
        self.connected_clients = {}  # Track connected clients
        self.rooms = {}  # Track room memberships
        self.message_history = {}  # Store message history per room
        self.max_history = 100  # Maximum messages to keep per room
        
        # Connection health monitoring
        self.connection_timeout = 300  # 5 minutes timeout for dead connections
        self.cleanup_interval = 60  # Check every minute
        self.cleanup_thread = None
        self.running = False
        
        # Get system boot manager for proper uptime tracking
        self.boot_manager = get_system_boot_manager()
        
        print("WebSocketManager: Initialized successfully")

    def get_info(self):
        return {
            'id': 'websocket_server',
            'name': 'WebSocket Server',
            'icon': 'fas fa-network-wired',
            'description': 'Provides real-time WebSocket communication for applications.',
            'keywords': ['websocket', 'real-time', 'communication', 'socket', 'core service'],
            'template': 'None',
            'type': 'system'
        }

    def register_routes(self, app):
        """
        Registers the WebSocket server blueprint with the main Flask app.
        """
        print("WebSocketManager: Registering routes...")
        self.blueprint = Blueprint('websocket_service', __name__, url_prefix='/api/websocket')

        # Initialize SocketIO with the Flask app
        self.socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
        
        # Register SocketIO event handlers
        self._register_socket_events()

        @self.blueprint.route('/status', methods=['GET'])
        def get_websocket_status():
            """Get WebSocket server status and statistics."""
            return jsonify({
                'status': 'running',
                'connected_clients': len(self.connected_clients),
                'active_rooms': len(self.rooms),
                'total_rooms': sum(len(members) for members in self.rooms.values()),
                'uptime': self._get_uptime(),
                'message_history_count': sum(len(history) for history in self.message_history.values()),
                'cleanup': {
                    'enabled': self.running,
                    'timeout_seconds': self.connection_timeout,
                    'check_interval_seconds': self.cleanup_interval,
                    'cleanup_thread_active': self.cleanup_thread and self.cleanup_thread.is_alive()
                }
            })

        @self.blueprint.route('/rooms', methods=['GET'])
        def get_rooms():
            """Get all active rooms and their member counts."""
            room_info = []
            for room_name, members in self.rooms.items():
                room_info.append({
                    'name': room_name,
                    'member_count': len(members),
                    'members': list(members)
                })
            return jsonify({
                'rooms': room_info,
                'total_rooms': len(self.rooms)
            })

        @self.blueprint.route('/rooms/<room_name>/messages', methods=['GET'])
        def get_room_messages(room_name):
            """Get message history for a specific room."""
            limit = request.args.get('limit', 50, type=int)
            messages = self.message_history.get(room_name, [])
            return jsonify({
                'room': room_name,
                'messages': messages[-limit:],  # Return last N messages
                'total_messages': len(messages)
            })

        @self.blueprint.route('/broadcast', methods=['POST'])
        def broadcast_message():
            """Broadcast a message to all connected clients."""
            data = request.get_json()
            if not data or 'message' not in data:
                return jsonify({'error': 'message is required'}), 400
            
            message = data['message']
            room = data.get('room', 'global')
            event_type = data.get('event_type', 'broadcast')
            
            try:
                self.socketio.emit(event_type, {
                    'message': message,
                    'timestamp': datetime.now().isoformat(),
                    'sender': 'system'
                }, room=room)
                
                # Store in history if it's a room message
                if room != 'global':
                    self._store_message(room, {
                        'message': message,
                        'timestamp': datetime.now().isoformat(),
                        'sender': 'system',
                        'event_type': event_type
                    })
                
                return jsonify({
                    'message': f'Message broadcasted to {room}',
                    'event_type': event_type,
                    'room': room
                })
            except Exception as e:
                return jsonify({'error': f'Failed to broadcast message: {str(e)}'}), 500

        @self.blueprint.route('/clients', methods=['GET'])
        def get_connected_clients():
            """Get information about connected clients."""
            client_info = []
            for client_id, client_data in self.connected_clients.items():
                client_info.append({
                    'id': client_id,
                    'connected_at': client_data.get('connected_at'),
                    'rooms': client_data.get('rooms', []),
                    'last_activity': client_data.get('last_activity')
                })
            return jsonify({
                'clients': client_info,
                'total_clients': len(self.connected_clients)
            })

        @self.blueprint.route('/cleanup', methods=['POST'])
        def trigger_cleanup():
            """Manually trigger cleanup of dead connections."""
            try:
                cleaned_count = self.cleanup_dead_connections_now()
                return jsonify({
                    'message': f'Cleanup completed',
                    'cleaned_connections': cleaned_count,
                    'remaining_clients': len(self.connected_clients),
                    'timeout_seconds': self.connection_timeout
                })
            except Exception as e:
                return jsonify({'error': f'Cleanup failed: {str(e)}'}), 500

        # Register the blueprint with the main app
        app.register_blueprint(self.blueprint)
        print(f"WebSocketManager: Blueprint registered with prefix {self.blueprint.url_prefix}")

        # Make the WebSocketManager instance globally accessible via the app object
        app.websocket_manager = self
        print("WebSocketManager: WebSocketManager instance made available via app.websocket_manager")
        
        # Start connection health monitoring
        self.start_connection_cleanup()

    def _register_socket_events(self):
        """Register SocketIO event handlers."""
        
        @self.socketio.on('connect')
        def handle_connect():
            """Handle client connection."""
            client_id = request.sid
            self.connected_clients[client_id] = {
                'connected_at': datetime.now().isoformat(),
                'rooms': [],
                'last_activity': datetime.now().isoformat()
            }
            print(f"Client connected: {client_id}")
            
            # Send welcome message
            emit('welcome', {
                'message': 'Connected to WebSocket server',
                'client_id': client_id,
                'timestamp': datetime.now().isoformat()
            })

        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Handle client disconnection."""
            client_id = request.sid
            if client_id in self.connected_clients:
                # Remove from all rooms
                client_rooms = self.connected_clients[client_id].get('rooms', [])
                for room in client_rooms:
                    if room in self.rooms and client_id in self.rooms[room]:
                        self.rooms[room].remove(client_id)
                        if not self.rooms[room]:  # Remove empty rooms
                            del self.rooms[room]
                
                # Remove client
                del self.connected_clients[client_id]
                print(f"Client disconnected: {client_id}")

        @self.socketio.on('join_room')
        def handle_join_room(data):
            """Handle room join request."""
            client_id = request.sid
            room_name = data.get('room', 'default')
            
            join_room(room_name)
            
            # Track room membership
            if room_name not in self.rooms:
                self.rooms[room_name] = set()
            self.rooms[room_name].add(client_id)
            
            # Update client's room list
            if client_id in self.connected_clients:
                if 'rooms' not in self.connected_clients[client_id]:
                    self.connected_clients[client_id]['rooms'] = []
                if room_name not in self.connected_clients[client_id]['rooms']:
                    self.connected_clients[client_id]['rooms'].append(room_name)
            
            # Notify room members
            emit('user_joined', {
                'client_id': client_id,
                'room': room_name,
                'timestamp': datetime.now().isoformat()
            }, room=room_name)
            
            print(f"Client {client_id} joined room: {room_name}")

        @self.socketio.on('leave_room')
        def handle_leave_room(data):
            """Handle room leave request."""
            client_id = request.sid
            room_name = data.get('room', 'default')
            
            leave_room(room_name)
            
            # Remove from room tracking
            if room_name in self.rooms and client_id in self.rooms[room_name]:
                self.rooms[room_name].remove(client_id)
                if not self.rooms[room_name]:  # Remove empty rooms
                    del self.rooms[room_name]
            
            # Update client's room list
            if client_id in self.connected_clients and 'rooms' in self.connected_clients[client_id]:
                if room_name in self.connected_clients[client_id]['rooms']:
                    self.connected_clients[client_id]['rooms'].remove(room_name)
            
            # Notify room members
            emit('user_left', {
                'client_id': client_id,
                'room': room_name,
                'timestamp': datetime.now().isoformat()
            }, room=room_name)
            
            print(f"Client {client_id} left room: {room_name}")

        @self.socketio.on('message')
        def handle_message(data):
            """Handle incoming messages."""
            client_id = request.sid
            message = data.get('message', '')
            room = data.get('room', 'global')
            event_type = data.get('event_type', 'message')
            
            # Update last activity
            if client_id in self.connected_clients:
                self.connected_clients[client_id]['last_activity'] = datetime.now().isoformat()
            
            # Store message in history
            message_data = {
                'message': message,
                'client_id': client_id,
                'timestamp': datetime.now().isoformat(),
                'event_type': event_type
            }
            
            if room != 'global':
                self._store_message(room, message_data)
            
            # Broadcast to room
            emit(event_type, message_data, room=room)
            
            print(f"Message from {client_id} in {room}: {message}")

        @self.socketio.on('ping')
        def handle_ping():
            """Handle ping for connection health check."""
            client_id = request.sid
            if client_id in self.connected_clients:
                self.connected_clients[client_id]['last_activity'] = datetime.now().isoformat()
            
            emit('pong', {
                'timestamp': datetime.now().isoformat(),
                'client_id': client_id
            })

    def _store_message(self, room, message_data):
        """Store message in history for a room."""
        if room not in self.message_history:
            self.message_history[room] = []
        
        self.message_history[room].append(message_data)
        
        # Limit history size
        if len(self.message_history[room]) > self.max_history:
            self.message_history[room] = self.message_history[room][-self.max_history:]

    def _get_uptime(self):
        """Get actual server uptime since last boot."""
        return self.boot_manager.get_websocket_uptime()

    def broadcast_to_room(self, room, event_type, data):
        """Broadcast a message to a specific room."""
        if self.socketio:
            self.socketio.emit(event_type, data, room=room)
            return True
        return False

    def broadcast_to_all(self, event_type, data):
        """Broadcast a message to all connected clients."""
        if self.socketio:
            self.socketio.emit(event_type, data)
            return True
        return False

    def get_connected_clients_count(self):
        """Get the number of connected clients."""
        return len(self.connected_clients)

    def get_active_rooms_count(self):
        """Get the number of active rooms."""
        return len(self.rooms)
    
    def start_connection_cleanup(self):
        """Start the background thread for cleaning up dead connections."""
        if self.cleanup_thread is None or not self.cleanup_thread.is_alive():
            self.running = True
            self.cleanup_thread = threading.Thread(target=self._cleanup_dead_connections, daemon=True)
            self.cleanup_thread.start()
            print("WebSocketManager: Connection cleanup thread started")
    
    def cleanup_dead_connections_now(self):
        """Manually trigger cleanup of dead connections (safe to call from Flask routes)."""
        try:
            current_time = datetime.now()
            dead_clients = []
            
            # Check each client for timeout
            for client_id, client_data in self.connected_clients.items():
                last_activity_str = client_data.get('last_activity')
                if last_activity_str:
                    try:
                        last_activity = datetime.fromisoformat(last_activity_str)
                        time_diff = (current_time - last_activity).total_seconds()
                        
                        if time_diff > self.connection_timeout:
                            dead_clients.append(client_id)
                            print(f"WebSocketManager: Marking client {client_id} as dead (inactive for {time_diff:.1f}s)")
                    except ValueError:
                        # Invalid timestamp, mark as dead
                        dead_clients.append(client_id)
                        print(f"WebSocketManager: Marking client {client_id} as dead (invalid timestamp)")
                else:
                    # No activity timestamp, mark as dead
                    dead_clients.append(client_id)
                    print(f"WebSocketManager: Marking client {client_id} as dead (no activity timestamp)")
            
            # Remove dead clients
            for client_id in dead_clients:
                self._remove_dead_client(client_id)
            
            if dead_clients:
                print(f"WebSocketManager: Cleaned up {len(dead_clients)} dead connections")
                return len(dead_clients)
            return 0
            
        except Exception as e:
            print(f"WebSocketManager: Error in connection cleanup: {e}")
            return 0
    
    def stop_connection_cleanup(self):
        """Stop the background cleanup thread."""
        self.running = False
        if self.cleanup_thread and self.cleanup_thread.is_alive():
            self.cleanup_thread.join(timeout=5)
            print("WebSocketManager: Connection cleanup thread stopped")
    
    def _cleanup_dead_connections(self):
        """Background thread to clean up dead connections."""
        while self.running:
            try:
                # Use the same logic as the manual cleanup method
                cleaned_count = self.cleanup_dead_connections_now()
                if cleaned_count > 0:
                    print(f"WebSocketManager: Background cleanup removed {cleaned_count} dead connections")
                
            except Exception as e:
                print(f"WebSocketManager: Error in background connection cleanup: {e}")
            
            # Sleep for the cleanup interval
            time.sleep(self.cleanup_interval)
    
    def _remove_dead_client(self, client_id):
        """Remove a dead client and clean up its resources."""
        try:
            if client_id in self.connected_clients:
                # Remove from all rooms
                client_rooms = self.connected_clients[client_id].get('rooms', [])
                for room in client_rooms:
                    if room in self.rooms and client_id in self.rooms[room]:
                        self.rooms[room].remove(client_id)
                        if not self.rooms[room]:  # Remove empty rooms
                            del self.rooms[room]
                
                # Remove client
                del self.connected_clients[client_id]
                print(f"WebSocketManager: Removed dead client {client_id}")
                
        except Exception as e:
            print(f"WebSocketManager: Error removing dead client {client_id}: {e}")
    
    def set_connection_timeout(self, timeout_seconds):
        """Set the connection timeout for dead connection detection."""
        self.connection_timeout = timeout_seconds
        print(f"WebSocketManager: Connection timeout set to {timeout_seconds} seconds")
    
    def set_cleanup_interval(self, interval_seconds):
        """Set the cleanup interval for dead connection checks."""
        self.cleanup_interval = interval_seconds
        print(f"WebSocketManager: Cleanup interval set to {interval_seconds} seconds") 
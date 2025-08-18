// SypnexAPI Socket - WebSocket communication
// This file extends the SypnexAPI class with Socket.IO functionality

// Extend SypnexAPI with socket methods
Object.assign(SypnexAPI.prototype, {
    
    // Socket.IO instance for this app (sandboxed)
    socket: null,
    socketConnected: false,
    socketEventListeners: new Map(), // Store event listeners
    socketUrl: window.location.origin, // Default to same origin
    
    // Auto-reconnect settings
    autoReconnect: true,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000, // Start with 1 second
    maxReconnectDelay: 30000, // Max 30 seconds
    reconnectTimer: null,
    roomsToRejoin: new Set(), // Track rooms to rejoin after reconnect
    manualDisconnect: false, // Track if disconnect was manual
    
    // Connection health monitoring
    healthCheckInterval: 30000, // 30 seconds
    healthCheckTimer: null,
    enableHealthChecks: true,
    
    /**
     * Connect to Socket.IO server for this app instance
     * @param {string} url - Socket.IO server URL (defaults to current origin)
     * @param {object} options - Socket.IO connection options
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} - Connection success status
     */
    async connectSocket(url = null, options = {}) {
        try {
            // Use provided URL or default to current origin
            const socketUrl = url || this.socketUrl;
            
            // Connect to default namespace (same as websocket-server.html)
            // App sandboxing is handled through app-specific data in messages
            const fullUrl = socketUrl;
            
            // Default options for app sandboxing
            const defaultOptions = {
                transports: ['websocket', 'polling'],
                autoConnect: true,
                forceNew: true, // Ensure new connection for each app
                reconnection: this.autoReconnect,
                reconnectionAttempts: this.maxReconnectAttempts,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: this.maxReconnectDelay,
                timeout: 20000,
                ...options
            };
            
            // Create Socket.IO instance
            this.socket = io(fullUrl, defaultOptions);
            
            // Suppress WebSocket errors during disconnect
            if (this.socket.io && this.socket.io.engine) {
                const originalOnError = this.socket.io.engine.onerror;
                this.socket.io.engine.onerror = (error) => {
                    // Only log errors if not during manual disconnect
                    if (!this.manualDisconnect) {
                        if (originalOnError) {
                            originalOnError.call(this.socket.io.engine, error);
                        }
                    }
                };
            }
            
            // Set up connection event handlers
            this.socket.on('connect', () => {
                this.socketConnected = true;
                this._triggerEvent('socket_connected', { appId: this.appId });
                
                // Send app identification message
                this.socket.emit('app_connect', {
                    appId: this.appId,
                    timestamp: Date.now()
                });
                
                // Start health checks
                this.startHealthChecks();
            });
            
            this.socket.on('disconnect', (reason) => {
                this.socketConnected = false;
                this._triggerEvent('socket_disconnected', { appId: this.appId, reason });
                
                // Don't auto-reconnect if it was a manual disconnect
                if (this.manualDisconnect) {
                    this.manualDisconnect = false;
                    return;
                }
                
                // Start auto-reconnect if enabled
                if (this.autoReconnect && reason !== 'io client disconnect') {
                    this._scheduleReconnect();
                }
            });
            
            this.socket.on('connect_error', (error) => {
                // Don't log connection errors during manual disconnect
                if (!this.manualDisconnect) {
                    console.error(`SypnexAPI [${this.appId}]: Socket.IO connection error:`, error);
                    this._triggerEvent('socket_error', { appId: this.appId, error: error.message });
                }
            });
            
            // Socket.IO reconnection events
            this.socket.on('reconnect_attempt', (attemptNumber) => {
                this._triggerEvent('reconnect_attempt', { appId: this.appId, attempt: attemptNumber });
            });
            
            this.socket.on('reconnect', (attemptNumber) => {
                this.socketConnected = true;
                this.reconnectAttempts = 0;
                this._triggerEvent('reconnected', { appId: this.appId, attempts: attemptNumber });
                
                // Rejoin rooms after reconnection
                this._rejoinRooms();
            });
            
            this.socket.on('reconnect_error', (error) => {
                console.error(`SypnexAPI [${this.appId}]: Reconnection error:`, error);
                this._triggerEvent('reconnect_error', { appId: this.appId, error: error.message });
            });
            
            this.socket.on('reconnect_failed', () => {
                console.error(`SypnexAPI [${this.appId}]: Reconnection failed after ${this.maxReconnectAttempts} attempts`);
                this._triggerEvent('reconnect_failed', { appId: this.appId, attempts: this.maxReconnectAttempts });
            });
            
            // Wait for connection
            return new Promise((resolve) => {
                if (this.socket.connected) {
                    resolve(true);
                } else {
                    this.socket.once('connect', () => resolve(true));
                    this.socket.once('connect_error', () => resolve(false));
                }
            });
            
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error connecting to Socket.IO:`, error);
            return false;
        }
    },
    
    /**
@memberof SypnexAPI.prototype
     * Disconnect from Socket.IO server
     */
    disconnectSocket() {
        if (this.socket) {
            this.manualDisconnect = true; // Mark as manual disconnect
            this.stopHealthChecks(); // Stop health checks
            this.socket.disconnect();
            this.socket = null;
            this.socketConnected = false;
            this.roomsToRejoin.clear(); // Clear rooms to rejoin
        }
    },
    
    /**
     * Check if Socket.IO is connected
     * @memberof SypnexAPI.prototype
     * @returns {boolean} - Connection status
     */
    isSocketConnected() {
        return this.socketConnected && this.socket && this.socket.connected;
    },
    
    /**
     * Send a message via Socket.IO
     * @param {string} event - Event name
     * @param {any} data - Data to send
     * @param {string} room - Room to send to (optional)
     * @memberof SypnexAPI.prototype
     * @returns {boolean} - Success status
     */
    sendMessage(event, data, room = null) {
        if (!this.isSocketConnected()) {
            console.error(`SypnexAPI [${this.appId}]: Cannot send message - not connected`);
            return false;
        }
        
        try {
            const messageData = {
                appId: this.appId,
                data: data,
                timestamp: Date.now()
            };
            
            if (room) {
                // Send to specific room using the same format as websocket-server.html
                this.socket.emit('message', {
                    message: data,
                    room: room,
                    event_type: event,
                    appId: this.appId
                });
            } else {
                // Send to all using the same format as websocket-server.html
                this.socket.emit('message', {
                    message: data,
                    room: 'global',
                    event_type: event,
                    appId: this.appId
                });
            }
            
            return true;
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error sending message:`, error);
            return false;
        }
    },
    
    /**
     * Join a Socket.IO room
     * @param {string} roomName - Room to join
     * @memberof SypnexAPI.prototype
     * @returns {boolean} - Success status
     */
    joinRoom(roomName) {
        if (!this.isSocketConnected()) {
            console.error(`SypnexAPI [${this.appId}]: Cannot join room - not connected`);
            return false;
        }
        
        try {
            this.socket.emit('join_room', { room: roomName, appId: this.appId });
            this.roomsToRejoin.add(roomName); // Track room for reconnection
            return true;
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error joining room:`, error);
            return false;
        }
    },
    
    /**
     * Leave a Socket.IO room
     * @param {string} roomName - Room to leave
     * @memberof SypnexAPI.prototype
     * @returns {boolean} - Success status
     */
    leaveRoom(roomName) {
        if (!this.isSocketConnected()) {
            console.error(`SypnexAPI [${this.appId}]: Cannot leave room - not connected`);
            return false;
        }
        
        try {
            this.socket.emit('leave_room', { room: roomName, appId: this.appId });
            this.roomsToRejoin.delete(roomName); // Remove from reconnection tracking
            return true;
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error leaving room:`, error);
            return false;
        }
    },
    
    /**
     * Send a ping to test connection
     * @memberof SypnexAPI.prototype
     * @returns {Promise<number>} - Ping time in milliseconds
     */
    async ping() {
        if (!this.isSocketConnected()) {
            throw new Error('Socket not connected');
        }
        
        return new Promise((resolve) => {
            const startTime = Date.now();
            this.socket.emit('ping', () => {
                const pingTime = Date.now() - startTime;
                resolve(pingTime);
            });
        });
    },
    
    /**
     * Listen for Socket.IO events
     * @param {string} eventName - Event name to listen for
     * @memberof SypnexAPI.prototype
     * @param {function} callback - Callback function
     */
    on(eventName, callback) {
        if (!this.socket) {
            console.error(`SypnexAPI [${this.appId}]: Cannot listen for events - not connected`);
            return;
        }
        
        // Store callback for cleanup
        if (!this.socketEventListeners.has(eventName)) {
            this.socketEventListeners.set(eventName, []);
        }
        this.socketEventListeners.get(eventName).push(callback);
        
        // Add listener to socket
        this.socket.on(eventName, (data) => {
            callback(data);
        });
    },
    
    /**
     * Remove Socket.IO event listener
     * @param {string} eventName - Event name
     * @memberof SypnexAPI.prototype
     * @param {function} callback - Callback function to remove
     */
    off(eventName, callback) {
        if (!this.socket) {
            return;
        }
        
        // Remove from stored listeners
        if (this.socketEventListeners.has(eventName)) {
            const listeners = this.socketEventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        
        // Remove from socket
        this.socket.off(eventName, callback);
    },
    
    /**
     * Trigger internal events (for app communication)
     * @param {string} eventName - Event name
     * @memberof SypnexAPI.prototype
     * @param {any} data - Event data
     */
    _triggerEvent(eventName, data) {
        if (this.socketEventListeners.has(eventName)) {
            const listeners = this.socketEventListeners.get(eventName);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`SypnexAPI [${this.appId}]: Error in event callback:`, error);
                }
            });
        }
    },
    
    /**
     * Get the Socket.IO instance
     * @memberof SypnexAPI.prototype
     * @returns {object|null} - Socket.IO instance or null
     */
    getSocket() {
        return this.socket;
    },
    
    /**
     * Get Socket.IO connection state
     * @memberof SypnexAPI.prototype
     * @returns {object} - Connection state object
     */
    getSocketState() {
        return {
            connected: this.isSocketConnected(),
            appId: this.appId,
            url: this.socketUrl,
            autoReconnect: this.autoReconnect,
            reconnectAttempts: this.reconnectAttempts,
            roomsToRejoin: Array.from(this.roomsToRejoin),
            healthChecks: this.enableHealthChecks,
            socket: this.socket ? {
                id: this.socket.id,
                connected: this.socket.connected,
                disconnected: this.socket.disconnected
            } : null
        };
    },
    
    // ===== CONNECTION HEALTH MONITORING =====
    
    /**
@memberof SypnexAPI.prototype
     * Start periodic health checks
     */
    startHealthChecks() {
        if (!this.enableHealthChecks || this.healthCheckTimer) {
            return;
        }
        
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);
        
    },
    
    /**
@memberof SypnexAPI.prototype
     * Stop periodic health checks
     */
    stopHealthChecks() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    },
    
    /**
@memberof SypnexAPI.prototype
     * Perform a health check ping
     */
    async performHealthCheck() {
        if (!this.isSocketConnected()) {
            return;
        }
        
        try {
            const pingTime = await this.ping();
        } catch (error) {
            console.warn(`SypnexAPI [${this.appId}]: Health check failed:`, error.message);
            // If health check fails, it might indicate connection issues
            // The auto-reconnect will handle reconnection if needed
        }
    },
    
    /**
     * Enable or disable health checks
     * @memberof SypnexAPI.prototype
     * @param {boolean} enabled - Whether to enable health checks
     */
    setHealthChecks(enabled) {
        this.enableHealthChecks = enabled;
        if (enabled && this.isSocketConnected()) {
            this.startHealthChecks();
        } else {
            this.stopHealthChecks();
        }
    },
    
    /**
     * Set health check interval
     * @memberof SypnexAPI.prototype
     * @param {number} intervalMs - Interval in milliseconds
     */
    setHealthCheckInterval(intervalMs) {
        this.healthCheckInterval = intervalMs;
        if (this.healthCheckTimer) {
            this.stopHealthChecks();
            this.startHealthChecks();
        }
    },
    
    // ===== AUTO-RECONNECT HELPER METHODS =====
    
    /**
     * Enable or disable auto-reconnect
     * @memberof SypnexAPI.prototype
     * @param {boolean} enabled - Whether to enable auto-reconnect
     */
    setAutoReconnect(enabled) {
        this.autoReconnect = enabled;
        if (this.socket) {
            this.socket.io.reconnection(enabled);
        }
    },
    
    /**
     * Set auto-reconnect configuration
     * @memberof SypnexAPI.prototype
     * @param {object} config - Reconnect configuration
     */
    setReconnectConfig(config) {
        if (config.maxAttempts !== undefined) {
            this.maxReconnectAttempts = config.maxAttempts;
        }
        if (config.delay !== undefined) {
            this.reconnectDelay = config.delay;
        }
        if (config.maxDelay !== undefined) {
            this.maxReconnectDelay = config.maxDelay;
        }
        
        if (this.socket) {
            this.socket.io.reconnectionAttempts(this.maxReconnectAttempts);
            this.socket.io.reconnectionDelay(this.reconnectDelay);
            this.socket.io.reconnectionDelayMax(this.maxReconnectDelay);
        }
        
    },
    
    /**
@memberof SypnexAPI.prototype
     * Manually trigger reconnection
     */
    reconnect() {
        if (this.socket) {
            this.manualDisconnect = false; // Reset manual disconnect flag
            this.socket.connect();
        }
    },
    
    /**
     * Schedule a reconnection attempt
     * @memberof SypnexAPI.prototype
     * @private
     */
    _scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`SypnexAPI [${this.appId}]: Max reconnection attempts reached`);
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
        
        
        this.reconnectTimer = setTimeout(() => {
            if (this.socket && !this.socket.connected && !this.manualDisconnect) {
                this.socket.connect();
            }
        }, delay);
    },
    
    /**
     * Rejoin rooms after reconnection
     * @memberof SypnexAPI.prototype
     * @private
     */
    _rejoinRooms() {
        if (this.roomsToRejoin.size === 0) {
            return;
        }
        
        
        this.roomsToRejoin.forEach(roomName => {
            try {
                this.socket.emit('join_room', { room: roomName, appId: this.appId });
            } catch (error) {
                console.error(`SypnexAPI [${this.appId}]: Error rejoining room '${roomName}':`, error);
            }
        });
    }
    
}); 
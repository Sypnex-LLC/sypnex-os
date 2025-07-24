// Sypnex OS - System Status Module
// Contains time, network, and websocket status functionality

// Extend SypnexOS class with status methods
Object.assign(SypnexOS.prototype, {
    async updateTime() {
        const startTime = performance.now();
        try {
            const endpoint = this.useHeartbeat ? '/api/heartbeat' : '/api/time';
            const response = await fetch(endpoint);
            const data = await response.json();
            
            // Calculate network latency
            const endTime = performance.now();
            this.networkLatency = Math.round(endTime - startTime);
            this.lastHeartbeat = Date.now();
            
            document.getElementById('current-time').textContent = data.time;
            document.getElementById('current-date').textContent = data.date;
            
            // Additional data from heartbeat endpoint
            if (data.status) {
                // Could use this for system health indicators
            }
        } catch (error) {
            console.error('Error updating time:', error);
            this.networkLatency = -1; // Indicate network error
        }
    },

    updateNetworkStatus() {
        const networkIcon = document.getElementById('network-icon');
        if (!networkIcon) return;

        // Update network icon based on latency
        if (this.networkLatency === -1) {
            // Network error
            networkIcon.className = 'fas fa-wifi status-icon network-error';
            networkIcon.title = 'Network Error';
        } else if (this.networkLatency < 50) {
            // Excellent connection
            networkIcon.className = 'fas fa-wifi status-icon network-excellent';
            networkIcon.title = `Network Latency: ${this.networkLatency}ms (Excellent)`;
        } else if (this.networkLatency < 100) {
            // Good connection
            networkIcon.className = 'fas fa-wifi status-icon network-good';
            networkIcon.title = `Network Latency: ${this.networkLatency}ms (Good)`;
        } else if (this.networkLatency < 200) {
            // Fair connection
            networkIcon.className = 'fas fa-wifi status-icon network-fair';
            networkIcon.title = `Network Latency: ${this.networkLatency}ms (Fair)`;
        } else {
            // Poor connection
            networkIcon.className = 'fas fa-wifi status-icon network-poor';
            networkIcon.title = `Network Latency: ${this.networkLatency}ms (Poor)`;
        }

        // Check if we haven't received a heartbeat in 5 seconds
        if (Date.now() - this.lastHeartbeat > 10000) {
            networkIcon.className = 'fas fa-wifi status-icon network-error';
            networkIcon.title = 'Network Timeout';
        }
    },

    updateWebSocketStatus() {
        const websocketIcon = document.getElementById('websocket-icon');
        if (!websocketIcon) return;

        // Only check WebSocket status every 5 seconds to avoid too many requests
        if (Date.now() - this.lastWebSocketCheck < 5000) {
            // Update icon based on cached status
            this.updateWebSocketIcon(websocketIcon);
            return;
        }

        // Check WebSocket server status
        this.checkWebSocketServerStatus().then(status => {
            this.websocketStatus = status;
            this.lastWebSocketCheck = Date.now();
            this.updateWebSocketIcon(websocketIcon);
        }).catch(error => {
            console.error('Error checking WebSocket status:', error);
            this.websocketStatus = 'error';
            this.lastWebSocketCheck = Date.now();
            this.updateWebSocketIcon(websocketIcon);
        });
    },

    async checkWebSocketServerStatus() {
        try {
            const response = await fetch('/api/websocket/status');
            if (response.ok) {
                const data = await response.json();
                return data.status || 'unknown';
            } else {
                return 'error';
            }
        } catch (error) {
            console.error('Error checking WebSocket server status:', error);
            return 'error';
        }
    },

    updateWebSocketIcon(websocketIcon) {
        switch (this.websocketStatus) {
            case 'running':
                websocketIcon.className = 'fas fa-network-wired status-icon websocket-online';
                websocketIcon.title = 'WebSocket Server: Online';
                break;
            case 'error':
                websocketIcon.className = 'fas fa-network-wired status-icon websocket-error';
                websocketIcon.title = 'WebSocket Server: Error';
                break;
            case 'unknown':
            default:
                websocketIcon.className = 'fas fa-network-wired status-icon websocket-unknown';
                websocketIcon.title = 'WebSocket Server: Unknown';
                break;
        }
    }
}); 
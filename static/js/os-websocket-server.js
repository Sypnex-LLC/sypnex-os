// Sypnex OS - Websocket Server System Module

Object.assign(SypnexOS.prototype, {
    setupWebSocketServer(windowElement) {
        // Set initial timestamp
        const initialTimeEl = windowElement.querySelector('#initial-time');
        if (initialTimeEl) {
            initialTimeEl.textContent = new Date().toLocaleTimeString();
        }

        // Helper function to log messages
        const log = (message) => {
            const logContainer = windowElement.querySelector('#activity-log');
            if (!logContainer) return;

            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = `
                <span class="log-time">[${timestamp}]</span>
                <span class="log-message">${message}</span>
            `;
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        };

        // Helper function to update last updated time
        const updateLastUpdated = () => {
            const element = windowElement.querySelector('#last-updated');
            if (element) {
                element.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            }
        };

        // Helper function to format uptime
        const formatUptime = (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        // Main function to refresh stats
        const refreshStats = async () => {
            try {
                const response = await fetch('/api/websocket/status');
                const data = await response.json();

                // Update stat cards
                const clientsEl = windowElement.querySelector('#connected-clients');
                const roomsEl = windowElement.querySelector('#active-rooms');
                const messagesEl = windowElement.querySelector('#total-messages');
                const uptimeEl = windowElement.querySelector('#uptime');
                const cleanupEl = windowElement.querySelector('#cleanup-status');
                const timeoutEl = windowElement.querySelector('#timeout-setting');
                const statusEl = windowElement.querySelector('#server-status');

                if (clientsEl) clientsEl.textContent = data.connected_clients;
                if (roomsEl) roomsEl.textContent = data.active_rooms;
                if (messagesEl) messagesEl.textContent = data.message_history_count;
                if (uptimeEl) uptimeEl.textContent = formatUptime(data.uptime);

                // Update cleanup status
                if (data.cleanup) {
                    const cleanupStatus = data.cleanup.enabled ? 'Active' : 'Inactive';
                    if (cleanupEl) cleanupEl.textContent = cleanupStatus;
                    if (timeoutEl) timeoutEl.textContent = data.cleanup.timeout_seconds;
                }

                // Update server status
                if (statusEl) statusEl.textContent = data.status;

                updateLastUpdated();
                log(`Stats refreshed - ${data.connected_clients} clients, ${data.active_rooms} rooms`);

            } catch (error) {
                log(`Error refreshing stats: ${error.message}`);
                const statusEl = windowElement.querySelector('#server-status');
                if (statusEl) statusEl.textContent = 'Error';
            }
        };

        // Function to trigger cleanup
        const triggerCleanup = async () => {
            try {
                const response = await fetch('/api/websocket/cleanup', {
                    method: 'POST'
                });
                const data = await response.json();

                if (response.ok) {
                    log(`Cleanup completed: ${data.cleaned_connections} connections removed, ${data.remaining_clients} remaining`);
                    refreshStats(); // Refresh the display
                } else {
                    log(`Error: ${data.error}`);
                }
            } catch (error) {
                log(`Error triggering cleanup: ${error.message}`);
            }
        };

        // Function to show clients
        const showClients = async () => {
            try {
                const response = await fetch('/api/websocket/clients');
                const data = await response.json();

                if (response.ok) {
                    log(`Found ${data.total_clients} connected clients`);
                    data.clients.forEach(client => {
                        const connectedTime = new Date(client.connected_at).toLocaleTimeString();
                        const lastActivity = new Date(client.last_activity).toLocaleTimeString();
                        log(`Client ${client.id}: Connected at ${connectedTime}, Last activity: ${lastActivity}`);
                    });
                } else {
                    log(`Error: ${data.error}`);
                }
            } catch (error) {
                log(`Error getting clients: ${error.message}`);
            }
        };

        // Function to show rooms
        const showRooms = async () => {
            try {
                const response = await fetch('/api/websocket/rooms');
                const data = await response.json();

                if (response.ok) {
                    log(`Found ${data.total_rooms} active rooms`);
                    data.rooms.forEach(room => {
                        log(`Room '${room.name}': ${room.member_count} members`);
                    });
                } else {
                    log(`Error: ${data.error}`);
                }
            } catch (error) {
                log(`Error getting rooms: ${error.message}`);
            }
        };

        // Function to clear log
        const clearLog = () => {
            const logContainer = windowElement.querySelector('#activity-log');
            if (logContainer) {
                logContainer.innerHTML = `
                    <div class="log-entry">
                        <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
                        <span class="log-message">Log cleared</span>
                    </div>
                `;
            }
        };

        // Set up event listeners
        const refreshBtn = windowElement.querySelector('.refresh-websocket-stats');
        const cleanupBtn = windowElement.querySelector('.trigger-cleanup');
        const clientsBtn = windowElement.querySelector('.show-clients');
        const roomsBtn = windowElement.querySelector('.show-rooms');
        const clearBtn = windowElement.querySelector('.clear-log');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshStats);
        }
        if (cleanupBtn) {
            cleanupBtn.addEventListener('click', triggerCleanup);
        }
        if (clientsBtn) {
            clientsBtn.addEventListener('click', showClients);
        }
        if (roomsBtn) {
            roomsBtn.addEventListener('click', showRooms);
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', clearLog);
        }

        // Load initial stats
        refreshStats();

        // Auto-refresh every 10 seconds
        const autoRefreshInterval = setInterval(refreshStats, 10000);

        // Clean up interval when window is closed
        windowElement.addEventListener('close', () => {
            clearInterval(autoRefreshInterval);
        });
    }
}); 
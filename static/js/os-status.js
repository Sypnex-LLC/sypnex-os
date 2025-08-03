// Sypnex OS - System Status Module
// Contains time functionality (simplified - no more heartbeat polling)

// Extend SypnexOS class with status methods
Object.assign(SypnexOS.prototype, {
    updateTime() {
        try {
            // Use client-side time instead of server time
            const now = new Date();
            
            // Format time (12-hour format with AM/PM)
            const timeString = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            
            // Format date
            const dateString = now.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short', 
                day: 'numeric'
            });
            
            document.getElementById('current-time').textContent = timeString;
            document.getElementById('current-date').textContent = dateString;
            
        } catch (error) {
            console.error('Error updating time:', error);
            // Fallback display
            document.getElementById('current-time').textContent = '--:--';
            document.getElementById('current-date').textContent = '--';
        }
    }

    // NOTE: Network and WebSocket status methods removed
    // Errors are now handled contextually within individual apps/operations
}); 
// SypnexAPI Logs - Logging system operations
// This file extends the SypnexAPI class with logging functionality

// Extend SypnexAPI with Logs methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Write a log entry
     * @param {object} logData - Log entry data
     * @param {string} logData.level - Log level (debug, info, warn, error, critical)
     * @param {string} logData.message - Log message
     * @param {string} logData.component - Component type (core-os, user-apps, plugins, services)
     * @param {string} [logData.source] - Source identifier (app name, plugin name, etc.)
     * @param {object} [logData.details] - Additional details object
     * @returns {Promise<object>} - Write result
     */
    async writeLog(logData) {
        try {
            // Validate required fields
            if (!logData.level || !logData.message || !logData.component) {
                throw new Error('Missing required fields: level, message, component');
            }
            
            // Set default source if not provided
            if (!logData.source) {
                logData.source = this.appId || 'unknown';
            }
            
            const response = await fetch(`${this.baseUrl}/logs/write`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(`Failed to write log: ${errorData.error || response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error writing log:`, error);
            throw error;
        }
    },
    
    /**
     * Convenience method to write debug log
     * @param {string} message - Log message
     * @param {object} [details] - Additional details
     * @returns {Promise<object>} - Write result
     */
    async logDebug(message, details = {}) {
        return this.writeLog({
            level: 'debug',
            message: message,
            component: 'user-apps',
            source: this.appId,
            details: details
        });
    },
    
    /**
     * Convenience method to write info log
     * @param {string} message - Log message
     * @param {object} [details] - Additional details
     * @returns {Promise<object>} - Write result
     */
    async logInfo(message, details = {}) {
        return this.writeLog({
            level: 'info',
            message: message,
            component: 'user-apps',
            source: this.appId,
            details: details
        });
    },
    
    /**
     * Convenience method to write warning log
     * @param {string} message - Log message
     * @param {object} [details] - Additional details
     * @returns {Promise<object>} - Write result
     */
    async logWarn(message, details = {}) {
        return this.writeLog({
            level: 'warn',
            message: message,
            component: 'user-apps',
            source: this.appId,
            details: details
        });
    },
    
    /**
     * Convenience method to write error log
     * @param {string} message - Log message
     * @param {object} [details] - Additional details
     * @returns {Promise<object>} - Write result
     */
    async logError(message, details = {}) {
        return this.writeLog({
            level: 'error',
            message: message,
            component: 'user-apps',
            source: this.appId,
            details: details
        });
    },
    
    /**
     * Convenience method to write critical log
     * @param {string} message - Log message
     * @param {object} [details] - Additional details
     * @returns {Promise<object>} - Write result
     */
    async logCritical(message, details = {}) {
        return this.writeLog({
            level: 'critical',
            message: message,
            component: 'user-apps',
            source: this.appId,
            details: details
        });
    },
    
    /**
     * Read logs with filtering options
     * @param {object} [filters] - Filter options
     * @param {string} [filters.component] - Component to filter by (core-os, user-apps, plugins, services, all)
     * @param {string} [filters.level] - Log level to filter by (debug, info, warn, error, critical, all)
     * @param {string} [filters.date] - Date to filter by (YYYY-MM-DD format, defaults to today)
     * @param {number} [filters.limit] - Maximum number of logs to return (default: 100)
     * @param {string} [filters.source] - Source to filter by (app name, plugin name, etc.)
     * @returns {Promise<object>} - Log entries and metadata
     */
    async readLogs(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.component) params.append('component', filters.component);
            if (filters.level) params.append('level', filters.level);
            if (filters.date) params.append('date', filters.date);
            if (filters.limit) params.append('limit', filters.limit.toString());
            if (filters.source) params.append('source', filters.source);
            
            const response = await fetch(`${this.baseUrl}/logs/read?${params.toString()}`);
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(`Failed to read logs: ${errorData.error || response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading logs:`, error);
            throw error;
        }
    },
    
    /**
     * Get available log dates for each component
     * @returns {Promise<object>} - Available dates by component
     */
    async getLogDates() {
        try {
            const response = await fetch(`${this.baseUrl}/logs/dates`);
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(`Failed to get log dates: ${errorData.error || response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error getting log dates:`, error);
            throw error;
        }
    },
    
    /**
     * Clear logs with optional filtering
     * @param {object} [filters] - Filter options
     * @param {string} [filters.component] - Component to clear (core-os, user-apps, plugins, services, all)
     * @param {string} [filters.date] - Specific date to clear (YYYY-MM-DD format) or 'all' for all dates
     * @returns {Promise<object>} - Clear operation result
     */
    async clearLogs(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.component) params.append('component', filters.component);
            if (filters.date) params.append('date', filters.date);
            
            const response = await fetch(`${this.baseUrl}/logs/clear?${params.toString()}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(`Failed to clear logs: ${errorData.error || response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error clearing logs:`, error);
            throw error;
        }
    },
    
    /**
     * Get logging system statistics
     * @returns {Promise<object>} - Logging statistics
     */
    async getLogStats() {
        try {
            const response = await fetch(`${this.baseUrl}/logs/stats`);
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(`Failed to get log stats: ${errorData.error || response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error getting log stats:`, error);
            throw error;
        }
    },
    
    /**
     * Get logs for the current app (convenience method)
     * @param {object} [filters] - Additional filter options
     * @returns {Promise<object>} - Log entries for this app
     */
    async getMyLogs(filters = {}) {
        return this.readLogs({
            ...filters,
            source: this.appId,
            component: 'user-apps'
        });
    }
});

// Create a namespace for direct access to logs functionality
if (typeof window !== 'undefined') {
    window.SypnexLogs = {
        // Direct access methods that don't require an app instance
        async readLogs(filters = {}) {
            const tempApi = new SypnexAPI('system-logs');
            return tempApi.readLogs(filters);
        },
        
        async getLogDates() {
            const tempApi = new SypnexAPI('system-logs');
            return tempApi.getLogDates();
        },
        
        async getLogStats() {
            const tempApi = new SypnexAPI('system-logs');
            return tempApi.getLogStats();
        },
        
        async clearLogs(filters = {}) {
            const tempApi = new SypnexAPI('system-logs');
            return tempApi.clearLogs(filters);
        }
    };
}

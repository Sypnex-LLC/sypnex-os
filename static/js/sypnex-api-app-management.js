// SypnexAPI App Management - Application management operations
// This file extends the SypnexAPI class with app management functionality

// Extend SypnexAPI with app management methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Get available applications from the registry
     * @async
     * @returns {Promise<object>} - Available applications data
     */
    async getAvailableApps() {
        try {
            const response = await fetch(`${this.baseUrl}/updates/latest`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to get available apps: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error getting available apps:`, error);
            throw error;
        }
    },
    
    /**
     * Get list of installed applications
     * @async
     * @returns {Promise<Array>} - Array of installed applications
     */
    async getInstalledApps() {
        try {
            const response = await fetch(`${this.baseUrl}/apps`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to get installed apps: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error getting installed apps:`, error);
            throw error;
        }
    },
    
    /**
     * Update a specific application to the latest version
     * @async
     * @param {string} appId - Application ID to update
     * @returns {Promise<object>} - Update result
     */
    async updateApp(appId) {
        try {
            const response = await fetch(`${this.baseUrl}/user-apps/update/${appId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`SypnexAPI [${this.appId}]: App ${appId} updated successfully`);
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to update app: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error updating app ${appId}:`, error);
            throw error;
        }
    },
    
    /**
     * Refresh the application registry cache
     * @async
     * @returns {Promise<object>} - Refresh result
     */
    async refreshAppRegistry() {
        try {
            const response = await fetch(`${this.baseUrl}/user-apps/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`SypnexAPI [${this.appId}]: App registry refreshed successfully`);
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to refresh app registry: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error refreshing app registry:`, error);
            throw error;
        }
    },
    
    /**
     * Install an application from the registry
     * @async
     * @param {string} appId - Application ID to install
     * @param {object} [options={}] - Installation options
     * @param {string} [options.version] - Specific version to install (defaults to latest)
     * @returns {Promise<object>} - Installation result
     */
    async installApp(appId, options = {}) {
        try {
            const { version } = options;
            const payload = { app_id: appId };
            if (version) {
                payload.version = version;
            }
            
            const response = await fetch(`${this.baseUrl}/user-apps/install`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`SypnexAPI [${this.appId}]: App ${appId} installed successfully`);
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to install app: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error installing app ${appId}:`, error);
            throw error;
        }
    },
    
    /**
     * Uninstall an application
     * @async
     * @param {string} appId - Application ID to uninstall
     * @returns {Promise<object>} - Uninstallation result
     */
    async uninstallApp(appId) {
        try {
            const response = await fetch(`${this.baseUrl}/user-apps/uninstall/${appId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`SypnexAPI [${this.appId}]: App ${appId} uninstalled successfully`);
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to uninstall app: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error uninstalling app ${appId}:`, error);
            throw error;
        }
    }
    
});

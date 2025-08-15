// SypnexAPI Core - Main class and initialization
// This file contains the core SypnexAPI class that gets injected into user app sandboxes

/**
 * SypnexAPI - Main API class for user applications
 * Provides access to OS features and services in a sandboxed environment
 * @class
 */
class SypnexAPI {
    /**
     * Create a new SypnexAPI instance
     * @param {string} appId - Unique identifier for the application
     * @param {object} helpers - Helper functions provided by the OS environment
     * @param {function} [helpers.getAppSetting] - Function to get app settings
     * @param {function} [helpers.getAllAppSettings] - Function to get all app settings
     * @param {function} [helpers.showNotification] - Function to show notifications
     */
    constructor(appId, helpers = {}) {
        this.appId = appId;
        this.baseUrl = '/api';
        this.initialized = false;
        this.cleanupHooks = []; // User-defined cleanup functions
        
        // Store helper functions passed from the OS
        this.getAppSetting = helpers.getAppSetting || this._defaultGetAppSetting;
        this.getAllAppSettings = helpers.getAllAppSettings || this._defaultGetAllAppSettings;
        this.showNotification = helpers.showNotification || this._defaultShowNotification;
        
        this.init();
    }
    
    /**
     * Initialize the SypnexAPI instance
     * Checks for required helper functions and sets up the API
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Check if we have the required helper functions
            if (typeof this.getAppSetting === 'function' && typeof this.getAllAppSettings === 'function') {
                this.initialized = true;
            } else {
                console.warn('SypnexAPI: Running outside OS environment, some features may not work');
            }
        } catch (error) {
            console.error('SypnexAPI initialization error:', error);
        }
    }
    
    /**
     * Default implementation for getting app settings via direct API calls
     * @private
     * @async
     * @param {string} key - Setting key to retrieve
     * @param {*} [defaultValue=null] - Default value if setting not found
     * @returns {Promise<*>} The setting value or default value
     */
    // Default implementations that fall back to direct API calls
    async _defaultGetAppSetting(key, defaultValue = null) {
        try {
            const response = await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`);
            if (response.ok) {
                const data = await response.json();
                return data.value !== undefined ? data.value : defaultValue;
            }
            return defaultValue;
        } catch (error) {
            console.error(`SypnexAPI: Error getting setting ${key}:`, error);
            return defaultValue;
        }
    }
    
    /**
     * Default implementation for getting all app settings via direct API calls
     * @private
     * @async
     * @returns {Promise<object>} Object containing all app settings
     */
    async _defaultGetAllAppSettings() {
        try {
            const response = await fetch(`${this.baseUrl}/app-settings/${this.appId}`);
            if (response.ok) {
                const data = await response.json();
                return data.settings || {};
            }
            return {};
        } catch (error) {
            console.error('SypnexAPI: Error getting all settings:', error);
            return {};
        }
    }
    
    /**
     * Default implementation for showing notifications via console
     * @private
     * @param {string} message - Notification message
     * @param {string} [type='info'] - Notification type (info, error, warn, etc.)
     */
    _defaultShowNotification(message, type = 'info') {
        if (type === 'error') {
            console.error(message);
        }
    }
    
    /**
     * Get metadata for this application
     * @async
     * @returns {Promise<object|null>} Application metadata or null if error
     */
    async getAppMetadata() {
        try {
            const response = await fetch(`${this.baseUrl}/app-metadata/${this.appId}`);
            if (response.ok) {
                const data = await response.json();
                return data.metadata;
            }
            return null;
        } catch (error) {
            console.error('SypnexAPI: Error getting app metadata:', error);
            return null;
        }
    }
    
    /**
     * Check if the SypnexAPI has been initialized
     * @returns {boolean} True if initialized, false otherwise
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Get the application ID
     * @returns {string} The application identifier
     */
    getAppId() {
        return this.appId;
    }
    
    /**
     * Get the saved window state for this application
     * @async
     * @returns {Promise<object|null>} Window state object or null if not found
     */
    async getWindowState() {
        try {
            const response = await fetch(`${this.baseUrl}/window-state/${this.appId}`);
            if (response.ok) {
                const data = await response.json();
                return data.state;
            }
            return null;
        } catch (error) {
            console.error('SypnexAPI: Error getting window state:', error);
            return null;
        }
    }
    
    /**
     * Save the window state for this application
     * @async
     * @param {object} state - Window state object to save
     * @returns {Promise<boolean>} True if saved successfully, false otherwise
     */
    async saveWindowState(state) {
        try {
            const response = await fetch(`${this.baseUrl}/window-state/${this.appId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(state)
            });
            
            if (response.ok) {
                return true;
            } else {
                console.error('SypnexAPI: Failed to save window state');
                return false;
            }
        } catch (error) {
            console.error('SypnexAPI: Error saving window state:', error);
            return false;
        }
    }

    /**
     * Request the OS to refresh the latest app versions cache
     * Useful when an app knows it has been updated or wants to force a cache refresh
     * @async
     * @returns {Promise<boolean>} True if refresh was successful, false otherwise
     */
    async refreshAppVersionsCache() {
        try {
            // Call the global OS method if available
            if (typeof window !== 'undefined' && window.sypnexOS && window.sypnexOS.refreshLatestVersionsCache) {
                const result = await window.sypnexOS.refreshLatestVersionsCache();
                
                if (result) {
                    return true;
                } else {
                    console.warn(`SypnexAPI [${this.appId}]: App versions cache refresh failed`);
                    return false;
                }
            } else {
                console.warn(`SypnexAPI [${this.appId}]: OS cache refresh not available - running outside OS environment`);
                return false;
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error refreshing app versions cache:`, error);
            return false;
        }
    }

    /**
     * Register a cleanup function to be called when the app is closed
     * Use this for custom cleanup like stopping game loops, disposing WebGL contexts, etc.
     * @param {function} cleanupFunction - Function to call during app cleanup
     * @param {string} [description] - Optional description for debugging
     * 
     * @example
     * // For Three.js apps
     * sypnexAPI.onBeforeClose(() => {
     *     if (renderer) {
     *         renderer.dispose();
     *         renderer.domElement = null;
     *     }
     *     if (animationId) {
     *         cancelAnimationFrame(animationId);
     *     }
     * }, 'Three.js cleanup');
     * 
     * // For game loops
     * sypnexAPI.onBeforeClose(() => {
     *     gameRunning = false;
     *     if (gameLoopInterval) {
     *         clearInterval(gameLoopInterval);
     *     }
     * }, 'Game loop cleanup');
     */
    onBeforeClose(cleanupFunction, description = 'User cleanup') {
        if (typeof cleanupFunction !== 'function') {
            console.warn(`SypnexAPI [${this.appId}]: onBeforeClose expects a function, got ${typeof cleanupFunction}`);
            return;
        }
        
        this.cleanupHooks.push({
            fn: cleanupFunction,
            description: description
        });
    }

    /**
     * Remove a previously registered cleanup function
     * @param {function} cleanupFunction - The function to remove
     */
    removeCleanupHook(cleanupFunction) {
        const index = this.cleanupHooks.findIndex(hook => hook.fn === cleanupFunction);
        if (index > -1) {
            this.cleanupHooks.splice(index, 1);
        }
    }

    /**
     * Internal method called by the OS during app cleanup
     * Executes all registered cleanup hooks
     */
    cleanup() {
        if (this.cleanupHooks.length === 0) {
            return;
        }

        console.log(`SypnexAPI [${this.appId}]: Running ${this.cleanupHooks.length} cleanup hook(s)`);
        
        for (const hook of this.cleanupHooks) {
            try {
                hook.fn();
            } catch (error) {
                console.error(`SypnexAPI [${this.appId}]: Error in cleanup hook "${hook.description}":`, error);
            }
        }
        
        // Clear the hooks after execution
        this.cleanupHooks = [];
    }
}

// Export for use in modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SypnexAPI;
}

// Make SypnexAPI globally available for OS use
if (typeof window !== 'undefined') {
    window.SypnexAPI = SypnexAPI;
}

// Global fetch override for automatic token injection
// This will be included in both main system and sandboxed apps
if (typeof window !== 'undefined' && window.fetch && !window._sypnexFetchOverridden) {
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options = {}) {
        // Initialize headers if not present
        if (!options.headers) {
            options.headers = {};
        }
        
        // Only add session token to internal requests (relative URLs starting with /)
        if (typeof url === 'string' && url.startsWith('/')) {
            // Add access token header only to internal requests
            options.headers['X-Session-Token'] = '{{ACCESS_TOKEN}}';
        }
        
        // Call original fetch with modified options
        return originalFetch(url, options);
    };
    
    // Mark as overridden to prevent double-override
    window._sypnexFetchOverridden = true;
} 
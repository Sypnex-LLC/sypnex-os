// SypnexAPI - Dynamically Bundled JavaScript API
// Generated: 2025-08-21 05:32:35.563057
// Minified: False

// === sypnex-api-core.js ===
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
     * Get access to the global SypnexOS apps registry
     * @returns {Object} - The window.sypnexOS object containing apps Map and other OS functions
     */
    getSypnexOS() {
        if (typeof window !== 'undefined' && window.sypnexOS) {
            return window.sypnexOS;
        }
        return null;
    }

    /**
     * Get access to the global SypnexApps tracker
     * @returns {Object} - The window.sypnexApps object containing app tracking info
     */
    getSypnexApps() {
        if (typeof window !== 'undefined' && window.sypnexApps) {
            return window.sypnexApps;
        }
        return null;
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

    // ========================================
    // SERVICE MANAGEMENT API METHODS
    // ========================================

    /**
     * Get a list of all available services
     * @async
     * @returns {Promise<Array>} Array of service objects
     * @throws {Error} If the request fails
     * @example
     * const services = await sypnexAPI.getServices();
     * console.log(services); // [{ id: "service1", name: "Service 1", running: true }, ...]
     */
    async getServices() {
        const response = await this.proxyHTTP({
            url: '/api/services',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response || response.status < 200 || response.status >= 300) {
            throw new Error(`Request failed with status: ${response?.status || 'Unknown'}`);
        }

        if (response.error) {
            throw new Error(response.error);
        }

        const data = response.content;
        return data.services || [];
    }

    /**
     * Start a specific service by ID
     * @async
     * @param {string} serviceId - The ID of the service to start
     * @returns {Promise<void>}
     * @throws {Error} If the request fails
     * @example
     * await sypnexAPI.startService("my-service-id");
     */
    async startService(serviceId) {
        const response = await this.proxyHTTP({
            url: `/api/services/${serviceId}/start`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response || response.status < 200 || response.status >= 300) {
            throw new Error(`Request failed with status: ${response?.status || 'Unknown'}`);
        }

        if (response.error) {
            throw new Error(response.error);
        }
    }

    /**
     * Stop a specific service by ID
     * @async
     * @param {string} serviceId - The ID of the service to stop
     * @returns {Promise<void>}
     * @throws {Error} If the request fails
     * @example
     * await sypnexAPI.stopService("my-service-id");
     */
    async stopService(serviceId) {
        const response = await this.proxyHTTP({
            url: `/api/services/${serviceId}/stop`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response || response.status < 200 || response.status >= 300) {
            throw new Error(`Request failed with status: ${response?.status || 'Unknown'}`);
        }

        if (response.error) {
            throw new Error(response.error);
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

// === sypnex-api-ui.js ===
// SypnexAPI UI Components - Modal dialogs, confirmations, file pickers, etc.
// This file extends the SypnexAPI class with UI component functionality

// Extend SypnexAPI with UI methods
Object.assign(SypnexAPI.prototype, {

    /**
     * Show a confirmation dialog with standard OS styling
     * @async
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {object} [options={}] - Configuration options
     * @param {string} [options.confirmText='Yes'] - Text for confirm button
     * @param {string} [options.cancelText='No'] - Text for cancel button
     * @param {string} [options.type='warning'] - Dialog type: 'warning', 'danger', 'info'
     * @param {string} [options.icon='fas fa-exclamation-triangle'] - FontAwesome icon class
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    async showConfirmation(title, message, options = {}) {
        const {
            confirmText = 'Yes',
            cancelText = 'No',
            type = 'warning',
            icon = 'fas fa-exclamation-triangle'
        } = options;

        return new Promise((resolve) => {
            // Remove any existing confirmation modal
            const existingModal = document.getElementById('sypnex-confirmation-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create the modal with proper OS styling
            const modal = document.createElement('div');
            modal.id = 'sypnex-confirmation-modal';
            modal.style.cssText = `
                display: block;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
            `;

            // Create modal content with proper structure
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background-color: var(--glass-bg);
                margin: 5% auto;
                padding: 0;
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                backdrop-filter: blur(10px);
            `;

            // Modal header
            const modalHeader = document.createElement('div');
            modalHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--glass-border);
            `;

            const headerTitle = document.createElement('h3');
            headerTitle.style.cssText = `
                margin: 0;
                color: var(--text-primary);
            `;
            headerTitle.innerHTML = `<i class="${icon}"></i> ${title}`;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--text-secondary);
            `;
            closeBtn.onmouseover = () => closeBtn.style.color = 'var(--text-primary)';
            closeBtn.onmouseout = () => closeBtn.style.color = 'var(--text-secondary)';

            modalHeader.appendChild(headerTitle);
            modalHeader.appendChild(closeBtn);

            // Modal body
            const modalBody = document.createElement('div');
            modalBody.style.cssText = `padding: 20px;`;

            const messageP = document.createElement('p');
            messageP.style.cssText = `
                color: var(--text-primary);
                margin: 0 0 15px 0;
                line-height: 1.5;
            `;
            messageP.textContent = message;
            modalBody.appendChild(messageP);

            // Add warning text for danger type
            if (type === 'danger') {
                const warningP = document.createElement('p');
                warningP.style.cssText = `
                    color: var(--error-color);
                    margin: 10px 0 0 0;
                    font-size: 14px;
                    font-style: italic;
                `;
                warningP.textContent = 'This action cannot be undone.';
                modalBody.appendChild(warningP);
            }

            // Modal footer
            const modalFooter = document.createElement('div');
            modalFooter.style.cssText = `
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 20px;
                border-top: 1px solid var(--glass-border);
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = cancelText;
            cancelBtn.className = 'app-btn secondary';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = confirmText;
            confirmBtn.className = `app-btn ${type === 'danger' ? 'danger' : 'primary'}`;

            modalFooter.appendChild(cancelBtn);
            modalFooter.appendChild(confirmBtn);

            // Assemble modal
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);

            // Add to document
            document.body.appendChild(modal);

            // Setup event handlers
            const closeModal = (confirmed) => {
                modal.remove();
                resolve(confirmed);
                document.removeEventListener('keydown', escapeHandler);
            };

            // Event listeners
            closeBtn.addEventListener('click', () => closeModal(false));
            cancelBtn.addEventListener('click', () => closeModal(false));
            confirmBtn.addEventListener('click', () => closeModal(true));

            // Escape key to close
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
    },

    /**
     * Show an input modal for getting text input from user
     * @param {string} title - Modal title
     * @param {string} message - Modal message/label
     * @param {object} [options={}] - Configuration options
     * @param {string} [options.placeholder=''] - Input placeholder text
     * @param {string} [options.defaultValue=''] - Default input value
     * @param {string} [options.confirmText='Create'] - Text for confirm button
     * @param {string} [options.cancelText='Cancel'] - Text for cancel button
     * @param {string} [options.icon='fas fa-edit'] - FontAwesome icon class
     * @param {string} [options.inputType='text'] - Input type: 'text', 'textarea'
     * @memberof SypnexAPI.prototype
     * @returns {Promise<string|null>} Input value if confirmed, null if cancelled
     */
    async showInputModal(title, message, options = {}) {
        const {
            placeholder = '',
            defaultValue = '',
            confirmText = 'Create',
            cancelText = 'Cancel',
            icon = 'fas fa-edit',
            inputType = 'text'
        } = options;

        return new Promise((resolve) => {
            // Remove any existing modal
            const existingModal = document.getElementById('sypnex-input-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create the modal
            const modal = document.createElement('div');
            modal.id = 'sypnex-input-modal';
            modal.style.cssText = `
                display: block;
                position: fixed;
                z-index: 11000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            `;

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: var(--glass-bg);
                margin: 5% auto;
                padding: 0;
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            `;

            // Modal header
            const modalHeader = document.createElement('div');
            modalHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--glass-border);
                background: var(--glass-bg);
                border-radius: 12px 12px 0 0;
            `;

            const headerTitle = document.createElement('h3');
            headerTitle.style.cssText = `
                margin: 0;
                color: var(--text-primary);
                font-size: 1.2em;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            headerTitle.innerHTML = `<i class="${icon}" style="color: var(--accent-color);"></i> ${title}`;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 1.5em;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            `;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = 'rgba(255, 71, 87, 0.1)';
                closeBtn.style.color = '#ff4757';
                closeBtn.style.transform = 'scale(1.1)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = 'none';
                closeBtn.style.color = 'var(--text-secondary)';
                closeBtn.style.transform = 'scale(1)';
            };

            modalHeader.appendChild(headerTitle);
            modalHeader.appendChild(closeBtn);

            // Modal body
            const modalBody = document.createElement('div');
            modalBody.style.cssText = `
                padding: 20px;
                background: var(--glass-bg);
            `;

            const label = document.createElement('label');
            label.style.cssText = `
                display: block;
                margin-bottom: 5px;
                color: var(--text-primary);
                font-weight: bold;
                font-size: 14px;
            `;
            label.textContent = message;

            let input;
            if (inputType === 'textarea') {
                input = document.createElement('textarea');
                input.style.cssText = `
                    width: 100%;
                    padding: 10px;
                    border: 1px solid var(--glass-border);
                    border-radius: 6px;
                    background: rgba(20, 20, 20, 0.8);
                    color: var(--text-primary);
                    font-family: inherit;
                    font-size: 14px;
                    resize: vertical;
                    min-height: 120px;
                    box-sizing: border-box;
                `;
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.style.cssText = `
                    width: 100%;
                    padding: 10px;
                    border: 1px solid var(--glass-border);
                    border-radius: 6px;
                    background: rgba(20, 20, 20, 0.8);
                    color: var(--text-primary);
                    font-family: inherit;
                    font-size: 14px;
                    box-sizing: border-box;
                `;
            }

            input.placeholder = placeholder;
            input.value = defaultValue;

            input.onfocus = () => {
                input.style.borderColor = 'var(--accent-color)';
                input.style.boxShadow = '0 0 0 2px rgba(0, 212, 255, 0.2)';
            };
            input.onblur = () => {
                input.style.borderColor = 'var(--glass-border)';
                input.style.boxShadow = 'none';
            };

            modalBody.appendChild(label);
            modalBody.appendChild(input);

            // Modal footer
            const modalFooter = document.createElement('div');
            modalFooter.style.cssText = `
                padding: 20px;
                border-top: 1px solid var(--glass-border);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: var(--glass-bg);
                border-radius: 0 0 12px 12px;
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = cancelText;
            cancelBtn.className = 'app-btn secondary';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = confirmText;
            confirmBtn.className = 'app-btn primary';

            modalFooter.appendChild(cancelBtn);
            modalFooter.appendChild(confirmBtn);

            // Assemble modal
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);

            // Add to document
            document.body.appendChild(modal);

            // Focus the input
            setTimeout(() => input.focus(), 100);

            // Setup event handlers
            const closeModal = (inputValue) => {
                modal.remove();
                resolve(inputValue);
                document.removeEventListener('keydown', escapeHandler);
            };

            // Event listeners
            closeBtn.addEventListener('click', () => closeModal(null));
            cancelBtn.addEventListener('click', () => closeModal(null));
            confirmBtn.addEventListener('click', () => {
                const value = input.value.trim();
                if (value) {
                    closeModal(value);
                }
            });

            // Enter key to confirm
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (inputType !== 'textarea' || e.ctrlKey)) {
                    e.preventDefault();
                    const value = input.value.trim();
                    if (value) {
                        closeModal(value);
                    }
                }
            });

            // Escape key to close
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal(null);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
    },

    /**
     * Show a file upload modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message/label
     * @param {object} [options={}] - Configuration options
     * @param {string} [options.confirmText='Upload'] - Text for confirm button
     * @param {string} [options.cancelText='Cancel'] - Text for cancel button
     * @param {string} [options.icon='fas fa-upload'] - FontAwesome icon class
     * @param {string} [options.accept='*'] - File accept types
     * @memberof SypnexAPI.prototype
     * @returns {Promise<File|null>} Selected file if confirmed, null if cancelled
     */
    async showFileUploadModal(title, message, options = {}) {
        const {
            confirmText = 'Upload',
            cancelText = 'Cancel',
            icon = 'fas fa-upload',
            accept = '*',
            uploadCallback = null
        } = options;

        return new Promise((resolve) => {
            // Remove any existing modal
            const existingModal = document.getElementById('sypnex-upload-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create the modal
            const modal = document.createElement('div');
            modal.id = 'sypnex-upload-modal';
            modal.style.cssText = `
                display: block;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            `;

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: var(--glass-bg);
                margin: 5% auto;
                padding: 0;
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                width: 90%;
                max-width: 500px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            `;

            // Modal header
            const modalHeader = document.createElement('div');
            modalHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--glass-border);
                background: var(--glass-bg);
                border-radius: 12px 12px 0 0;
            `;

            const headerTitle = document.createElement('h3');
            headerTitle.style.cssText = `
                margin: 0;
                color: var(--text-primary);
                font-size: 1.2em;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            headerTitle.innerHTML = `<i class="${icon}" style="color: var(--accent-color);"></i> ${title}`;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 1.5em;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            `;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = 'rgba(255, 71, 87, 0.1)';
                closeBtn.style.color = '#ff4757';
                closeBtn.style.transform = 'scale(1.1)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = 'none';
                closeBtn.style.color = 'var(--text-secondary)';
                closeBtn.style.transform = 'scale(1)';
            };

            modalHeader.appendChild(headerTitle);
            modalHeader.appendChild(closeBtn);

            // Modal body
            const modalBody = document.createElement('div');
            modalBody.style.cssText = `
                padding: 20px;
                background: var(--glass-bg);
            `;

            const label = document.createElement('label');
            label.style.cssText = `
                display: block;
                margin-bottom: 5px;
                color: var(--text-primary);
                font-weight: bold;
                font-size: 14px;
            `;
            label.textContent = message;

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = accept;
            fileInput.style.cssText = `
                display: none;
            `;

            // Custom file input button
            const customFileBtn = document.createElement('button');
            customFileBtn.type = 'button';
            customFileBtn.className = 'app-btn secondary';
            customFileBtn.style.cssText = `
                width: 100%;
                padding: 12px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border: 2px dashed var(--glass-border);
                background: rgba(0, 212, 255, 0.05);
                transition: all 0.3s ease;
            `;
            customFileBtn.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <span>Choose File to Upload</span>
            `;

            customFileBtn.onmouseover = () => {
                customFileBtn.style.borderColor = 'var(--accent-color)';
                customFileBtn.style.background = 'rgba(0, 212, 255, 0.1)';
                customFileBtn.style.transform = 'translateY(-1px)';
            };
            customFileBtn.onmouseout = () => {
                customFileBtn.style.borderColor = 'var(--glass-border)';
                customFileBtn.style.background = 'rgba(0, 212, 255, 0.05)';
                customFileBtn.style.transform = 'translateY(0)';
            };

            // Click handler for custom button
            customFileBtn.addEventListener('click', () => {
                fileInput.click();
            });

            // File info display
            const fileInfo = document.createElement('div');
            fileInfo.style.cssText = `
                display: none;
                background: rgba(0, 212, 255, 0.1);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 6px;
                padding: 10px;
                margin-top: 10px;
            `;

            // Progress bar container (hidden initially)
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = `
                display: none;
                margin-top: 15px;
            `;

            const progressLabel = document.createElement('div');
            progressLabel.style.cssText = `
                color: var(--text-primary);
                font-size: 14px;
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            progressLabel.innerHTML = `
                <span>Uploading...</span>
                <span class="progress-percent">0%</span>
            `;

            const progressBarBg = document.createElement('div');
            progressBarBg.style.cssText = `
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                overflow: hidden;
                border: 1px solid var(--glass-border);
            `;

            const progressBarFill = document.createElement('div');
            progressBarFill.style.cssText = `
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, var(--accent-color), #00ff88);
                border-radius: 4px;
                transition: width 0.3s ease;
                box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
            `;

            progressBarBg.appendChild(progressBarFill);
            progressContainer.appendChild(progressLabel);
            progressContainer.appendChild(progressBarBg);

            modalBody.appendChild(label);
            modalBody.appendChild(customFileBtn);
            modalBody.appendChild(fileInput);
            modalBody.appendChild(fileInfo);
            modalBody.appendChild(progressContainer);

            // Modal footer
            const modalFooter = document.createElement('div');
            modalFooter.style.cssText = `
                padding: 20px;
                border-top: 1px solid var(--glass-border);
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                background: var(--glass-bg);
                border-radius: 0 0 12px 12px;
            `;

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = cancelText;
            cancelBtn.className = 'app-btn secondary';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = confirmText;
            confirmBtn.className = 'app-btn primary';
            confirmBtn.disabled = true;

            modalFooter.appendChild(cancelBtn);
            modalFooter.appendChild(confirmBtn);

            // Assemble modal
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            modalContent.appendChild(modalFooter);
            modal.appendChild(modalContent);

            // Add to document
            document.body.appendChild(modal);

            // File selection handler
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    confirmBtn.disabled = false;

                    // Update custom button appearance
                    customFileBtn.innerHTML = `
                        <i class="fas fa-check-circle" style="color: var(--accent-color);"></i>
                        <span>${file.name}</span>
                    `;
                    customFileBtn.style.borderColor = 'var(--accent-color)';
                    customFileBtn.style.background = 'rgba(0, 212, 255, 0.15)';

                    fileInfo.style.display = 'block';
                    fileInfo.innerHTML = `
                        <p style="margin: 5px 0; color: var(--text-primary); font-size: 14px;">
                            <strong style="color: var(--accent-color);">Selected File:</strong> ${file.name}
                        </p>
                        <p style="margin: 5px 0; color: var(--text-primary); font-size: 14px;">
                            <strong style="color: var(--accent-color);">Size:</strong> ${(file.size / 1024).toFixed(1)} KB
                        </p>
                    `;
                } else {
                    confirmBtn.disabled = true;

                    // Reset custom button appearance
                    customFileBtn.innerHTML = `
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Choose File to Upload</span>
                    `;
                    customFileBtn.style.borderColor = 'var(--glass-border)';
                    customFileBtn.style.background = 'rgba(0, 212, 255, 0.05)';

                    fileInfo.style.display = 'none';
                }
            });

            // Setup event handlers
            const closeModal = (selectedFile) => {
                modal.remove();
                resolve(selectedFile);
                document.removeEventListener('keydown', escapeHandler);
            };

            // Event listeners
            closeBtn.addEventListener('click', () => closeModal(null));
            cancelBtn.addEventListener('click', () => closeModal(null));
            confirmBtn.addEventListener('click', async () => {
                const file = fileInput.files[0];
                if (file && uploadCallback) {
                    // Show progress UI
                    progressContainer.style.display = 'block';
                    confirmBtn.disabled = true;
                    customFileBtn.style.display = 'none';
                    
                    // Change cancel button to indicate it can cancel upload
                    cancelBtn.textContent = 'Cancel Upload';
                    let currentUpload = null;
                    
                    // Progress callback function
                    const updateProgress = (percent) => {
                        progressBarFill.style.width = percent + '%';
                        progressContainer.querySelector('.progress-percent').textContent = Math.round(percent) + '%';
                    };
                    
                    // Update cancel button handler for upload cancellation
                    const uploadCancelHandler = () => {
                        if (currentUpload && currentUpload.abort) {
                            currentUpload.abort();
                        }
                        closeModal(null);
                    };
                    
                    // Replace cancel button event listener
                    cancelBtn.removeEventListener('click', closeModal);
                    cancelBtn.addEventListener('click', uploadCancelHandler);
                    
                    try {
                        // Call the upload function with progress callback
                        const uploadResult = uploadCallback(file, updateProgress);
                        
                        // Check if uploadCallback returns an object with promise and abort
                        if (uploadResult && uploadResult.promise && uploadResult.abort) {
                            currentUpload = uploadResult;
                            const result = await uploadResult.promise;
                            closeModal(result);
                        } else {
                            // Fallback for legacy uploadCallback that returns just a promise
                            const result = await uploadResult;
                            closeModal(result);
                        }
                    } catch (error) {
                        // Hide progress and show error
                        progressContainer.style.display = 'none';
                        confirmBtn.disabled = false;
                        cancelBtn.textContent = cancelText; // Reset cancel button text
                        customFileBtn.style.display = 'block';
                        
                        // Restore original cancel handler
                        cancelBtn.removeEventListener('click', uploadCancelHandler);
                        cancelBtn.addEventListener('click', () => closeModal(null));
                        
                        // Show error in the modal unless it was cancelled
                        if (error.message !== 'Upload cancelled by user') {
                            const errorDiv = document.createElement('div');
                            errorDiv.style.cssText = `
                                background: rgba(255, 71, 87, 0.1);
                                border: 1px solid rgba(255, 71, 87, 0.3);
                                border-radius: 6px;
                                padding: 10px;
                                margin-top: 10px;
                                color: #ff4757;
                            `;
                            errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Upload failed: ${error.message}`;
                            modalBody.appendChild(errorDiv);
                            
                            // Remove error after 5 seconds
                            setTimeout(() => {
                                if (errorDiv.parentNode) {
                                    errorDiv.remove();
                                }
                            }, 5000);
                        }
                    }
                } else if (file) {
                    // Fallback to regular modal behavior if no upload callback
                    closeModal(file);
                }
            });

            // Escape key to close
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal(null);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
    },

    /**
     * Create a hamburger menu with customizable items
     * @param {HTMLElement} container - The container element to append the menu to
     * @param {Array} menuItems - Array of menu item objects
     * @param {object} [options={}] - Configuration options
     * @param {string} [options.position='right'] - Position of menu ('left' or 'right')
     * @param {string} [options.buttonClass=''] - Additional CSS classes for the button
     * @param {string} [options.menuId=''] - Custom ID for the menu (auto-generated if not provided)
     * @memberof SypnexAPI.prototype
     * @returns {object} Object with methods to control the menu
     * 
     * @example
     * const menuItems = [
     *   { icon: 'fas fa-sync-alt', text: 'Refresh', action: () => console.log('Refresh') },
     *   { icon: 'fas fa-folder-plus', text: 'New Folder', action: () => console.log('New Folder') },
     *   { type: 'separator' },
     *   { icon: 'fas fa-upload', text: 'Upload File', action: () => console.log('Upload') }
     * ];
     * 
     * const menu = sypnexAPI.createHamburgerMenu(container, menuItems, { position: 'right' });
     */
    createHamburgerMenu(container, menuItems, options = {}) {
        const {
            position = 'right',
            buttonClass = '',
            menuId = `hamburger-menu-${Date.now()}`
        } = options;

        // Create hamburger button
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.className = `hamburger-btn ${buttonClass}`;
        hamburgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
        hamburgerBtn.style.cssText = `
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 6px;
            padding: 8px 12px;
            cursor: pointer;
            color: var(--text-primary);
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        `;

        // Create dropdown menu
        const dropdownMenu = document.createElement('div');
        dropdownMenu.id = menuId;
        dropdownMenu.className = 'sypnex-dropdown-menu';
        dropdownMenu.style.cssText = `
            display: none;
            position: absolute;
            ${position}: 0;
            top: 100%;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            min-width: 180px;
            width: 180px;
            max-height: 70vh;
            overflow-y: auto;
            padding: 0;
            margin-top: 4px;
            backdrop-filter: blur(10px);
        `;

        // Populate menu items
        menuItems.forEach(item => {
            if (item.type === 'separator') {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: var(--glass-border);
                    margin: 4px 0;
                `;
                dropdownMenu.appendChild(separator);
            } else {
                const menuItem = document.createElement('button');
                menuItem.className = 'sypnex-menu-item';
                menuItem.innerHTML = `
                    <i class="${item.icon}" style="width: 16px; margin-right: 10px;"></i>
                    ${item.text}
                `;
                menuItem.style.cssText = `
                    display: flex;
                    align-items: center;
                    width: 100%;
                    padding: 10px 16px;
                    background: none;
                    border: none;
                    text-align: left;
                    color: var(--text-primary);
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    font-size: 14px;
                `;

                menuItem.addEventListener('mouseenter', () => {
                    menuItem.style.background = 'var(--glass-hover)';
                });

                menuItem.addEventListener('mouseleave', () => {
                    menuItem.style.background = 'none';
                });

                menuItem.addEventListener('click', () => {
                    if (typeof item.action === 'function') {
                        item.action();
                    }
                    hideMenu();
                });

                dropdownMenu.appendChild(menuItem);
            }
        });

        // Setup container with relative positioning
        if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
            container.style.position = 'relative';
        }

        // Append elements to container
        container.appendChild(hamburgerBtn);
        container.appendChild(dropdownMenu);

        // Show/hide functionality
        const showMenu = () => {
            dropdownMenu.style.display = 'block';
            hamburgerBtn.style.background = 'var(--glass-hover)';
        };

        const hideMenu = () => {
            dropdownMenu.style.display = 'none';
            hamburgerBtn.style.background = 'var(--glass-bg)';
        };

        const toggleMenu = () => {
            if (dropdownMenu.style.display === 'none' || dropdownMenu.style.display === '') {
                showMenu();
            } else {
                hideMenu();
            }
        };

        // Event listeners
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                hideMenu();
            }
        });

        // Hover effects for button
        hamburgerBtn.addEventListener('mouseenter', () => {
            if (dropdownMenu.style.display === 'none' || dropdownMenu.style.display === '') {
                hamburgerBtn.style.background = 'var(--glass-hover)';
            }
        });

        hamburgerBtn.addEventListener('mouseleave', () => {
            if (dropdownMenu.style.display === 'none' || dropdownMenu.style.display === '') {
                hamburgerBtn.style.background = 'var(--glass-bg)';
            }
        });

        // Return control object
        return {
            show: showMenu,
            hide: hideMenu,
            toggle: toggleMenu,
            button: hamburgerBtn,
            menu: dropdownMenu,
            destroy: () => {
                hamburgerBtn.remove();
                dropdownMenu.remove();
            }
        };
    },

    /**
     * Show a generic modal with custom HTML content
     * @async
     * @param {object} options - Configuration options
     * @param {string} options.title - Modal title
     * @param {string} options.html - HTML content for modal body
     * @param {string} [options.icon='fas fa-window-maximize'] - FontAwesome icon class
     * @param {string} [options.size='medium'] - Modal size: 'small', 'medium', 'large'
     * @param {Array} [options.buttons=[]] - Array of button objects with text, style, and onClick
     * @param {boolean} [options.closeOnOverlay=true] - Close modal when clicking overlay
     * @param {function} [options.onClose=null] - Callback when modal is closed
     * @memberof SypnexAPI.prototype
     * @returns {Promise<string|null>} Button text that was clicked, or null if closed
     */
    async showModal(options = {}) {
        const {
            title = 'Modal',
            html = '',
            icon = 'fas fa-window-maximize',
            size = 'medium',
            buttons = [],
            closeOnOverlay = true,
            onClose = null
        } = options;

        return new Promise((resolve) => {
            // Remove any existing generic modal
            const existingModal = document.getElementById('sypnex-generic-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create the modal
            const modal = document.createElement('div');
            modal.id = 'sypnex-generic-modal';
            modal.className = 'sypnex-modal';
            
            // Add appId as data attribute if available
            if (this.appId) {
                modal.setAttribute('data-appid', this.appId);
            }
            
            modal.style.cssText = `
                display: block;
                position: fixed;
                z-index: 11000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            `;

            // Determine modal size
            let modalWidth = '90%';
            let maxWidth = '500px';
            
            switch (size) {
                case 'small':
                    maxWidth = '400px';
                    break;
                case 'medium':
                    maxWidth = '600px';
                    break;
                case 'large':
                    maxWidth = '800px';
                    break;
                case 'xlarge':
                    maxWidth = '1000px';
                    break;
            }

            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: var(--glass-bg);
                margin: 5% auto;
                padding: 0;
                border: 1px solid var(--glass-border);
                border-radius: 12px;
                width: ${modalWidth};
                max-width: ${maxWidth};
                max-height: 90vh;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
            `;

            // Modal header
            const modalHeader = document.createElement('div');
            modalHeader.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid var(--glass-border);
                background: var(--glass-bg);
                border-radius: 12px 12px 0 0;
                flex-shrink: 0;
            `;

            const headerTitle = document.createElement('h3');
            headerTitle.style.cssText = `
                margin: 0;
                color: var(--text-primary);
                font-size: 1.2em;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            headerTitle.innerHTML = `<i class="${icon}" style="color: var(--accent-color);"></i> ${title}`;

            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                font-size: 1.5em;
                color: var(--text-secondary);
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            `;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = 'rgba(255, 71, 87, 0.1)';
                closeBtn.style.color = '#ff4757';
                closeBtn.style.transform = 'scale(1.1)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = 'none';
                closeBtn.style.color = 'var(--text-secondary)';
                closeBtn.style.transform = 'scale(1)';
            };

            modalHeader.appendChild(headerTitle);
            modalHeader.appendChild(closeBtn);

            // Modal body
            const modalBody = document.createElement('div');
            modalBody.style.cssText = `
                padding: 20px;
                background: var(--glass-bg);
                flex: 1;
                overflow-y: auto;
            `;
            modalBody.innerHTML = html;

            // Modal footer (only if buttons are provided)
            let modalFooter = null;
            if (buttons.length > 0) {
                modalFooter = document.createElement('div');
                modalFooter.style.cssText = `
                    padding: 20px;
                    border-top: 1px solid var(--glass-border);
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    background: var(--glass-bg);
                    border-radius: 0 0 12px 12px;
                    flex-shrink: 0;
                `;

                // Create buttons
                buttons.forEach(buttonConfig => {
                    const btn = document.createElement('button');
                    btn.textContent = buttonConfig.text || 'Button';
                    btn.className = `app-btn ${buttonConfig.style || 'secondary'}`;
                    
                    btn.addEventListener('click', () => {
                        if (buttonConfig.onClick) {
                            buttonConfig.onClick();
                        }
                        closeModal(buttonConfig.text);
                    });
                    
                    modalFooter.appendChild(btn);
                });
            }

            // Assemble modal
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(modalBody);
            if (modalFooter) {
                modalContent.appendChild(modalFooter);
            }
            modal.appendChild(modalContent);

            // Add to document body (bypasses app sandbox)
            document.body.appendChild(modal);

            // Return modal reference immediately so it can be used in button callbacks
            // Also resolve the promise when modal closes
            const modalRef = {
                modal: modal,
                close: (result = null) => closeModal(result)
            };

            // Setup event handlers
            const closeModal = (result) => {
                modal.remove();
                if (onClose) onClose(result);
                resolve({ modal: modal, result: result });
                document.removeEventListener('keydown', escapeHandler);
            };

            // Resolve immediately with modal reference
            resolve(modalRef);

            // Close button event
            closeBtn.addEventListener('click', () => closeModal(null));

            // Overlay click to close (if enabled)
            if (closeOnOverlay) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeModal(null);
                    }
                });
            }

            // Escape key to close
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal(null);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
    }



});

// === sypnex-api-keyboard.js ===
// SypnexAPI Keyboard Management - Global keyboard shortcut system
// This file extends the SypnexAPI class with keyboard shortcut functionality

// Global keyboard manager (initialized once)
(function() {
    // Skip if already initialized
    if (window.sypnexKeyboardManager) return;
    
    // Private global state for keyboard management
    const keyboardState = {
        appShortcuts: new Map(), // appId -> {shortcuts, config}
        isInitialized: false
    };
    
    /**
     * Handle global keydown events and route to active application
     * @param {KeyboardEvent} event - The keyboard event
     */
    function handleGlobalKeydown(event) {
        // Use the OS's existing activeWindow tracking
        const activeAppId = window.sypnexOS && window.sypnexOS.activeWindow;
        
        // Only process if we have an active app that has shortcuts registered
        if (!activeAppId || !keyboardState.appShortcuts.has(activeAppId)) return;
        
        // Check if the active app is minimized - if so, don't process shortcuts
        const activeWindowElement = window.sypnexOS.apps && window.sypnexOS.apps.get(activeAppId);
        if (activeWindowElement && activeWindowElement.dataset.minimized === 'true') {
            return; // App is minimized, ignore keyboard shortcuts
        }
        
        // Get the active app's shortcuts
        const appConfig = keyboardState.appShortcuts.get(activeAppId);
        
        // Convert event to key string (e.g., "f", "ctrl+s", "ArrowLeft")
        const keyString = eventToKeyString(event);
        
        // Check if this key is registered for the active app
        const handler = appConfig.shortcuts[keyString];
        if (handler && typeof handler === 'function') {
            // Prevent default if configured to do so
            if (appConfig.config.preventDefault !== false) {
                event.preventDefault();
            }
            
            // Stop propagation if configured
            if (appConfig.config.stopPropagation) {
                event.stopPropagation();
            }
            
            try {
                // Call the handler
                handler();
            } catch (error) {
                console.error(`SypnexKeyboardManager: Error executing shortcut "${keyString}" for app ${activeAppId}:`, error);
            }
        }
        // If no handler found, do nothing - let the event continue normally
    }
    
    /**
     * Convert keyboard event to standardized key string
     * @param {KeyboardEvent} event - The keyboard event
     * @returns {string} Standardized key string
     * @memberof SypnexAPI.prototype
     */
    function eventToKeyString(event) {
        const parts = [];
        
        // Add modifiers in consistent order
        if (event.ctrlKey) parts.push('ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        if (event.metaKey) parts.push('meta');
        
        // Add the main key
        let key = event.key.toLowerCase();
        
        // Normalize some special keys
        if (key === ' ') key = 'space';
        if (key === 'escape') key = 'escape';
        if (key.startsWith('arrow')) key = key; // Keep ArrowLeft, ArrowRight, etc.
        
        parts.push(key);
        
        return parts.join('+');
    }
    
    // Initialize keyboard manager
    function initKeyboardManager() {
        if (keyboardState.isInitialized) return;
        
        // Single global listener for all keyboard events
        document.addEventListener('keydown', handleGlobalKeydown);
        keyboardState.isInitialized = true;
        
    }
    
    // Expose keyboard manager functions globally
    window.sypnexKeyboardManager = {
        /**
         * Register keyboard shortcuts for an application
         * @param {string} appId - Application identifier
         * @param {object} shortcuts - Key to function mappings
         * @param {object} config - Configuration options
         */
        registerApp(appId, shortcuts, config) {
            keyboardState.appShortcuts.set(appId, {shortcuts, config});
        },
        
        /**
         * Unregister all shortcuts for an application
         * @memberof SypnexAPI.prototype
         * @param {string} appId - Application identifier
         */
        unregisterApp(appId) {
            const appConfig = keyboardState.appShortcuts.get(appId);
            if (appConfig) {
                const shortcutCount = Object.keys(appConfig.shortcuts).length;
                keyboardState.appShortcuts.delete(appId);
                return shortcutCount;
            }
            return 0;
        },
        
        /**
         * Get statistics about registered shortcuts
         * @memberof SypnexAPI.prototype
         * @returns {object} Statistics object
         */
        getStats() {
            const totalShortcuts = Array.from(keyboardState.appShortcuts.values())
                .reduce((total, config) => total + Object.keys(config.shortcuts).length, 0);
                
            const activeAppId = window.sypnexOS && window.sypnexOS.activeWindow;
            
            return {
                registeredApps: keyboardState.appShortcuts.size,
                totalShortcuts: totalShortcuts,
                activeApp: activeAppId
            };
        }
    };
    
    // Initialize on load
    initKeyboardManager();
})();

// Extend SypnexAPI with keyboard shortcut methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Register keyboard shortcuts for this application
     * @param {object} shortcuts - Object mapping key strings to handler functions
     * @param {object} config - Configuration options
     * @param {boolean} config.preventDefault - Whether to prevent default behavior (default: true)
     * @param {boolean} config.stopPropagation - Whether to stop event propagation (default: false)
     * @memberof SypnexAPI.prototype
     * @example
     * this.registerKeyboardShortcuts({
     *     'f': () => this.toggleFullscreen(),
     *     'escape': () => this.exitFullscreen(),
     *     'space': () => this.pausePlay(),
     *     'ctrl+s': () => this.save()
     * });
     */
    registerKeyboardShortcuts(shortcuts, config = {}) {
        const appId = this.appId;
        if (!appId) {
            console.warn('SypnexAPI: Cannot register keyboard shortcuts - no appId available');
            return;
        }
        
        // Default configuration
        const defaultConfig = {
            preventDefault: true,
            stopPropagation: false
        };
        
        const finalConfig = Object.assign({}, defaultConfig, config);
        
        // Register with the global keyboard manager
        window.sypnexKeyboardManager.registerApp(appId, shortcuts, finalConfig);
        
        // Track in sandbox for cleanup
        if (window.appKeyboardShortcuts) {
            window.appKeyboardShortcuts.set(appId, Object.keys(shortcuts));
        }
        
    },
    
    /**
     * Get keyboard shortcut statistics
     * @memberof SypnexAPI.prototype
     * @returns {object} Statistics about registered shortcuts
     */
    getKeyboardStats() {
        return window.sypnexKeyboardManager.getStats();
    }
});


// === sypnex-api-window.js ===
// SypnexAPI Window Management - Explicit window object management for sandboxed apps
// This file extends the SypnexAPI class with createAppWindow functionality

// Global window manager (initialized once)
(function() {
    // Skip if already initialized
    if (window.sypnexWindowManager) return;
    
    // Private global state for window management
    const windowState = {
        appWindows: new Map(), // appId -> {windowProxy, properties: Set}
        isInitialized: false
    };
    
    /**
     * Create an isolated window proxy for an app with automatic property tracking
     * @param {string} appId - The application ID
     * @returns {Object} Proxy object that tracks property assignments
     */
    function createAppWindowProxy(appId) {
        // Check if we already have a proxy for this app
        if (windowState.appWindows.has(appId)) {
            const existingData = windowState.appWindows.get(appId);
            if (existingData.windowProxy) {
                // Return the existing proxy
                return existingData.windowProxy;
            }
        }
        
        // Create a Set to track properties created by this app
        const appProperties = new Set();
        
        // Store the tracking set for cleanup later
        if (!windowState.appWindows.has(appId)) {
            windowState.appWindows.set(appId, {
                windowProxy: null,
                properties: appProperties
            });
        } else {
            windowState.appWindows.get(appId).properties = appProperties;
        }
        
        // Methods that need to be bound to the real window object
        const boundMethods = new Set([
            // DOM/CSS methods
            'getComputedStyle',
            'getSelection',
            'matchMedia',
            
            // Animation/timing methods
            'requestAnimationFrame',
            'cancelAnimationFrame',
            'requestIdleCallback',
            'cancelIdleCallback',
            
            // Scrolling methods
            'scrollTo',
            'scroll',
            'scrollBy',
            
            // Window manipulation methods
            'resizeTo',
            'resizeBy',
            'moveTo',
            'moveBy',
            
            // Additional common methods that need proper binding
            'alert',              // Alert dialogs
            'confirm',            // Confirmation dialogs
            'prompt',             // Input prompts
            'print',              // Print page
            'focus',              // Window focus
            'blur',               // Window blur
            'find',               // Text search (legacy)
            'stop',               // Stop page loading
            'atob',               // Base64 decode
            'btoa'                // Base64 encode
        ]);

        // Create a proxy that intercepts property assignments
        const windowProxy = new Proxy(window, {
            set(target, property, value) {
                // Track this property assignment
                appProperties.add(property);
                
                // Log the assignment for debugging
                
                // Set the property on the real window object
                target[property] = value;
                return true;
            },
            
            get(target, property) {
                const value = target[property];
                
                // If it's a method that needs to be bound to the real window, bind it
                if (typeof value === 'function' && boundMethods.has(property)) {
                    return value.bind(target);
                }
                
                // Return the actual property from window
                return value;
            },
            
            has(target, property) {
                return property in target;
            },
            
            deleteProperty(target, property) {
                // If this app created this property, remove it from tracking
                appProperties.delete(property);
                delete target[property];
                return true;
            }
        });
        
        // Store the proxy for later reference
        windowState.appWindows.get(appId).windowProxy = windowProxy;
        
        return windowProxy;
    }
    
    /**
     * Clean up all window properties created by a specific app
     * @param {string} appId - The application ID to clean up
     */
    function cleanupAppWindow(appId) {
        const appData = windowState.appWindows.get(appId);
        if (!appData) return;
        
        const { properties } = appData;
        let cleanedCount = 0;
        
        // Delete all properties that this app created
        for (const property of properties) {
            if (property in window) {
                try {
                    delete window[property];
                    cleanedCount++;
                    
                } catch (error) {
                    console.warn(`App ${appId}: Failed to clean up window.${property}:`, error);
                }
            }
        }
        
        // Clear the tracking data
        properties.clear();
        windowState.appWindows.delete(appId);
        
        if (cleanedCount > 0) {
        }
    }
    
    /**
     * Initialize the window management system
     * @memberof SypnexAPI.prototype
     */
    function initializeWindowManager() {
        if (windowState.isInitialized) return;
        
        // Hook into the existing app cleanup system
        if (window.sypnexAppSandbox && window.sypnexAppSandbox.addCleanupHook) {
            window.sypnexAppSandbox.addCleanupHook('window-management', (appId) => {
                cleanupAppWindow(appId);
            });
        }
        
        windowState.isInitialized = true;
        
    }
    
    // Initialize immediately
    initializeWindowManager();
    
    // Make the window manager globally available
    window.sypnexWindowManager = {
        createAppWindowProxy,
        cleanupAppWindow,
        state: windowState // For debugging
    };
})();

// Extend SypnexAPI with window management methods
Object.assign(SypnexAPI.prototype, {

    /**
     * Get the isolated window object for this app with automatic property tracking
     * Returns the same window proxy instance for subsequent calls (singleton pattern).
     * All properties assigned to this window proxy will be automatically cleaned up
     * when the app is closed, preventing memory leaks and conflicts.
     * 
     * @memberof SypnexAPI.prototype
     * @returns {Object} Window proxy object that tracks property assignments
     * 
     * @example
     * // Instead of: window.myData = { ... }
     * // Use:
     * const appWindow = sypnexAPI.getAppWindow();
     * appWindow.myData = { ... }; // This will be automatically cleaned up
     * 
     * // Multiple calls return the same proxy:
     * const w1 = sypnexAPI.getAppWindow();
     * const w2 = sypnexAPI.getAppWindow();
     * console.log(w1 === w2); // true
     * 
     * // The proxy behaves exactly like window for reading:
     * appWindow.document.getElementById('myId'); // Works normally
     * appWindow.localStorage.getItem('key');    // Works normally
     */
    getAppWindow() {
        if (!window.sypnexWindowManager) {
            console.error('SypnexAPI: Window manager not initialized');
            return window; // Fallback to regular window
        }
        
        return window.sypnexWindowManager.createAppWindowProxy(this.appId);
    },
    
    /**
     * Manually clean up window properties for this app
     * @memberof SypnexAPI.prototype
     * This is automatically called when the app closes, but can be called manually if needed
     */
    cleanupAppWindow() {
        if (!window.sypnexWindowManager) {
            console.warn('SypnexAPI: Window manager not initialized');
            return;
        }
        
        window.sypnexWindowManager.cleanupAppWindow(this.appId);
    }

});


// === sypnex-api-scaling.js ===
// SypnexAPI Scaling - Centralized scaling utilities for all apps
// This file extends the SypnexAPI class with robust scaling compensation utilities
//
// This module provides a centralized solution for handling app scaling across all user applications.
// Previously, scaling utilities were duplicated in multiple places (utils, file explorer utils).
// Now all apps can access these utilities via sypnexAPI.scaling or the convenience methods.
//
// Key features:
// - Detects app scale from CSS classes or transform matrix
// - Provides coordinate transformation utilities
// - Handles mouse coordinate scaling
// - Includes element bounding rect scaling
// - Supports optional zoom scaling for canvas-based apps
// - Auto-detects scale changes with callback support
//
// Usage examples:
//   sypnexAPI.scaling.detectAppScale()
//   sypnexAPI.getScaledMouseCoords(event)
//   sypnexAPI.getScaledBoundingClientRect(element)
//   sypnexAPI.screenToAppCoords(x, y, zoomScale)

/**
 * Scaling utilities for handling app scaling across all user applications
 * Provides methods to handle coordinate transformations, element positioning,
 * and mouse interactions when apps are scaled by the OS
 * @namespace
 */
const scalingUtils = {
    // Internal scale cache
    _appScale: 1.0,

    /**
     * Detect the current app scale from CSS transform
     * @returns {number} Scale factor (1.0 = 100%, 0.8 = 80%, etc.)
     */
    detectAppScale() {
        try {
            // Find the app window container
            const appWindow = document.querySelector('.app-window');
            if (!appWindow) {
                return 1.0;
            }

            // Check for scale classes
            const scaleClasses = ['scale-75', 'scale-80', 'scale-85', 'scale-90', 'scale-95',
                'scale-100', 'scale-105', 'scale-110', 'scale-115', 'scale-120',
                'scale-125', 'scale-130', 'scale-135', 'scale-140', 'scale-145', 'scale-150'];

            for (const scaleClass of scaleClasses) {
                if (appWindow.classList.contains(scaleClass)) {
                    const scaleValue = parseInt(scaleClass.replace('scale-', ''));
                    this._appScale = scaleValue / 100;
                    return this._appScale;
                }
            }

            // Fallback: check computed transform
            const computedStyle = window.getComputedStyle(appWindow);
            const transform = computedStyle.transform;
            if (transform && transform !== 'none') {
                // Parse transform matrix to extract scale
                const matrix = transform.match(/matrix\(([^)]+)\)/);
                if (matrix) {
                    const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
                    if (values.length >= 4) {
                        // Matrix format: matrix(a, b, c, d, tx, ty) where a and d are scale factors
                        const scaleX = values[0];
                        const scaleY = values[3];
                        this._appScale = (scaleX + scaleY) / 2; // Average of X and Y scale
                        return this._appScale;
                    }
                }
            }

            this._appScale = 1.0;
            return 1.0;
        } catch (error) {
            console.error('Error detecting app scale:', error);
            this._appScale = 1.0;
            return 1.0;
        }
    },

    /**
     * Get the total effective scale (app scale × optional zoom scale)
     * @param {number} [zoomScale=1.0] - Optional zoom scale to combine with app scale
     * @returns {number} Combined scale factor
     */
    getEffectiveScale(zoomScale = 1.0) {
        const appScale = this.detectAppScale();
        return appScale * zoomScale;
    },

    /**
     * Convert screen coordinates to app coordinates (accounting for app scale and optional zoom)
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {number} [zoomScale=1.0] - Optional zoom scale
     * @returns {object} Object with x and y properties in app coordinates
     */
    screenToAppCoords(screenX, screenY, zoomScale = 1.0) {
        const scale = this.getEffectiveScale(zoomScale);
        return {
            x: screenX / scale,
            y: screenY / scale
        };
    },

    /**
     * Convert app coordinates to screen coordinates (accounting for app scale and optional zoom)
     * @param {number} appX - App X coordinate
     * @param {number} appY - App Y coordinate
     * @param {number} [zoomScale=1.0] - Optional zoom scale
     * @returns {object} Object with x and y properties in screen coordinates
     */
    appToScreenCoords(appX, appY, zoomScale = 1.0) {
        const scale = this.getEffectiveScale(zoomScale);
        return {
            x: appX * scale,
            y: appY * scale
        };
    },

    /**
     * Get scaled element bounding rectangle (compensates for app scaling)
     * @param {Element} element - DOM element to get bounds for
     * @returns {object} DOMRect-like object with scaled coordinates
     */
    getScaledBoundingClientRect(element) {
        const rect = element.getBoundingClientRect();
        const appScale = this.detectAppScale();
        // Note: Don't include zoom scale here as getBoundingClientRect already accounts for CSS transforms

        return {
            left: rect.left / appScale,
            top: rect.top / appScale,
            right: rect.right / appScale,
            bottom: rect.bottom / appScale,
            width: rect.width / appScale,
            height: rect.height / appScale,
            x: rect.x / appScale,
            y: rect.y / appScale
        };
    },

    /**
     * Get scaled mouse coordinates from event (compensates for app scaling only)
     * @param {Event} e - Mouse event
     * @returns {object} Object with x and y properties in scaled coordinates
     */
    getScaledMouseCoords(e) {
        const appScale = this.detectAppScale();
        return {
            x: e.clientX / appScale,
            y: e.clientY / appScale
        };
    },

    /**
     * Initialize scale detection with optional change callback
     * @param {function} [onScaleChange] - Callback function called when scale changes
     * @returns {MutationObserver} Observer instance for cleanup
     */
    initScaleDetection(onScaleChange = null) {
        // Detect scale on initialization
        this.detectAppScale();

        // Listen for scale changes (if the app scale changes dynamically)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const oldScale = this._appScale;
                    const newScale = this.detectAppScale();
                    if (oldScale !== newScale) {
                        // Trigger callback if provided
                        if (onScaleChange && typeof onScaleChange === 'function') {
                            onScaleChange(newScale, oldScale);
                        }
                    }
                }
            });
        });

        // Observe the app window for class changes
        const appWindow = document.querySelector('.app-window');
        if (appWindow) {
            observer.observe(appWindow, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        return observer;
    },

    /**
     * Get current cached app scale (without re-detection)
     * @returns {number} Cached app scale factor
     */
    getCurrentScale() {
        return this._appScale;
    },

    /**
     * Force refresh of scale detection
     * @returns {number} New scale factor
     */
    refreshScale() {
        return this.detectAppScale();
    }
};

// Extend SypnexAPI with scaling methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Access to scaling utilities
     * @type {object}
     * @memberof SypnexAPI.prototype
     */
    get scaling() {
        return scalingUtils;
    },

    /**
     * Convenience method: Detect current app scale
     * @memberof SypnexAPI.prototype
     * @returns {number} Scale factor
     */
    detectAppScale() {
        return scalingUtils.detectAppScale();
    },

    /**
     * Convenience method: Get scaled mouse coordinates
     * @param {Event} e - Mouse event
     * @memberof SypnexAPI.prototype
     * @returns {object} Scaled coordinates
     */
    getScaledMouseCoords(e) {
        return scalingUtils.getScaledMouseCoords(e);
    },

    /**
     * Convenience method: Get scaled element bounds
     * @param {Element} element - DOM element
     * @memberof SypnexAPI.prototype
     * @returns {object} Scaled bounding rectangle
     */
    getScaledBoundingClientRect(element) {
        return scalingUtils.getScaledBoundingClientRect(element);
    },

    /**
     * Convenience method: Convert screen to app coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @param {number} [zoomScale=1.0] - Optional zoom scale
     * @memberof SypnexAPI.prototype
     * @returns {object} App coordinates
     */
    screenToAppCoords(screenX, screenY, zoomScale = 1.0) {
        return scalingUtils.screenToAppCoords(screenX, screenY, zoomScale);
    },

    /**
     * Convenience method: Convert app to screen coordinates
     * @param {number} appX - App X coordinate
     * @param {number} appY - App Y coordinate
     * @param {number} [zoomScale=1.0] - Optional zoom scale
     * @memberof SypnexAPI.prototype
     * @returns {object} Screen coordinates
     */
    appToScreenCoords(appX, appY, zoomScale = 1.0) {
        return scalingUtils.appToScreenCoords(appX, appY, zoomScale);
    },

    /**
     * Convenience method: Initialize scale detection
     * @param {function} [onScaleChange] - Callback for scale changes
     * @memberof SypnexAPI.prototype
     * @returns {MutationObserver} Observer instance
     */
    initScaleDetection(onScaleChange = null) {
        return scalingUtils.initScaleDetection(onScaleChange);
    }
});


// === sypnex-api-settings.js ===
// SypnexAPI Settings - App settings and user preferences
// This file extends the SypnexAPI class with settings management functionality

// Extend SypnexAPI with settings methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Get an application setting
     * @async
     * @param {string} key - Setting key to retrieve
     * @param {*} [defaultValue=null] - Default value if setting not found
     * @memberof SypnexAPI.prototype
     * @returns {Promise<*>} The setting value or default value
     */
    async getSetting(key, defaultValue = null) {
        try {
            return await this.getAppSetting(key, defaultValue);
        } catch (error) {
            console.error(`SypnexAPI: Error getting setting ${key}:`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set an application setting
     * @async
     * @param {string} key - Setting key to set
     * @param {*} value - Value to store
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} True if saved successfully, false otherwise
     */
    async setSetting(key, value) {
        try {
            const response = await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });
            
            if (response.ok) {
                return true;
            } else {
                console.error(`SypnexAPI: Failed to save setting ${key}`);
                return false;
            }
        } catch (error) {
            console.error(`SypnexAPI: Error setting ${key}:`, error);
            return false;
        }
    },
    
    /**
     * Get all application settings
     * @async
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} Object containing all app settings
     */
    async getAllSettings() {
        try {
            return await this.getAllAppSettings();
        } catch (error) {
            console.error('SypnexAPI: Error getting all settings:', error);
            return {};
        }
    },
    
    /**
     * Delete an application setting
     * @async
     * @param {string} key - Setting key to delete
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} True if deleted successfully, false otherwise
     */
    async deleteSetting(key) {
        try {
            const response = await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                return true;
            } else {
                console.error(`SypnexAPI: Failed to delete setting ${key}`);
                return false;
            }
        } catch (error) {
            console.error(`SypnexAPI: Error deleting setting ${key}:`, error);
            return false;
        }
    },
    
    /**
     * Get a user preference value
     * @async
     * @param {string} category - Preference category
     * @param {string} key - Preference key
     * @param {*} [defaultValue=null] - Default value if preference not found
     * @memberof SypnexAPI.prototype
     * @returns {Promise<*>} The preference value or default value
     */
    async getPreference(category, key, defaultValue = null) {
        try {
            const response = await fetch(`${this.baseUrl}/preferences/${category}/${key}`);
            if (response.ok) {
                const data = await response.json();
                return data.value !== undefined ? data.value : defaultValue;
            }
            return defaultValue;
        } catch (error) {
            console.error(`SypnexAPI: Error getting preference ${category}.${key}:`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set a user preference value
     * @async
     * @param {string} category - Preference category
     * @param {string} key - Preference key
     * @param {*} value - Value to store
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} True if saved successfully, false otherwise
     */
    async setPreference(category, key, value) {
        try {
            const response = await fetch(`${this.baseUrl}/preferences/${category}/${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });
            
            if (response.ok) {
                return true;
            } else {
                console.error(`SypnexAPI: Failed to save preference ${category}.${key}`);
                return false;
            }
        } catch (error) {
            console.error(`SypnexAPI: Error setting preference ${category}.${key}:`, error);
            return false;
        }
    }
    
}); 

// === sypnex-api-crypto.js ===
// SypnexAPI Crypto - Simple encryption/decryption for user applications
// Extends SypnexAPI with basic crypto methods

Object.assign(SypnexAPI.prototype, {
    /**
     * Encrypt a value using the system's encryption service
     * @param {string|object} value - The value to encrypt (will be JSON.stringify'd if object)
     * @memberof SypnexAPI.prototype
     * @returns {Promise<string|null>} The encrypted value as a string, or null if encryption failed
     * @example
     * // Encrypt a simple string
     * const encrypted = await sypnexAPI.encrypt("my secret data");
     * 
     * // Encrypt an object
     * const encryptedObj = await sypnexAPI.encrypt({username: "john", password: "secret"});
     */
    async encrypt(value) {
        try {
            const response = await fetch(`${this.baseUrl}/crypto/encrypt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.encrypted;
                } else {
                    console.error('SypnexAPI: Encryption failed:', data.error);
                    return null;
                }
            } else {
                console.error('SypnexAPI: Encryption request failed:', response.status);
                return null;
            }
        } catch (error) {
            console.error('SypnexAPI: Error encrypting value:', error);
            return null;
        }
    },
    
    /**
     * Decrypt a value that was previously encrypted with the encrypt() method
     * @param {string} encryptedValue - The encrypted value to decrypt
     * @memberof SypnexAPI.prototype
     * @returns {Promise<string|null>} The decrypted value, or null if decryption failed
     * @example
     * // Decrypt a previously encrypted value
     * const decrypted = await sypnexAPI.decrypt(encryptedValue);
     * 
     * // Handle decryption failure
     * if (decrypted === null) {
     *     console.error("Failed to decrypt value");
     * }
     */
    async decrypt(encryptedValue) {
        try {
            const response = await fetch(`${this.baseUrl}/crypto/decrypt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ encrypted: encryptedValue })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.value;
                } else {
                    console.error('SypnexAPI: Decryption failed:', data.error);
                    return null;
                }
            } else {
                console.error('SypnexAPI: Decryption request failed:', response.status);
                return null;
            }
        } catch (error) {
            console.error('SypnexAPI: Error decrypting value:', error);
            return null;
        }
    }
});


// === sypnex-api-socket.js ===
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

// === sypnex-api-vfs.js ===
// SypnexAPI VFS - Virtual File System operations
// This file extends the SypnexAPI class with virtual file system functionality

// Extend SypnexAPI with VFS methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Get virtual file system statistics
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - System statistics
     */
    async getVirtualFileStats() {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/stats`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to get stats: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error getting virtual file stats:`, error);
            throw error;
        }
    },
    
    /**
     * List files and directories in a path
     * @param {string} path - Directory path (defaults to '/')
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Directory contents
     */
    async listVirtualFiles(path = '/') {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/list?path=${encodeURIComponent(path)}`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to list files: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error listing virtual files:`, error);
            throw error;
        }
    },
    
    /**
     * Create a new folder
     * @param {string} name - Folder name
     * @param {string} parentPath - Parent directory path (defaults to '/')
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Creation result
     */
    async createVirtualFolder(name, parentPath = '/') {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/create-folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, parent_path: parentPath })
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to create folder: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error creating virtual folder:`, error);
            throw error;
        }
    },
    
    /**
     * Create a new file
     * @param {string} name - File name
     * @param {string} content - File content
     * @param {string} parentPath - Parent directory path (defaults to '/')
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Creation result
     */
    async createVirtualFile(name, content = '', parentPath = '/') {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/create-file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, content, parent_path: parentPath })
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to create file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error creating virtual file:`, error);
            throw error;
        }
    },
    
    /**
     * Upload a file from the host system
     * @param {File} file - File object from input element
     * @param {string} parentPath - Parent directory path (defaults to '/')
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Upload result
     */
    async uploadVirtualFile(file, parentPath = '/') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parent_path', parentPath);
            
            const response = await fetch(`${this.baseUrl}/virtual-files/upload-file-streaming`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to upload file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error uploading virtual file:`, error);
            throw error;
        }
    },

    /**
     * Upload a file with real progress tracking based on actual upload progress
     * @param {File} file - File object from input element
     * @param {string} parentPath - Parent directory path (defaults to '/')
     * @param {Function} progressCallback - Callback for progress updates (percent)
     * @memberof SypnexAPI.prototype
     * @returns {Object} - Object with promise and abort method { promise: Promise<object>, abort: Function }
     */
    uploadVirtualFileChunked(file, parentPath = '/', progressCallback = null) {
        try {
            if (progressCallback) progressCallback(0);
            
            // Create FormData for the upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parent_path', parentPath);
            
            // Create XMLHttpRequest for progress tracking
            let xhr = null;
            
            const promise = new Promise((resolve, reject) => {
                xhr = new XMLHttpRequest();
                
                // Track upload progress
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable && progressCallback) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        progressCallback(percentComplete);
                    }
                });
                
                // Handle successful completion
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            if (progressCallback) progressCallback(100);
                            resolve(result);
                        } catch (parseError) {
                            reject(new Error('Invalid JSON response from server'));
                        }
                    } else {
                        try {
                            const errorData = JSON.parse(xhr.responseText);
                            reject(new Error(errorData.error || `Upload failed with status: ${xhr.status}`));
                        } catch (parseError) {
                            reject(new Error(`Upload failed with status: ${xhr.status}`));
                        }
                    }
                });
                
                // Handle errors
                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });
                
                // Handle abort
                xhr.addEventListener('abort', () => {
                    reject(new Error('Upload cancelled by user'));
                });
                
                // Start the upload
                xhr.open('POST', `${this.baseUrl}/virtual-files/upload-file-streaming`);
                xhr.send(formData);
            });
            
            // Return both promise and abort function
            return {
                promise: promise,
                abort: () => {
                    if (xhr) {
                        xhr.abort();
                    }
                }
            };
            
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error uploading chunked file:`, error);
            throw error;
        }
    },

    /**
     * Read a file's content
     * @param {string} filePath - Path to the file
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - File data
     */
    async readVirtualFile(filePath) {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/read/${encodeURIComponent(filePath.substring(1))}`);
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to read file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading virtual file:`, error);
            throw error;
        }
    },
    
    /**
     * Get a file's content as text
     * @param {string} filePath - Path to the file
     * @memberof SypnexAPI.prototype
     * @returns {Promise<string>} - File content as text
     */
    async readVirtualFileText(filePath) {
        try {
            const fileData = await this.readVirtualFile(filePath);
            return fileData.content || '';
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading virtual file text:`, error);
            throw error;
        }
    },
    
    /**
     * Get a file's content as JSON
     * @param {string} filePath - Path to the file
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Parsed JSON content
     */
    async readVirtualFileJSON(filePath) {
        try {
            const content = await this.readVirtualFileText(filePath);
            return JSON.parse(content);
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading virtual file JSON:`, error);
            throw error;
        }
    },

    /**
     * Get a file's content as Blob (for binary files, images, etc.)
     * @param {string} filePath - Path to the file
     * @memberof SypnexAPI.prototype
     * @returns {Promise<Blob>} - File content as Blob
     */
    async readVirtualFileBlob(filePath) {
        try {
            const fileUrl = this.getVirtualFileUrl(filePath);
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch binary file: ${response.status} ${response.statusText}`);
            }
            return await response.blob();
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading virtual file blob:`, error);
            throw error;
        }
    },

    /**
     * Serve a file directly (for binary files, images, etc.)
     * @param {string} filePath - Path to the file
     * @memberof SypnexAPI.prototype
     * @returns {string} - Direct URL to serve the file
     */
    getVirtualFileUrl(filePath) {
        return `${this.baseUrl}/virtual-files/serve/${encodeURIComponent(filePath.substring(1))}`;
    },    /**
     * Delete a file or directory
     * @param {string} itemPath - Path to the item to delete
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Deletion result
     */
    async deleteVirtualItem(itemPath) {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/delete/${encodeURIComponent(itemPath.substring(1))}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to delete item: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error deleting virtual item:`, error);
            throw error;
        }
    },
    
    /**
     * Get information about a file or directory
     * @param {string} itemPath - Path to the item
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Item information
     */
    async getVirtualItemInfo(itemPath) {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/info/${encodeURIComponent(itemPath.substring(1))}`);
            if (response.ok) {
                return await response.json();
            } else {
                // For 404 errors, create a specific error type that won't be logged
                if (response.status === 404) {
                    const notFoundError = new Error('Item not found');
                    notFoundError.isNotFound = true;
                    notFoundError.status = 404;
                    throw notFoundError;
                }
                
                const errorData = await response.json();
                const error = new Error(errorData.error || `Failed to get item info: ${response.status}`);
                error.status = response.status;
                throw error;
            }
        } catch (error) {
            // Only log errors that aren't expected 404s
            if (!error.isNotFound && error.status !== 404) {
                console.error(`SypnexAPI [${this.appId}]: Error getting virtual item info:`, error);
            }
            throw error;
        }
    },
    
    /**
     * Check if a file or directory exists
     * @param {string} itemPath - Path to the item
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} - Whether the item exists
     */
    async virtualItemExists(itemPath) {
        try {
            await this.getVirtualItemInfo(itemPath);
            return true;
        } catch (error) {
            // Return false for any 404 or not found errors
            if (error.isNotFound || error.status === 404) {
                return false;
            }
            throw error;
        }
    },
    
    /**
     * Write content to a file (creates or overwrites)
     * @param {string} filePath - Path to the file
     * @param {string} content - File content
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Write result
     */
    async writeVirtualFile(filePath, content) {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/write${filePath}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content })
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to write file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error writing virtual file:`, error);
            throw error;
        }
    },
    
    /**
     * Write JSON content to a file
     * @param {string} filePath - Path to the file
     * @param {object} data - JSON data to write
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Write result
     */
    async writeVirtualFileJSON(filePath, data) {
        try {
            const content = JSON.stringify(data, null, 2);
            return await this.writeVirtualFile(filePath, content);
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error writing virtual file JSON:`, error);
            throw error;
        }
    },
    
    /**
     * Write binary content to a file using the upload endpoint
     * @param {string} filePath - Path to the file
     * @param {Uint8Array|Blob} binaryData - Binary data to write
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Write result
     */
    async writeVirtualFileBinary(filePath, binaryData) {
        try {
            // First check if file exists and delete it
            const exists = await this.virtualItemExists(filePath);
            if (exists) {
                await this.deleteVirtualItem(filePath);
            }
            
            // Extract name and parent path
            const pathParts = filePath.split('/');
            const fileName = pathParts.pop();
            const parentPath = pathParts.length > 0 ? pathParts.join('/') || '/' : '/';
            
            // Create FormData for the upload
            const formData = new FormData();
            
            // Convert Uint8Array to Blob if needed
            let blob;
            if (binaryData instanceof Uint8Array) {
                blob = new Blob([binaryData], { type: 'application/octet-stream' });
            } else if (binaryData instanceof Blob) {
                blob = binaryData;
            } else {
                throw new Error('Binary data must be Uint8Array or Blob');
            }
            
            formData.append('file', blob, fileName);
            formData.append('parent_path', parentPath);
            
            const response = await fetch(`${this.baseUrl}/virtual-files/upload-file`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to upload binary file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error writing virtual file binary:`, error);
            throw error;
        }
    },
    
    /**
     * Create a directory structure (creates parent directories if needed)
     * @param {string} dirPath - Directory path to create
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Creation result
     */
    async createVirtualDirectoryStructure(dirPath) {
        try {
            const pathParts = dirPath.split('/').filter(part => part.length > 0);
            let currentPath = '/';
            
            for (const part of pathParts) {
                const fullPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;
                
                // Check if directory exists
                const exists = await this.virtualItemExists(fullPath);
                
                if (!exists) {
                    // Create the directory
                    const parentPath = currentPath;
                    await this.createVirtualFolder(part, parentPath);
                }
                
                currentPath = fullPath;
            }
            
            return { success: true, path: dirPath };
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error creating directory structure:`, error);
            throw error;
        }
    }
    
}); 

// === sypnex-api-libraries.js ===
// SypnexAPI Libraries - CDN library loading
// This file extends the SypnexAPI class with library loading functionality

// Extend SypnexAPI with library methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Load a library from CDN
     * @param {string} url - CDN URL of the library
     * @param {object} options - Loading options
     * @memberof SypnexAPI.prototype
     * @returns {Promise<any>} - Loaded library or true if successful
     */
    async loadLibrary(url, options = {}) {
        const {
            localName = null,
            timeout = 10000
        } = options;
        
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Library load timeout: ${url}`));
            }, timeout);
            
            const script = document.createElement('script');
            script.src = url;
            
            script.onload = () => {
                clearTimeout(timeoutId);
                
                if (localName && window[localName]) {
                    resolve(window[localName]);
                } else {
                    resolve(true);
                }
            };
            
            script.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load library: ${url}`));
            };
            
            document.head.appendChild(script);
        });
    },
    
}); 

// === sypnex-api-file-explorer.js ===
// SypnexAPI File Explorer - File explorer UI component
// This file extends the SypnexAPI class with file explorer functionality

// Extend SypnexAPI with file explorer methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Show a file explorer modal for selecting files or directories
     * @param {object} options - Configuration options
     * @param {string} options.mode - 'open' for loading files, 'save' for saving files
     * @param {string} options.title - Modal title
     * @param {string} options.initialPath - Starting directory path
     * @param {string} options.fileName - Default filename for save mode
     * @param {string} options.fileExtension - Required file extension (e.g., '.txt')
     * @param {function} options.onSelect - Callback when file is selected
     * @param {function} options.onCancel - Callback when modal is cancelled
     * @memberof SypnexAPI.prototype
     * @returns {Promise<string>} - Selected file path or null if cancelled
     */
    async showFileExplorer(options = {}) {
        const {
            mode = 'open',
            title = mode === 'open' ? 'Open File' : 'Save File',
            initialPath = '/',
            fileName = '',
            fileExtension = '',
            onSelect = null,
            onCancel = null
        } = options;

        return new Promise((resolve) => {
            // Create modal container
            const modal = document.createElement('div');
            modal.className = 'sypnex-file-explorer-modal';
            modal.innerHTML = `
                <div class="sypnex-file-explorer-container">
                    <div class="sypnex-file-explorer-header">
                        <h3><i class="fas fa-folder-open" style="color: var(--accent-color);"></i> ${title}</h3>
                        <button class="sypnex-file-explorer-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                        
                        <div class="sypnex-file-explorer-toolbar">
                            <div class="sypnex-file-explorer-path">
                                <i class="fas fa-folder"></i>
                                <span class="sypnex-file-explorer-path-text">${initialPath}</span>
                            </div>
                            <div class="sypnex-file-explorer-hint">
                                <i class="fas fa-info-circle"></i> Click folders to navigate, click files to select
                            </div>
                            <div class="sypnex-file-explorer-actions">
                                <button class="sypnex-file-explorer-btn sypnex-file-explorer-new-folder">
                                    <i class="fas fa-folder-plus"></i> New Folder
                                </button>
                                <button class="sypnex-file-explorer-btn sypnex-file-explorer-refresh">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
                            </div>
                        </div>
                        
                        <div class="sypnex-file-explorer-content">
                            <div class="sypnex-file-explorer-main">
                                <div class="sypnex-file-explorer-breadcrumb">
                                    <span class="sypnex-file-explorer-breadcrumb-item" data-path="/">Root</span>
                                </div>
                                
                                <div class="sypnex-file-explorer-list">
                                    <div class="sypnex-file-explorer-loading">
                                        <i class="fas fa-spinner fa-spin"></i> Loading...
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${mode === 'save' ? `
                        <div class="sypnex-file-explorer-save-section">
                            <label for="sypnex-file-explorer-filename">File Name:</label>
                            <input type="text" id="sypnex-file-explorer-filename" class="sypnex-file-explorer-input" 
                                   value="${fileName}" placeholder="Enter filename${fileExtension ? ' (required: ' + fileExtension + ')' : ''}">
                        </div>
                        ` : ''}
                        
                        <div class="sypnex-file-explorer-footer">
                            <button class="sypnex-file-explorer-btn sypnex-file-explorer-btn-secondary sypnex-file-explorer-cancel">
                                Cancel
                            </button>
                            <button class="sypnex-file-explorer-btn sypnex-file-explorer-btn-primary sypnex-file-explorer-select" disabled>
                                ${mode === 'open' ? 'Open' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to DOM
            document.body.appendChild(modal);

            // Add styles if not already added
            if (!document.getElementById('sypnex-file-explorer-styles')) {
                const style = document.createElement('style');
                style.id = 'sypnex-file-explorer-styles';
                style.textContent = `
                    .sypnex-file-explorer-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        z-index: 1000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        box-sizing: border-box;
                        background: rgba(0, 0, 0, 0.5);
                        backdrop-filter: blur(4px);
                    }
                    
                    .sypnex-file-explorer-overlay {
                        display: none;
                    }
                    
                    .sypnex-file-explorer-container {
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        border-radius: 12px;
                        width: 100%;
                        max-width: 800px;
                        max-height: 90vh;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                        backdrop-filter: blur(10px);
                        margin: 5% auto;
                        position: relative;
                    }
                    
                    .sypnex-file-explorer-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        border-radius: 12px 12px 0 0;
                    }
                    
                    .sypnex-file-explorer-header h3 {
                        margin: 0;
                        color: var(--text-primary);
                        font-size: 1.1em;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .sypnex-file-explorer-close {
                        background: none;
                        border: none;
                        color: var(--text-secondary);
                        font-size: 20px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                    }
                    
                    .sypnex-file-explorer-close:hover {
                        background: rgba(255, 71, 87, 0.1);
                        color: #ff4757;
                    }
                    
                    .sypnex-file-explorer-toolbar {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        min-height: 60px;
                    }
                    
                    .sypnex-file-explorer-hint {
                        color: var(--text-secondary);
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        flex: 1;
                        justify-content: center;
                        white-space: nowrap;
                    }
                    
                    .sypnex-file-explorer-path {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        color: var(--text-secondary);
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                        font-size: 14px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-actions {
                        display: flex;
                        gap: 10px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-btn {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        color: var(--text-primary);
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        font-weight: 500;
                        min-width: 120px;
                        justify-content: center;
                    }
                    
                    .sypnex-file-explorer-btn:hover {
                        background: rgba(0, 212, 255, 0.1);
                        border-color: var(--accent-color);
                        box-shadow: 0 2px 8px rgba(0, 212, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-btn:active {
                        background: rgba(0, 212, 255, 0.15);
                        box-shadow: 0 1px 4px rgba(0, 212, 255, 0.3);
                    }
                    
                    .sypnex-file-explorer-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        box-shadow: none;
                    }
                    
                    .sypnex-file-explorer-btn-primary {
                        background: var(--accent-color);
                        color: white;
                        font-weight: 600;
                    }
                    
                    .sypnex-file-explorer-btn-primary:hover:not(:disabled) {
                        background: var(--accent-hover);
                    }
                    
                    .sypnex-file-explorer-btn-secondary {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(255, 255, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-btn-secondary:hover:not(:disabled) {
                        background: rgba(255, 255, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-content {
                        display: flex;
                        flex: 1;
                        min-height: 300px;
                        max-height: calc(90vh - 200px);
                        overflow: hidden;
                    }
                    
                    .sypnex-file-explorer-main {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .sypnex-file-explorer-breadcrumb {
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                    }
                    
                    .sypnex-file-explorer-breadcrumb-item {
                        color: var(--accent-color);
                        cursor: pointer;
                        transition: color 0.2s ease;
                    }
                    
                    .sypnex-file-explorer-breadcrumb-item:hover {
                        color: var(--accent-hover);
                    }
                    
                    .sypnex-file-explorer-list {
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px;
                        max-height: 100%;
                    }
                    
                    .sypnex-file-explorer-loading {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        color: var(--text-secondary);
                        padding: 40px;
                    }
                    
                    .sypnex-file-explorer-item {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        padding: 12px;
                        cursor: pointer;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        margin-bottom: 5px;
                    }
                    
                    .sypnex-file-explorer-item:hover {
                        background: rgba(0, 212, 255, 0.1);
                    }
                    
                    .sypnex-file-explorer-item.selected {
                        background: rgba(0, 212, 255, 0.2);
                        border: 1px solid var(--accent-color);
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"] .sypnex-file-explorer-item-icon {
                        color: #ffd700;
                    }
                    
                    .sypnex-file-explorer-item-icon {
                        width: 20px;
                        text-align: center;
                        color: var(--accent-color);
                    }
                    
                    .sypnex-file-explorer-item-arrow {
                        color: var(--text-secondary);
                        font-size: 12px;
                        opacity: 0.7;
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"]:hover .sypnex-file-explorer-item-arrow {
                        color: var(--accent-color);
                        opacity: 1;
                    }
                    
                    .sypnex-file-explorer-item-name {
                        flex: 1;
                        color: var(--text-primary);
                        font-size: 14px;
                    }
                    
                    .sypnex-file-explorer-item-size {
                        color: var(--text-secondary);
                        font-size: 12px;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                    }
                    
                    .sypnex-file-explorer-save-section {
                        padding: 20px;
                        border-top: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-save-section label {
                        display: block;
                        margin-bottom: 10px;
                        color: var(--text-primary);
                        font-weight: 500;
                    }
                    
                    .sypnex-file-explorer-input {
                        width: 100%;
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        color: var(--text-primary);
                        padding: 10px 15px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                        transition: all 0.2s ease;
                        outline: none;
                    }
                    
                    .sypnex-file-explorer-input:focus {
                        border-color: var(--accent-color);
                        background: rgba(0, 212, 255, 0.05);
                    }
                    
                    .sypnex-file-explorer-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        padding: 20px;
                        border-top: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        border-radius: 0 0 12px 12px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-empty {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--text-secondary);
                        padding: 40px;
                        font-style: italic;
                    }
                    
                    /* Responsive Design */
                    @media (max-width: 768px) {
                        .sypnex-file-explorer-modal {
                            padding: 10px;
                            align-items: flex-start;
                            padding-top: 20px;
                        }
                        
                        .sypnex-file-explorer-container {
                            max-width: 100%;
                            max-height: calc(100vh - 40px);
                            margin: 0;
                        }
                        
                        .sypnex-file-explorer-header {
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-header h3 {
                            font-size: 1em;
                        }
                        
                        .sypnex-file-explorer-toolbar {
                            flex-direction: column;
                            gap: 10px;
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-hint {
                            order: -1;
                            font-size: 11px;
                        }
                        
                        .sypnex-file-explorer-actions {
                            justify-content: center;
                        }
                        
                        .sypnex-file-explorer-btn {
                            padding: 6px 12px;
                            font-size: 13px;
                        }
                        
                        .sypnex-file-explorer-breadcrumb,
                        .sypnex-file-explorer-save-section {
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-footer {
                            padding: 15px;
                            flex-direction: column;
                            gap: 8px;
                        }
                        
                        .sypnex-file-explorer-footer button {
                            width: 100%;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Add modal to DOM
            document.body.appendChild(modal);

            // Get references to elements
            const pathText = modal.querySelector('.sypnex-file-explorer-path-text');
            const breadcrumb = modal.querySelector('.sypnex-file-explorer-breadcrumb');
            const fileList = modal.querySelector('.sypnex-file-explorer-list');
            const selectBtn = modal.querySelector('.sypnex-file-explorer-select');
            const cancelBtn = modal.querySelector('.sypnex-file-explorer-cancel');
            const filenameInput = modal.querySelector('#sypnex-file-explorer-filename');
            const refreshBtn = modal.querySelector('.sypnex-file-explorer-refresh');
            const newFolderBtn = modal.querySelector('.sypnex-file-explorer-new-folder');

            let currentPath = initialPath;
            let selectedItem = null;

            // Load directory contents
            async function loadDirectory(path, isRefresh = false) {
                try {
                    // For refresh operations, add a subtle loading indicator instead of clearing content
                    if (isRefresh) {
                        // Add a subtle loading overlay to existing content
                        const existingContent = fileList.innerHTML;
                        if (!fileList.querySelector('.sypnex-file-explorer-refresh-overlay')) {
                            const overlay = document.createElement('div');
                            overlay.className = 'sypnex-file-explorer-refresh-overlay';
                            overlay.style.cssText = `
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: rgba(0, 0, 0, 0.1);
                                backdrop-filter: blur(1px);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                z-index: 10;
                                opacity: 0;
                                transition: opacity 0.2s ease;
                            `;
                            overlay.innerHTML = '<div style="color: var(--text-secondary); font-size: 12px;"><i class="fas fa-sync-alt fa-spin"></i> Updating...</div>';
                            fileList.style.position = 'relative';
                            fileList.appendChild(overlay);
                            
                            // Fade in the overlay
                            setTimeout(() => overlay.style.opacity = '1', 10);
                        }
                    } else {
                        // For initial loads, show the loading spinner
                        fileList.innerHTML = '<div class="sypnex-file-explorer-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
                    }
                    
                    const response = await this.listVirtualFiles(path);
                    
                    // Handle different response formats
                    let items = [];
                    if (Array.isArray(response)) {
                        items = response;
                    } else if (response && Array.isArray(response.items)) {
                        items = response.items;
                    } else if (response && typeof response === 'object') {
                        // Convert object to array if needed
                        items = Object.values(response);
                    }
                    
                    
                    if (!items || items.length === 0) {
                        fileList.innerHTML = '<div class="sypnex-file-explorer-empty">This directory is empty</div>';
                        fileList.style.position = '';
                        return;
                    }

                    // Ensure items is an array before sorting
                    if (!Array.isArray(items)) {
                        console.error('Items is not an array:', items);
                        fileList.innerHTML = '<div class="sypnex-file-explorer-empty">Error: Invalid response format</div>';
                        fileList.style.position = '';
                        return;
                    }

                    // Sort items: folders first, then files
                    const sortedItems = items.sort((a, b) => {
                        // Handle both 'type' and 'is_directory' fields for compatibility
                        const aIsDir = a.type === 'directory' || a.is_directory;
                        const bIsDir = b.type === 'directory' || b.is_directory;
                        
                        if (aIsDir && !bIsDir) return -1;
                        if (!aIsDir && bIsDir) return 1;
                        return a.name.localeCompare(b.name);
                    });

                    fileList.innerHTML = sortedItems.map(item => {
                        // Handle both 'type' and 'is_directory' fields for compatibility
                        const isDirectory = item.type === 'directory' || item.is_directory;
                        const icon = isDirectory ? 'fa-folder' : 'fa-file';
                        const size = isDirectory ? '' : this._formatFileSize(item.size || 0);
                        const itemPath = path === '/' ? `/${item.name}` : `${path}/${item.name}`;
                        
                        return `
                            <div class="sypnex-file-explorer-item" data-path="${itemPath}" data-type="${isDirectory ? 'directory' : 'file'}" data-name="${item.name}">
                                <div class="sypnex-file-explorer-item-icon">
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div class="sypnex-file-explorer-item-name">${item.name}</div>
                                <div class="sypnex-file-explorer-item-size">${size}</div>
                                ${isDirectory ? '<div class="sypnex-file-explorer-item-arrow"><i class="fas fa-chevron-right"></i></div>' : ''}
                            </div>
                        `;
                    }).join('');

                    // Reset fileList position in case it was modified for overlay
                    fileList.style.position = '';

                    // Update breadcrumb
                    updateBreadcrumb(path);
                    
                } catch (error) {
                    console.error('Error loading directory:', error);
                    fileList.innerHTML = '<div class="sypnex-file-explorer-empty">Error loading directory</div>';
                    fileList.style.position = '';
                }
            }

            // Update breadcrumb navigation
            function updateBreadcrumb(path) {
                const parts = path.split('/').filter(part => part.length > 0);
                let breadcrumbHTML = '<span class="sypnex-file-explorer-breadcrumb-item" data-path="/">Root</span>';
                
                let currentPath = '';
                parts.forEach((part, index) => {
                    currentPath += `/${part}`;
                    const isLast = index === parts.length - 1;
                    breadcrumbHTML += ` / <span class="sypnex-file-explorer-breadcrumb-item" data-path="${currentPath}" ${isLast ? 'style="color: var(--text-primary, #ffffff);"' : ''}>${part}</span>`;
                });
                
                breadcrumb.innerHTML = breadcrumbHTML;
            }

            // Format file size
            this._formatFileSize = function(bytes) {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            };

            // Event listeners
            if (fileList) {
                fileList.addEventListener('click', async (e) => {
                    const item = e.target.closest('.sypnex-file-explorer-item');
                    if (!item) return;

                    const itemPath = item.dataset.path;
                    const itemType = item.dataset.type;
                    const itemName = item.dataset.name;

                    if (itemType === 'directory') {
                        // Navigate to directory
                        currentPath = itemPath;
                        if (pathText) pathText.textContent = currentPath;
                        await loadDirectory.call(this, currentPath);
                    } else {
                        // Select file
                        document.querySelectorAll('.sypnex-file-explorer-item').forEach(el => el.classList.remove('selected'));
                        item.classList.add('selected');
                        selectedItem = { path: itemPath, name: itemName, type: itemType };
                        
                        if (mode === 'save' && filenameInput) {
                            filenameInput.value = itemName;
                        }
                        
                        if (selectBtn) selectBtn.disabled = false;
                    }
                });
            }

            if (breadcrumb) {
                breadcrumb.addEventListener('click', async (e) => {
                    const breadcrumbItem = e.target.closest('.sypnex-file-explorer-breadcrumb-item');
                    if (!breadcrumbItem) return;

                    const path = breadcrumbItem.dataset.path;
                    currentPath = path;
                    if (pathText) pathText.textContent = currentPath;
                    await loadDirectory.call(this, currentPath);
                });
            }

            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    // Add visual loading state without changing button content
                    const icon = refreshBtn.querySelector('i');
                    const originalClasses = icon.className;
                    
                    // Just change the icon class, don't touch innerHTML
                    icon.className = 'fas fa-sync-alt fa-spin';
                    refreshBtn.disabled = true;
                    refreshBtn.style.opacity = '0.7';
                    
                    try {
                        await loadDirectory.call(this, currentPath, true); // true = isRefresh
                    } finally {
                        // Restore button state
                        icon.className = originalClasses;
                        refreshBtn.disabled = false;
                        refreshBtn.style.opacity = '';
                    }
                });
            }

            if (newFolderBtn) {
                newFolderBtn.addEventListener('click', async () => {
                    const folderName = await this.showInputModal(
                        'Create New Folder',
                        'Enter folder name:',
                        {
                            placeholder: 'e.g., My Documents',
                            confirmText: 'Create',
                            icon: 'fas fa-folder-plus'
                        }
                    );
                    
                    if (!folderName) return;

                    try {
                        await this.createVirtualFolder(folderName, currentPath);
                        await loadDirectory.call(this, currentPath);
                        this.showNotification(`Folder "${folderName}" created successfully`, 'success');
                    } catch (error) {
                        this.showNotification(`Failed to create folder: ${error.message}`, 'error');
                    }
                });
            }

            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    let selectedPath = null;
                    
                    if (mode === 'open') {
                        if (selectedItem) {
                            selectedPath = selectedItem.path;
                        }
                    } else {
                        // Save mode
                        const filename = filenameInput ? filenameInput.value.trim() : '';
                        if (!filename) {
                            this.showNotification('Please enter a filename', 'warning');
                            return;
                        }
                        
                        if (fileExtension && !filename.endsWith(fileExtension)) {
                            this.showNotification(`Filename must end with ${fileExtension}`, 'warning');
                            return;
                        }
                        
                        selectedPath = currentPath === '/' ? `/${filename}` : `${currentPath}/${filename}`;
                    }

                    if (selectedPath) {
                        if (onSelect) onSelect(selectedPath);
                        resolve(selectedPath);
                    } else {
                        this.showNotification('Please select a file', 'warning');
                        return;
                    }

                    modal.remove();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (onCancel) onCancel();
                    resolve(null);
                    modal.remove();
                });
            }

            const closeBtn = modal.querySelector('.sypnex-file-explorer-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (onCancel) onCancel();
                    resolve(null);
                    modal.remove();
                });
            }

            // Handle filename input for save mode
            if (filenameInput && selectBtn) {
                filenameInput.addEventListener('input', () => {
                    const filename = filenameInput.value.trim();
                    selectBtn.disabled = !filename;
                });
            }

            // Load initial directory
            loadDirectory.call(this, currentPath);
        });
    }
    
}); 

// === sypnex-api-logs.js ===
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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


// === sypnex-api-app-management.js ===
// SypnexAPI App Management - Application management operations
// This file extends the SypnexAPI class with app management functionality

// Extend SypnexAPI with app management methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Get available applications from the registry
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
     * @async
     * @param {string} appId - Application ID to update
     * @param {string} downloadUrl - Download URL for the app update (required)
     * @returns {Promise<object>} - Update result
     */
    async updateApp(appId, downloadUrl) {
        try {
            if (!downloadUrl) {
                throw new Error('Download URL is required for app update');
            }
            
            const requestBody = {
                download_url: downloadUrl
            };
            
            
            const fullUrl = `${this.baseUrl}/user-apps/update/${appId}`;
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (response.ok) {
                const result = await response.json();
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Update failed: ${response.status} ${response.statusText}: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error updating app ${appId}:`, error);
            throw error;
        }
    },
    
    /**
     * Refresh the application registry cache
     * @async
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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
     * @memberof SypnexAPI.prototype
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


// === sypnex-api-network.js ===
// SypnexAPI Network - Network operations and HTTP proxy
// This file extends the SypnexAPI class with network functionality

// Extend SypnexAPI with network methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Proxy an HTTP request through the system (tries direct CORS, falls back to proxy)
     * @async
     * @param {object} options - HTTP request options
     * @param {string} options.url - Target URL for the request
     * @param {string} [options.method='GET'] - HTTP method (GET, POST, PUT, DELETE, etc.)
     * @param {object} [options.headers={}] - HTTP headers to send
     * @param {*} [options.body] - Request body (will be JSON stringified if object)
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @param {boolean} [options.followRedirects=true] - Whether to follow redirects
     * @param {boolean} [options.forceProxy=false] - Force use of backend proxy instead of direct CORS
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Response data in proxy format for compatibility
     */
    async proxyHTTP(options) {
        const {
            url,
            method = 'GET',
            headers = {},
            body = null,
            timeout = 30,
            followRedirects = true,
            forceProxy = false
        } = options;
        
        if (!url) {
            throw new Error('URL is required for HTTP proxy request');
        }

        // If forceProxy is true, skip direct CORS attempt
        if (forceProxy) {
            return await this._proxyThroughBackend(options);
        }

        // Try direct CORS first
        try {
            const result = await this._directCORSRequest(options);
            return result;
        } catch (corsError) {
            // If CORS fails, fall back to backend proxy
            const result = await this._proxyThroughBackend(options);
            return result;
        }
    },

    /**
     * Make a direct CORS request
     * @memberof SypnexAPI.prototype
     * @private
     */
    async _directCORSRequest(options) {
        const {
            url,
            method = 'GET',
            headers = {},
            body = null,
            timeout = 30,
            followRedirects = true
        } = options;

        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
        
        try {
            // Prepare fetch options
            const fetchOptions = {
                method: method.toUpperCase(),
                headers: {
                    ...headers
                },
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit',
                redirect: followRedirects ? 'follow' : 'manual'
            };
            
            // Handle body based on content type and data type
            // Only add body for methods that support it
            if (body !== null && body !== undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
                if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof ArrayBuffer) && !(body instanceof Blob)) {
                    fetchOptions.body = JSON.stringify(body);
                    // Ensure Content-Type is set for JSON
                    if (!fetchOptions.headers['Content-Type'] && !fetchOptions.headers['content-type']) {
                        fetchOptions.headers['Content-Type'] = 'application/json';
                    }
                } else {
                    fetchOptions.body = body;
                }
            }
            
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            
            // Check for CORS failure - if response is not ok and type is 'opaque' or 'cors', it's likely a CORS issue
            if (!response.ok && (response.type === 'opaque' || response.type === 'cors')) {
                throw new Error(`CORS request failed with status ${response.status}`);
            }
            
            // Also check if response is completely empty (another CORS indicator)
            if (response.status === 0) {
                throw new Error('Network request failed - likely CORS issue');
            }
            
            // Check if response is binary based on content-type
            const contentType = response.headers.get('content-type') || '';
            const isBinary = contentType.includes('audio/') || 
                            contentType.includes('video/') || 
                            contentType.includes('image/') ||
                            contentType.includes('application/octet-stream') ||
                            contentType.includes('application/pdf');
            
            let content;
            if (isBinary) {
                // Handle binary response as base64
                const arrayBuffer = await response.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                content = btoa(binary);
            } else {
                // Handle text response
                content = await response.text();
                
                // Try to parse as JSON if content-type suggests it
                if (contentType.includes('application/json')) {
                    try {
                        content = JSON.parse(content);
                    } catch (e) {
                        // Keep as text if JSON parsing fails
                    }
                }
            }
            
            // Return response in the same format as the old proxy
            return {
                status: response.status,
                content: content,
                is_binary: isBinary,
                headers: Object.fromEntries(response.headers.entries())
            };
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout} seconds`);
            }
            
            // Let CORS errors bubble up so they can trigger fallback
            throw fetchError;
        }
    },

    /**
     * Make a request through the backend proxy
     * @memberof SypnexAPI.prototype
     * @private
     */
    async _proxyThroughBackend(options) {
        try {
            const {
                url,
                method = 'GET',
                headers = {},
                body = null,
                timeout = 30,
                followRedirects = true
            } = options;
            
            const proxyRequest = {
                url,
                method: method.toUpperCase(),
                headers,
                timeout,
                followRedirects
            };
            
            // Handle body based on content type and data type
            if (body !== null && body !== undefined) {
                proxyRequest.body = body;
            }
            
            const response = await fetch(`${this.baseUrl}/proxy/http`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(proxyRequest)
            });
            
            if (response.ok) {
                const result = await response.json();
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Proxy request failed: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error in backend proxy request:`, error);
            // Return error in proxy format for compatibility
            return {
                status: 0,
                error: error.message,
                content: null,
                is_binary: false
            };
        }
    },
    
    /**
     * Make a GET request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {object} [options={}] - Additional options
     * @param {object} [options.headers={}] - HTTP headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Response data
     */
    async proxyGET(url, options = {}) {
        return await this.proxyHTTP({
            url,
            method: 'GET',
            ...options
        });
    },
    
    /**
     * Make a POST request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {*} body - Request body
     * @param {object} [options={}] - Additional options
     * @param {object} [options.headers={}] - HTTP headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Response data
     */
    async proxyPOST(url, body, options = {}) {
        return await this.proxyHTTP({
            url,
            method: 'POST',
            body,
            ...options
        });
    },
    
    /**
     * Make a PUT request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {*} body - Request body
     * @param {object} [options={}] - Additional options
     * @param {object} [options.headers={}] - HTTP headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Response data
     */
    async proxyPUT(url, body, options = {}) {
        return await this.proxyHTTP({
            url,
            method: 'PUT',
            body,
            ...options
        });
    },
    
    /**
     * Make a DELETE request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {object} [options={}] - Additional options
     * @param {object} [options.headers={}] - HTTP headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Response data
     */
    async proxyDELETE(url, options = {}) {
        return await this.proxyHTTP({
            url,
            method: 'DELETE',
            ...options
        });
    },
    
    /**
     * Make a JSON API request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {object} [options={}] - Request options
     * @param {string} [options.method='GET'] - HTTP method
     * @param {object} [options.data] - JSON data to send
     * @param {object} [options.headers={}] - Additional headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} - Parsed JSON response
     */
    async proxyJSON(url, options = {}) {
        const {
            method = 'GET',
            data = null,
            headers = {},
            timeout = 30
        } = options;
        
        const requestOptions = {
            url,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            timeout
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            requestOptions.body = data;
        }
        
        return await this.proxyHTTP(requestOptions);
    }
    
});


// === sypnex-api-llm.js ===
// SypnexAPI LLM - Universal LLM interface for user applications
// Extends SypnexAPI with LLM provider translation capabilities

Object.assign(SypnexAPI.prototype, {
    
    /**
     * Complete a chat conversation using any supported LLM provider
     * Translates OpenAI format to provider-specific format and normalizes response
     * @async
     * @param {object} options - Configuration options
     * @param {string} options.provider - Provider: 'openai', 'anthropic', 'google', 'ollama'
     * @param {string} options.endpoint - API endpoint URL
     * @param {string} [options.apiKey] - API key (not needed for Ollama)
     * @param {string} options.model - Model name
     * @param {Array} options.messages - Messages array in OpenAI format
     * @param {number} [options.temperature=0.7] - Temperature (0-1)
     * @param {number} [options.maxTokens=1000] - Maximum tokens to generate
     * @param {boolean} [options.stream=false] - Whether to stream response
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} Normalized response: {content, usage, model, provider}
     */
    async llmComplete(options) {
        try {
            const {
                provider,
                endpoint,
                apiKey,
                model,
                messages,
                temperature = 0.7,
                maxTokens = 1000,
                stream = false
            } = options;

            // Validate required parameters
            if (!provider || !endpoint || !model || !messages) {
                throw new Error('Missing required parameters: provider, endpoint, model, messages');
            }

            if (!Array.isArray(messages) || messages.length === 0) {
                throw new Error('Messages must be a non-empty array');
            }

            // Format request based on provider
            const formattedRequest = this._formatLLMRequest(provider, {
                model,
                messages,
                temperature,
                maxTokens,
                stream
            });

            // Prepare headers
            const headers = this._getLLMHeaders(provider, apiKey);

            // Make the request using existing proxyHTTP
            const proxyRequest = {
                url: endpoint,
                method: 'POST',
                headers: headers,
                body: formattedRequest,
                timeout: 60 // Longer timeout for LLM requests
            };

            const response = await this.proxyHTTP(proxyRequest);

            if (!response || response.status < 200 || response.status >= 300) {
                throw new Error(`LLM API request failed: ${response?.status || 'Unknown error'}`);
            }

            // Parse response
            let responseData;
            if (typeof response.content === 'string') {
                responseData = JSON.parse(response.content);
            } else {
                responseData = response.content;
            }

            // Normalize response based on provider
            const normalizedResponse = this._normalizeLLMResponse(provider, responseData);

            return {
                ...normalizedResponse,
                provider: provider
            };

        } catch (error) {
            console.error('SypnexAPI: LLM completion error:', error);
            throw error;
        }
    },

    /**
     * Format request for specific provider (private method)
     * @memberof SypnexAPI.prototype
     * @private
     */
    _formatLLMRequest(provider, options) {
        const { model, messages, temperature, maxTokens, stream } = options;

        switch (provider.toLowerCase()) {
            case 'openai':
                return {
                    model: model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: maxTokens,
                    stream: stream
                };

            case 'anthropic':
                // Separate system message for Anthropic
                const anthropicMessages = [];
                let systemMessage = null;

                for (const msg of messages) {
                    if (msg.role === 'system') {
                        systemMessage = msg.content;
                    } else {
                        anthropicMessages.push({
                            role: msg.role,
                            content: msg.content
                        });
                    }
                }

                const anthropicRequest = {
                    model: model,
                    messages: anthropicMessages,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    stream: stream
                };

                if (systemMessage) {
                    anthropicRequest.system = systemMessage;
                }

                return anthropicRequest;

            case 'google':
                // Convert to Google's parts format
                const contents = [];
                let systemInstruction = null;

                for (const msg of messages) {
                    if (msg.role === 'system') {
                        systemInstruction = msg.content;
                    } else if (msg.role === 'user') {
                        contents.push({
                            role: 'user',
                            parts: [{ text: msg.content }]
                        });
                    } else if (msg.role === 'assistant') {
                        contents.push({
                            role: 'model',
                            parts: [{ text: msg.content }]
                        });
                    }
                }

                const googleRequest = {
                    contents: contents,
                    generationConfig: {
                        temperature: temperature,
                        maxOutputTokens: maxTokens
                    }
                };

                if (systemInstruction) {
                    googleRequest.systemInstruction = {
                        parts: [{ text: systemInstruction }]
                    };
                }

                return googleRequest;

            case 'ollama':
                return {
                    model: model,
                    messages: messages,
                    stream: stream,
                    options: {
                        temperature: temperature,
                        num_predict: maxTokens
                    }
                };

            default:
                throw new Error(`Unsupported LLM provider: ${provider}`);
        }
    },

    /**
     * Get headers for specific provider (private method)
     * @memberof SypnexAPI.prototype
     * @private
     */
    _getLLMHeaders(provider, apiKey) {
        const headers = {
            'Content-Type': 'application/json'
        };

        switch (provider.toLowerCase()) {
            case 'openai':
                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }
                break;

            case 'anthropic':
                if (apiKey) {
                    headers['X-API-Key'] = apiKey;
                    headers['anthropic-version'] = '2023-06-01';
                }
                break;

            case 'google':
                if (apiKey) {
                    headers['X-goog-api-key'] = apiKey;
                }
                break;

            case 'ollama':
                // Ollama typically doesn't require authentication
                break;
        }

        return headers;
    },

    /**
     * Normalize response from provider to OpenAI format (private method)
     * @memberof SypnexAPI.prototype
     * @private
     */
    _normalizeLLMResponse(provider, responseData) {
        switch (provider.toLowerCase()) {
            case 'openai':
                return {
                    content: responseData.choices?.[0]?.message?.content || '',
                    model: responseData.model || '',
                    usage: responseData.usage || {}
                };

            case 'anthropic':
                const anthropicContent = responseData.content?.[0]?.text || '';
                return {
                    content: anthropicContent,
                    model: responseData.model || '',
                    usage: responseData.usage || {}
                };

            case 'google':
                const googleContent = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                return {
                    content: googleContent,
                    model: 'google-model', // Google doesn't return model in response
                    usage: responseData.usageMetadata || {}
                };

            case 'ollama':
                return {
                    content: responseData.message?.content || '',
                    model: responseData.model || '',
                    usage: {
                        prompt_tokens: responseData.prompt_eval_count || 0,
                        completion_tokens: responseData.eval_count || 0,
                        total_tokens: (responseData.prompt_eval_count || 0) + (responseData.eval_count || 0)
                    }
                };

            default:
                // Generic fallback
                return {
                    content: JSON.stringify(responseData),
                    model: 'unknown',
                    usage: {}
                };
        }
    }

});



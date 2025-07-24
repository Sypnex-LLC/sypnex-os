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
     * Show a confirmation dialog with standard OS styling
     * @async
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {object} [options={}] - Configuration options
     * @param {string} [options.confirmText='Yes'] - Text for confirm button
     * @param {string} [options.cancelText='No'] - Text for cancel button
     * @param {string} [options.type='warning'] - Dialog type: 'warning', 'danger', 'info'
     * @param {string} [options.icon='fas fa-exclamation-triangle'] - FontAwesome icon class
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
                    color: var(--danger-color, #ff4444);
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

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(false);
                }
            });

            // Escape key to close
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closeModal(false);
                }
            };
            document.addEventListener('keydown', escapeHandler);
        });
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
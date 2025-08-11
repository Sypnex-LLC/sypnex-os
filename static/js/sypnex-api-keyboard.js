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
        
        console.log('SypnexKeyboardManager: Initialized global keyboard manager');
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
            console.log(`SypnexKeyboardManager: Registered ${Object.keys(shortcuts).length} shortcuts for app ${appId}`);
        },
        
        /**
         * Unregister all shortcuts for an application
         * @param {string} appId - Application identifier
         */
        unregisterApp(appId) {
            const appConfig = keyboardState.appShortcuts.get(appId);
            if (appConfig) {
                const shortcutCount = Object.keys(appConfig.shortcuts).length;
                keyboardState.appShortcuts.delete(appId);
                console.log(`SypnexKeyboardManager: Unregistered ${shortcutCount} shortcuts for app ${appId}`);
                return shortcutCount;
            }
            return 0;
        },
        
        /**
         * Get statistics about registered shortcuts
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
        
        console.log('SypnexAPI: Registered ' + Object.keys(shortcuts).length + ' keyboard shortcuts for app ' + appId);
    },
    
    /**
     * Get keyboard shortcut statistics
     * @returns {object} Statistics about registered shortcuts
     */
    getKeyboardStats() {
        return window.sypnexKeyboardManager.getStats();
    }
});

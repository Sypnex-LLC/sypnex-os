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

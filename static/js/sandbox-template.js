(async function() {
    // Create a local scope with access to the window element
    const windowElement = document.querySelector('[data-app-id="${appId}"]');
    const appContainer = windowElement ? windowElement.querySelector('.app-window-content') : null;
    
    // Determine the correct app ID for settings (extract original app ID from settings window ID)
    const actualAppId = '${appId}'.startsWith('settings-') ? '${appId}'.replace('settings-', '') : '${appId}';
    
    // Timer tracking for automatic cleanup
    const appTimers = new Set();
    const originalSetInterval = setInterval;
    const originalSetTimeout = setTimeout;
    const originalClearInterval = clearInterval;
    const originalClearTimeout = clearTimeout;
    
    // Event listener tracking for automatic cleanup
    const appEventListeners = new Set();
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    // Store original global methods to restore later
    const originalDocAddEventListener = document.addEventListener;
    const originalDocRemoveEventListener = document.removeEventListener;
    const originalWinAddEventListener = window.addEventListener;
    const originalWinRemoveEventListener = window.removeEventListener;
    
    // Create app-specific wrapped versions that don't modify global prototypes
    const trackingAddEventListener = function(target, type, listener, options) {
        // Only track if this is a global target (document, window, or outside app container)
        const isGlobalTarget = target === document || target === window || 
                             !appContainer || !appContainer.contains(target);
        
        if (isGlobalTarget) {
            appEventListeners.add({
                target: target,
                type: type,
                listener: listener,
                options: options
            });
            console.log('App ${appId} added global event listener:', type, 'on', target.constructor.name);
        }
        
        return originalAddEventListener.call(target, type, listener, options);
    };
    
    const trackingRemoveEventListener = function(target, type, listener, options) {
        // Find and remove from tracking
        appEventListeners.forEach(item => {
            if (item.target === target && item.type === type && item.listener === listener) {
                appEventListeners.delete(item);
                console.log('App ${appId} removed global event listener:', type, 'from', target.constructor.name);
            }
        });
        
        return originalRemoveEventListener.call(target, type, listener, options);
    };
    
    // Override timer functions to track them
    setInterval = function(callback, delay, ...args) {
        const id = originalSetInterval(callback, delay, ...args);
        appTimers.add({type: 'interval', id: id});
        console.log('App ${appId} created setInterval:', id);
        return id;
    };
    
    setTimeout = function(callback, delay, ...args) {
        const id = originalSetTimeout(callback, delay, ...args);
        appTimers.add({type: 'timeout', id: id});
        console.log('App ${appId} created setTimeout:', id);
        return id;
    };
    
    clearInterval = function(id) {
        originalClearInterval(id);
        appTimers.forEach(timer => {
            if (timer.id === id && timer.type === 'interval') {
                appTimers.delete(timer);
                console.log('App ${appId} cleared setInterval:', id);
            }
        });
    };
    
    clearTimeout = function(id) {
        originalClearTimeout(id);
        appTimers.forEach(timer => {
            if (timer.id === id && timer.type === 'timeout') {
                appTimers.delete(timer);
                console.log('App ${appId} cleared setTimeout:', id);
            }
        });
    };
    
    // Override global methods TEMPORARILY (will be restored on cleanup)
    document.addEventListener = function(type, listener, options) {
        return trackingAddEventListener(document, type, listener, options);
    };
    
    document.removeEventListener = function(type, listener, options) {
        return trackingRemoveEventListener(document, type, listener, options);
    };
    
    window.addEventListener = function(type, listener, options) {
        return trackingAddEventListener(window, type, listener, options);
    };
    
    window.removeEventListener = function(type, listener, options) {
        return trackingRemoveEventListener(window, type, listener, options);
    };
    
    // Create app-specific helper functions (local to this scope)
    const getAppSetting = async function(key, defaultValue = null) {
        try {
            const response = await fetch(`/api/app-settings/${actualAppId}/${key}`);
            if (response.ok) {
                const data = await response.json();
                return data.value !== undefined ? data.value : defaultValue;
            }
            return defaultValue;
        } catch (error) {
            console.error('Error getting app setting:', error);
            return defaultValue;
        }
    };
    
    const getAllAppSettings = async function() {
        try {
            const response = await fetch(`/api/app-settings/${actualAppId}`);
            if (response.ok) {
                const data = await response.json();
                return data.settings || {};
            }
            return {};
        } catch (error) {
            console.error('Error getting all app settings:', error);
            return {};
        }
    };
    
    const showNotification = function(message, type = 'info') {
        // Use the OS notification system if available
        if (typeof window.sypnexOS !== 'undefined' && window.sypnexOS.showNotification) {
            window.sypnexOS.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
            if (type === 'error') {
                console.error(message);
            }
        }
    };
    
    // Load SypnexAPI from external file content
    ${sypnexAPIContent}
    
    // Create SypnexAPI instance with local helper functions (NOT global)
    const SypnexAPIClass = SypnexAPI; // Local reference to the class
    const sypnexAPI = new SypnexAPIClass(actualAppId, {
        getAppSetting: getAppSetting,
        getAllAppSettings: getAllAppSettings,
        showNotification: showNotification
    });
    
    console.log('SypnexAPI loaded and ready for app: ' + actualAppId);
    
    // Execute the app script with local variables in scope
    ${scriptContent}
    
    // Dynamically expose detected functions to the app's local scope only
    // This allows onclick handlers and other references within the app to work
    const functionNames = ${functionNames};
    functionNames.forEach(funcName => {
        try {
            // Check if the function exists in the current scope and expose it locally
            if (typeof eval(funcName) === 'function') {
                // Create a local reference to the function
                const func = eval(funcName);
                // Make it available in the current scope
                eval(`${funcName} = func`);
            }
        } catch (e) {
            // Function doesn't exist or can't be accessed, that's okay
        }
    });
    
    // Store app-specific references in a namespaced object to avoid global pollution
    if (!window.sypnexApps) {
        window.sypnexApps = {};
    }
    window.sypnexApps[actualAppId] = {
        sypnexAPI: sypnexAPI,
        getAppSetting: getAppSetting,
        getAllAppSettings: getAllAppSettings,
        showNotification: showNotification,
        windowElement: windowElement,
        appContainer: appContainer,
        // Expose tracking data for resource monitoring
        getTimerCount: function() {
            return appTimers.size;
        },
        getEventListenerCount: function() {
            return appEventListeners.size;
        },
        getTrackingStats: function() {
            return {
                timers: appTimers.size,
                globalEventListeners: appEventListeners.size,
                domNodes: appContainer ? appContainer.querySelectorAll('*').length : 0
            };
        },
        // Timer cleanup function
        cleanupTimers: function() {
            let cleanedCount = 0;
            appTimers.forEach(timer => {
                if (timer.type === 'interval') {
                    originalClearInterval(timer.id);
                    cleanedCount++;
                    console.log('Cleaned up setInterval:', timer.id);
                } else if (timer.type === 'timeout') {
                    originalClearTimeout(timer.id);
                    cleanedCount++;
                    console.log('Cleaned up setTimeout:', timer.id);
                }
            });
            appTimers.clear();
            if (cleanedCount > 0) {
                console.log('App ${appId}: Cleaned up', cleanedCount, 'timers');
            }
            return cleanedCount;
        },
        // Event listener cleanup function
        cleanupEventListeners: function() {
            let cleanedCount = 0;
            appEventListeners.forEach(item => {
                try {
                    originalRemoveEventListener.call(item.target, item.type, item.listener, item.options);
                    cleanedCount++;
                    console.log('Cleaned up event listener:', item.type, 'from', item.target.constructor.name);
                } catch (error) {
                    console.warn('Error cleaning up event listener:', error);
                }
            });
            appEventListeners.clear();
            if (cleanedCount > 0) {
                console.log('App ${appId}: Cleaned up', cleanedCount, 'event listeners');
            }
            return cleanedCount;
        },
        // Combined cleanup function
        cleanup: function() {
            const timersCleanedUp = this.cleanupTimers();
            const listenersCleanedUp = this.cleanupEventListeners();
            
            // CRITICAL: Restore original global methods to prevent cross-contamination
            document.addEventListener = originalDocAddEventListener;
            document.removeEventListener = originalDocRemoveEventListener;
            window.addEventListener = originalWinAddEventListener;
            window.removeEventListener = originalWinRemoveEventListener;
            
            console.log('App ${appId}: Restored original global event listener methods');
            
            return { timers: timersCleanedUp, listeners: listenersCleanedUp };
        }
    };
    
    console.log('App sandbox created for: ' + actualAppId);
})();

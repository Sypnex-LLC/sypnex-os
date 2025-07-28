(async function() {
    // Create a local scope with access to the window element
    const windowElement = document.querySelector('.app-window[data-app-id="${appId}"]');
    const appContainer = windowElement ? windowElement.querySelector('.app-window-content .app-container') : null;
    
    // Determine the correct app ID for settings (extract original app ID from settings window ID)
    const actualAppId = '${appId}'.startsWith('settings-') ? '${appId}'.replace('settings-', '') : '${appId}';
    
    // Create centralized tracking system (similar to built-in app tracker)
    if (!window.sypnexTimerTracker) {
        window.sypnexTimerTracker = new Map(); // appId -> Set of timers
    }
    if (!window.sypnexEventTracker) {
        window.sypnexEventTracker = new Map(); // appId -> Set of event listeners
    }
    
    // Initialize tracking for this app
    const appTimers = new Set();
    const appEventListeners = new Set();
    window.sypnexTimerTracker.set(actualAppId, appTimers);
    window.sypnexEventTracker.set(actualAppId, appEventListeners);
    
    // Store original functions (don't override globals)
    const originalSetInterval = setInterval;
    const originalSetTimeout = setTimeout;
    const originalClearInterval = clearInterval;
    const originalClearTimeout = clearTimeout;
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    // Store original global methods for restoration
    const originalDocumentAddEventListener = document.addEventListener;
    const originalDocumentRemoveEventListener = document.removeEventListener;
    const originalWindowAddEventListener = window.addEventListener;
    const originalWindowRemoveEventListener = window.removeEventListener;
    
    // Create app-scoped tracking functions (no global override)
    const trackingSetInterval = function(callback, delay, ...args) {
        const id = originalSetInterval(callback, delay, ...args);
        appTimers.add({type: 'interval', id: id});
        return id;
    };
    
    const trackingSetTimeout = function(callback, delay, ...args) {
        const id = originalSetTimeout(callback, delay, ...args);
        appTimers.add({type: 'timeout', id: id});
        return id;
    };
    
    const trackingClearInterval = function(id) {
        originalClearInterval(id);
        appTimers.forEach(timer => {
            if (timer.id === id && timer.type === 'interval') {
                appTimers.delete(timer);
            }
        });
    };
    
    const trackingClearTimeout = function(id) {
        originalClearTimeout(id);
        appTimers.forEach(timer => {
            if (timer.id === id && timer.type === 'timeout') {
                appTimers.delete(timer);
            }
        });
    };
    
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
        }
        
        return originalAddEventListener.call(target, type, listener, options);
    };
    
    const trackingRemoveEventListener = function(target, type, listener, options) {
        // Find and remove from tracking
        appEventListeners.forEach(item => {
            if (item.target === target && item.type === type && item.listener === listener) {
                appEventListeners.delete(item);
            }
        });
        
        return originalRemoveEventListener.call(target, type, listener, options);
    };
    
    // Provide tracked versions in local scope (not global override)
    setInterval = trackingSetInterval;
    setTimeout = trackingSetTimeout;
    clearInterval = trackingClearInterval;
    // Provide document/window event listener tracking in local scope
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

    // Create app-scoped DOM selection functions available as local variables
    const getElementById = function(id) {
        // Only find elements within the app container
        if (appContainer) {
            return appContainer.querySelector(`#${id}`);
        }
        // If no app container, return null (no access to global elements)  
        return null;
    };
    
    const querySelector = function(selector) {
        // Only find elements within the app container
        if (appContainer) {
            return appContainer.querySelector(selector);
        }
        // If no app container, return null (no access to global elements)
        return null;
    };
    
    const querySelectorAll = function(selector) {
        // Only find elements within the app container
        if (appContainer) {
            return appContainer.querySelectorAll(selector);
        }
        // If no app container, return empty NodeList
        return document.createDocumentFragment().querySelectorAll(selector);
    };
    
    const appendToHead = function(element) {
        // SANDBOX PROTECTION: Prevent apps from modifying global document head
        // Instead, append to the app container to keep styles/scripts scoped
        if (appContainer && element) {
            console.warn('App attempted to append to document.head - redirecting to app container for isolation');
            appContainer.appendChild(element);
            return element;
        }
        return null;
    };
    
    const appendToBody = function(element) {
        // SANDBOX PROTECTION: Prevent apps from modifying global document body
        // Instead, append to the app container to keep elements scoped
        if (appContainer && element) {
            console.warn('App attempted to append to document.body - redirecting to app container for isolation');
            appContainer.appendChild(element);
            return element;
        }
        return null;
    };
    
    const getElementsByClassName = function(className) {
        // Only find elements within the app container
        if (appContainer) {
            return appContainer.getElementsByClassName(className);
        }
        return document.createDocumentFragment().getElementsByClassName(className);
    };
    
    const getElementsByTagName = function(tagName) {
        // Only find elements within the app container
        if (appContainer) {
            return appContainer.getElementsByTagName(tagName);
        }
        return document.createDocumentFragment().getElementsByTagName(tagName);
    };
    
    const getElementsByName = function(name) {
        // SANDBOX PROTECTION: Prevent access to global named elements
        // Search only within app container
        if (appContainer) {
            return appContainer.querySelectorAll(`[name="${name}"]`);
        }
        return [];
    };
    
    // TEMPORARILY DISABLED: Enhanced DOM element prototype functions for scoped navigation
    // These cause cross-app contamination when apps close and clean up global prototypes
    // TODO: Implement centralized tracking pattern like timer/event tracking
    /*
    const originalClosest = Element.prototype.closest;
    const originalParentNode = Object.getOwnPropertyDescriptor(Node.prototype, 'parentNode');
    const originalParentElement = Object.getOwnPropertyDescriptor(Element.prototype, 'parentElement');
    
    // Create scoped navigation functions that work with any element
    const scopedClosest = function(element, selector) {
        if (!element || !appContainer) return null;
        
        // Only search within app container boundaries
        let result = originalClosest.call(element, selector);
        if (result && appContainer.contains(result)) {
            return result;
        }
        return null; // Don't return elements outside app container
    };
    
    const scopedParentNode = function(element) {
        if (!element || !appContainer) return null;
        
        const parent = element.parentNode;
        // Only return parent if it's within app container
        if (parent && (parent === appContainer || appContainer.contains(parent))) {
            return parent;
        }
        return null; // Don't allow access to parents outside container
    };
    
    const scopedParentElement = function(element) {
        if (!element || !appContainer) return null;
        
        const parent = element.parentElement;
        // Only return parent if it's within app container
        if (parent && (parent === appContainer || appContainer.contains(parent))) {
            return parent;
        }
        return null; // Don't allow access to parents outside container
    };
    
    // Override the global methods within this app's scope to use scoped versions
    Element.prototype.scopedClosest = function(selector) {
        return scopedClosest(this, selector);
    };
    
    Object.defineProperty(Element.prototype, 'scopedParentNode', {
        get: function() {
            return scopedParentNode(this);
        },
        configurable: true
    });
    
    Object.defineProperty(Element.prototype, 'scopedParentElement', {
        get: function() {
            return scopedParentElement(this);
        },
        configurable: true
    });
    */
    
    // App-scoped storage functions (prevents cross-app storage interference)
    const setAppStorage = function(key, value) {
        const scopedKey = `app_${actualAppId}_${key}`;
        try {
            localStorage.setItem(scopedKey, value);
            return true;
        } catch (error) {
            console.warn('App storage failed:', error);
            return false;
        }
    };
    
    const getAppStorage = function(key) {
        const scopedKey = `app_${actualAppId}_${key}`;
        try {
            return localStorage.getItem(scopedKey);
        } catch (error) {
            console.warn('App storage retrieval failed:', error);
            return null;
        }
    };
    
    const removeAppStorage = function(key) {
        const scopedKey = `app_${actualAppId}_${key}`;
        try {
            localStorage.removeItem(scopedKey);
            return true;
        } catch (error) {
            console.warn('App storage removal failed:', error);
            return false;
        }
    };
    
    const clearAppStorage = function() {
        try {
            const prefix = `app_${actualAppId}_`;
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            return true;
        } catch (error) {
            console.warn('App storage clear failed:', error);
            return false;
        }
    };
    
    const setAppSessionStorage = function(key, value) {
        const scopedKey = `app_${actualAppId}_${key}`;
        try {
            sessionStorage.setItem(scopedKey, value);
            return true;
        } catch (error) {
            console.warn('App session storage failed:', error);
            return false;
        }
    };
    
    const getAppSessionStorage = function(key) {
        const scopedKey = `app_${actualAppId}_${key}`;
        try {
            return sessionStorage.getItem(scopedKey);
        } catch (error) {
            console.warn('App session storage retrieval failed:', error);
            return null;
        }
    };
    
    // Navigation protection functions (prevent apps from hijacking page navigation)
    const setAppLocation = function(url) {
        console.warn(`App "${actualAppId}" attempted to navigate to: ${url} - blocked for security`);
        showNotification(`App "${actualAppId}" tried to navigate away - blocked for security`, 'warning');
        return false;
    };
    
    const reloadApp = function() {
        console.info(`App "${actualAppId}" requested reload - reloading app only`);
        // Trigger app reload through OS instead of page reload
        if (window.sypnexOS && typeof window.sypnexOS.reloadApp === 'function') {
            window.sypnexOS.reloadApp(actualAppId);
        } else {
            showNotification(`App "${actualAppId}" reload requested but OS method not available`, 'warning');
        }
        return false;
    };
    
    const appPushState = function(state, title, url) {
        console.warn(`App "${actualAppId}" attempted to push browser state - blocked for security`);
        showNotification(`App "${actualAppId}" tried to modify browser history - blocked`, 'warning');
        return false;
    };
    
    const appReplaceState = function(state, title, url) {
        console.warn(`App "${actualAppId}" attempted to replace browser state - blocked for security`);
        showNotification(`App "${actualAppId}" tried to modify browser history - blocked`, 'warning');
        return false;
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
    
    
    // Execute the app script with error boundary for containment
    try {
        ${scriptContent}
    } catch (error) {
        console.error(`App ${actualAppId} encountered an error:`, error);
        showNotification(`App "${actualAppId}" encountered an error but was contained`, 'warning');
        
        // Optionally report error to OS for debugging if method exists
        if (typeof window !== 'undefined' && window.sypnexOS && typeof window.sypnexOS.reportAppError === 'function') {
            window.sypnexOS.reportAppError(actualAppId, error);
        }
    }
    
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
                } else if (timer.type === 'timeout') {
                    originalClearTimeout(timer.id);
                    cleanedCount++;
                }
            });
            appTimers.clear();
            if (cleanedCount > 0) {
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
                } catch (error) {
                    console.warn('Error cleaning up event listener:', error);
                }
            });
            appEventListeners.clear();
            if (cleanedCount > 0) {
            }
            return cleanedCount;
        },
        // Combined cleanup function
        cleanup: function() {
            // First, try to cleanup SypnexAPI if it has a cleanup method
            if (sypnexAPI && typeof sypnexAPI.cleanup === 'function') {
                try {
                    sypnexAPI.cleanup();
                } catch (error) {
                    console.warn('App ${appId}: Error during SypnexAPI cleanup:', error);
                }
            }
            
            const timersCleanedUp = this.cleanupTimers();
            const listenersCleanedUp = this.cleanupEventListeners();
            
            // CRITICAL: Restore original global methods to prevent cross-contamination
            document.addEventListener = originalDocumentAddEventListener;
            document.removeEventListener = originalDocumentRemoveEventListener;
            window.addEventListener = originalWindowAddEventListener;
            window.removeEventListener = originalWindowRemoveEventListener;
            
            // Also restore timer functions to prevent lingering tracking
            setInterval = originalSetInterval;
            setTimeout = originalSetTimeout;
            clearInterval = originalClearInterval;
            clearTimeout = originalClearTimeout;
            
            
            // Clean up centralized tracking for this app
            if (window.sypnexTimerTracker) {
                window.sypnexTimerTracker.delete(actualAppId);
            }
            if (window.sypnexEventTracker) {
                window.sypnexEventTracker.delete(actualAppId);
            }
            
            // TEMPORARILY DISABLED: Restore original DOM navigation methods
            // This was causing cross-app contamination - commenting out until proper fix
            /*
            try {
                delete Element.prototype.scopedClosest;
                delete Element.prototype.scopedParentNode;
                delete Element.prototype.scopedParentElement;
            } catch (error) {
                console.warn('Error restoring prototype methods:', error);
            }
            */
            
            
            return { timers: timersCleanedUp, listeners: listenersCleanedUp };
        }
    };
    
})();

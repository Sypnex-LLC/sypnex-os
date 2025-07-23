// Built-in App Resource Tracker
// Lightweight tracking for system apps that aren't sandboxed

Object.assign(SypnexOS.prototype, {
    initBuiltinAppTracking(appId) {
        // Create tracking object for built-in apps
        if (!window.sypnexApps) {
            window.sypnexApps = {};
        }

        const appWindow = document.querySelector(`[data-app-id="${appId}"]`);
        const appContainer = appWindow ? appWindow.querySelector('.app-window-content') : null;

        // Simple tracking for built-in apps
        const builtinTracker = {
            timers: new Set(),
            eventListeners: new Set(),
            isBuiltinApp: true,
            
            // Track timers created by this app
            trackTimer: function(id, type) {
                this.timers.add({id, type});
            },
            
            clearTimer: function(id) {
                this.timers.forEach(timer => {
                    if (timer.id === id) {
                        this.timers.delete(timer);
                    }
                });
            },
            
            // Track global event listeners
            trackEventListener: function(target, type, listener, options) {
                if (target === document || target === window) {
                    this.eventListeners.add({target, type, listener, options});
                }
            },
            
            // Expose same interface as sandboxed apps
            getTimerCount: function() {
                return this.timers.size;
            },
            
            getEventListenerCount: function() {
                return this.eventListeners.size;
            },
            
            getTrackingStats: function() {
                return {
                    timers: this.timers.size,
                    globalEventListeners: this.eventListeners.size,
                    domNodes: appContainer ? appContainer.querySelectorAll('*').length : 0
                };
            },
            
            cleanup: function() {
                // Clean up timers
                this.timers.forEach(timer => {
                    if (timer.type === 'interval') {
                        clearInterval(timer.id);
                    } else if (timer.type === 'timeout') {
                        clearTimeout(timer.id);
                    }
                });
                this.timers.clear();
                
                // Clean up event listeners
                this.eventListeners.forEach(item => {
                    try {
                        item.target.removeEventListener(item.type, item.listener, item.options);
                    } catch (error) {
                        console.warn('Error cleaning up built-in app event listener:', error);
                    }
                });
                this.eventListeners.clear();
                
                return { timers: this.timers.size, listeners: this.eventListeners.size };
            }
        };

        window.sypnexApps[appId] = builtinTracker;
        
        return builtinTracker;
    },

    // Helper function to make built-in apps use tracking
    createTrackedTimer: function(appId, callback, delay, isInterval = false) {
        const tracker = window.sypnexApps[appId];
        if (!tracker || !tracker.isBuiltinApp) return null;
        
        const id = isInterval ? setInterval(callback, delay) : setTimeout(callback, delay);
        tracker.trackTimer(id, isInterval ? 'interval' : 'timeout');
        return id;
    },

    clearTrackedTimer: function(appId, id, isInterval = false) {
        const tracker = window.sypnexApps[appId];
        if (tracker && tracker.isBuiltinApp) {
            tracker.clearTimer(id);
        }
        
        if (isInterval) {
            clearInterval(id);
        } else {
            clearTimeout(id);
        }
    }
});

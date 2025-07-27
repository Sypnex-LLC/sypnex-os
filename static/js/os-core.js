// Sypnex OS - Core Module
// Contains the main SypnexOS class and core initialization

// Global fetch override for automatic token injection - OS Context
// This ensures OS-level fetch calls also include the test token
if (typeof window !== 'undefined' && window.fetch && !window._sypnexFetchOverridden) {
    const originalFetch = window.fetch;
    
    window.fetch = function(url, options = {}) {
        // Initialize headers if not present
        if (!options.headers) {
            options.headers = {};
        }
        
        // Add access token header to all fetch requests
        options.headers['X-Session-Token'] = '{{ACCESS_TOKEN}}';
        
        // Call original fetch with modified options
        return originalFetch(url, options);
    };
    
    // Mark as overridden to prevent double-override
    window._sypnexFetchOverridden = true;
}

class SypnexOS {
    constructor() {
        this.apps = new Map();
        this.activeWindow = null;
        this.windowCounter = 0;
        this.networkLatency = 0;
        this.lastHeartbeat = 0;
        this.useHeartbeat = true; // Use unified heartbeat endpoint
        this.sypnexAPIContent = null; // Cache for SypnexAPI content
        this.websocketStatus = 'unknown'; // WebSocket server status
        this.lastWebSocketCheck = 0; // Last WebSocket status check time
        this.latestVersions = null; // Cached latest app versions
        this.init();
        this.initModalEvents();
    }

    init() {
        this.setupEventListeners();
        
        // Small delay to ensure fetch override is fully applied
        setTimeout(() => {
            this.updateTime();
        }, 100);
        
        this.checkWelcomeScreen(); // Check if welcome screen should be shown
        this.loadWallpaper();
        
        // Setup page unload cleanup
        this.setupPageUnloadCleanup();
        
        // Cache latest app versions on startup
        this.cacheLatestVersions();
        
        // Update time and network status every 5 seconds (with small initial delay)
        setTimeout(() => {
            setInterval(() => {
                this.updateTime();
                this.updateNetworkStatus();
                this.updateWebSocketStatus();
            }, 5000);
        }, 200);
    }

    setupEventListeners() {
        // Spotlight trigger
        const spotlightTrigger = document.getElementById('spotlight-trigger');
        if (spotlightTrigger) {
            spotlightTrigger.addEventListener('click', () => {
                this.showSpotlight();
            });
        } else {
            console.error('Spotlight trigger not found!');
        }

        // Home button - minimize all open apps to go "home"
        const homeButton = document.getElementById('home-button');
        if (homeButton) {
            homeButton.addEventListener('click', () => {
                this.minimizeAllApps();
            });
        } else {
            console.error('Home button not found!');
        }

        // Dashboard button
        const dashboardButton = document.getElementById('dashboard-button');
        if (dashboardButton) {
            dashboardButton.addEventListener('click', () => {
                this.showDashboard();
            });
        } else {
            console.error('Dashboard button not found!');
        }

        // Taskbar Toggle button
        const taskbarToggleButton = document.getElementById('taskbar-toggle-button');
        if (taskbarToggleButton) {
            taskbarToggleButton.addEventListener('click', () => {
                this.toggleTaskbar();
            });
        } else {
            console.error('Taskbar toggle button not found!');
        }

        // System Settings button
        const systemSettingsButton = document.getElementById('system-settings-button');
        if (systemSettingsButton) {
            systemSettingsButton.addEventListener('click', () => {
                this.showSystemSettings();
            });
        } else {
            console.error('System Settings button not found!');
        }
        
        // Developer mode change listener
        window.addEventListener('developerModeChanged', (event) => {
            this.updateDeveloperModeForAllWindows();
        });
        
        // App scale change listener
        window.addEventListener('appScaleChanged', (event) => {
            this.updateAllAppScaling();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.showSpotlight();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'h') {
                e.preventDefault();
                this.minimizeAllApps();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                this.showDashboard();
            } else if (e.key === 'Escape') {
                this.hideSpotlight();
                this.hideDashboard();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
                e.preventDefault();
                this.toggleTaskbar();
            } else if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'r') {
                e.preventDefault();
                this.resetAllWindows();
            }
        });

        // Spotlight input
        const spotlightInput = document.getElementById('spotlight-input');
        if (spotlightInput) {
            spotlightInput.addEventListener('input', (e) => {
                this.searchApps(e.target.value);
            });

            spotlightInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const firstResult = document.querySelector('.spotlight-result');
                    if (firstResult) {
                        firstResult.click();
                    }
                }
                if (e.key === 'Escape') {
                    this.hideSpotlight();
                }
            });
        }

        // Welcome screen app tiles
        document.querySelectorAll('.app-tile').forEach(tile => {
            tile.addEventListener('click', () => {
                const appId = tile.dataset.app;
                this.openApp(appId);
                this.hideWelcomeScreen();
            });
        });

        // Close spotlight when clicking outside
        const spotlightOverlay = document.getElementById('spotlight-overlay');
        if (spotlightOverlay) {
            spotlightOverlay.addEventListener('click', (e) => {
                if (e.target.id === 'spotlight-overlay') {
                    this.hideSpotlight();
                }
            });
        }
    }

    async loadWallpaper() {
        try {
            // Check if system is locked before loading wallpaper to prevent flicker
            const lockResponse = await fetch('/api/system/lock-status');
            if (lockResponse.ok) {
                const lockData = await lockResponse.json();
                if (lockData.locked) {
                    // System is locked, don't load wallpaper
                    return;
                }
            }
            
            const response = await fetch('/api/preferences/ui/wallpaper');
            const data = await response.json();
            
            if (data.value) {
                this.applyWallpaper(data.value);
            }
        } catch (error) {
            console.error('Error loading wallpaper:', error);
            // Silently fail - desktop will show default gradient
        }
    }

    applyWallpaper(wallpaperPath, sizing = null) {
        const desktopBackground = document.getElementById('desktop-background');
        if (desktopBackground) {
            if (wallpaperPath) {
                // Use correct VFS API endpoint for wallpaper URL
                const tempAPI = new window.SypnexAPI();
                const wallpaperUrl = tempAPI.getVirtualFileUrl(wallpaperPath);
                
                // Get sizing preference if not provided
                if (!sizing) {
                    fetch('/api/preferences/ui/wallpaper_sizing')
                        .then(response => response.json())
                        .then(data => {
                            sizing = data.value || 'cover';
                            this.applyWallpaperWithSizing(desktopBackground, wallpaperUrl, sizing);
                        })
                        .catch(() => {
                            this.applyWallpaperWithSizing(desktopBackground, wallpaperUrl, 'cover');
                        });
                } else {
                    this.applyWallpaperWithSizing(desktopBackground, wallpaperUrl, sizing);
                }
            } else {
                // Remove wallpaper, show default OS gradient
                desktopBackground.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)';
                desktopBackground.style.backgroundImage = 'none';
            }
        }
    }

    applyWallpaperWithSizing(desktopBackground, wallpaperUrl, sizing) {
        // Always maintain the default OS gradient as background
        desktopBackground.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)';
        
        // Apply wallpaper based on sizing mode
        switch (sizing) {
            case 'cover':
                desktopBackground.style.backgroundImage = `url("${wallpaperUrl}")`;
                desktopBackground.style.backgroundSize = 'cover';
                desktopBackground.style.backgroundPosition = 'center';
                desktopBackground.style.backgroundRepeat = 'no-repeat';
                break;
                
            case 'contain':
                desktopBackground.style.backgroundImage = `url("${wallpaperUrl}")`;
                desktopBackground.style.backgroundSize = 'contain';
                desktopBackground.style.backgroundPosition = 'center';
                desktopBackground.style.backgroundRepeat = 'no-repeat';
                break;
                
            case 'auto':
                desktopBackground.style.backgroundImage = `url("${wallpaperUrl}")`;
                desktopBackground.style.backgroundSize = 'auto';
                desktopBackground.style.backgroundPosition = 'center';
                desktopBackground.style.backgroundRepeat = 'no-repeat';
                break;
                
            case 'stretch':
                desktopBackground.style.backgroundImage = `url("${wallpaperUrl}")`;
                desktopBackground.style.backgroundSize = '100% 100%';
                desktopBackground.style.backgroundPosition = 'center';
                desktopBackground.style.backgroundRepeat = 'no-repeat';
                break;
                
            default:
                // Default to cover
                desktopBackground.style.backgroundImage = `url("${wallpaperUrl}")`;
                desktopBackground.style.backgroundSize = 'cover';
                desktopBackground.style.backgroundPosition = 'center';
                desktopBackground.style.backgroundRepeat = 'no-repeat';
        }
    }

    async showNotification(message, type = 'info') {
        // Check if notifications are disabled (except for errors, which should always show)
        if (type !== 'error') {
            try {
                const response = await fetch('/api/preferences/ui/show_notifications');
                const data = await response.json();
                
                // If notifications are disabled, don't show anything
                if (data.value === 'false') {
                    return;
                }
            } catch (error) {
                // If we can't check the preference, default to showing notifications
                console.warn('Could not check notification preference, showing notification anyway:', error);
            }
        }

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#00d4ff' : '#ff4757',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    /**
     * Report an app error for debugging purposes
     * Called by the sandbox error boundary when an app encounters an error
     * @param {string} appId - ID of the app that encountered the error
     * @param {Error} error - The error object
     */
    reportAppError(appId, error) {
        console.group(`🐛 App Error Report: ${appId}`);
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
        console.error('App ID:', appId);
        console.error('Timestamp:', new Date().toISOString());
        console.groupEnd();
        
        // You could extend this to:
        // - Send error reports to a logging service
        // - Track error patterns
        // - Show debugging info in developer mode
        // - Store errors for later analysis
    }

    toggleHeartbeatEndpoint() {
        this.useHeartbeat = !this.useHeartbeat;
        
        // Update immediately
        this.updateTime();
    }

    async loadSypnexAPI() {
        if (this.sypnexAPIContent) {
            return this.sypnexAPIContent;
        }
        
        try {
            // Load bundled SypnexAPI from single endpoint
            const response = await fetch('/static/js/sypnex-api.js');
            
            if (response.ok) {
                this.sypnexAPIContent = await response.text();
                return this.sypnexAPIContent;
            } else {
                console.error('Failed to load SypnexAPI bundle');
                return null;
            }
            
        } catch (error) {
            console.error('Error loading SypnexAPI bundle:', error);
            return null;
        }
    }

    showSystemSettings() {
        // Open the system settings app
        this.openApp('system-settings');
    }

    setupPageUnloadCleanup() {
        // Clean up all WebSocket connections when page is unloaded
        window.addEventListener('beforeunload', () => {
            if (window.sypnexApps) {
                Object.keys(window.sypnexApps).forEach(appId => {
                    const sypnexAPI = window.sypnexApps[appId].sypnexAPI;
                    if (sypnexAPI && sypnexAPI.isSocketConnected()) {
                        sypnexAPI.disconnectSocket();
                    }
                });
            }
        });
        
        // Also handle page visibility change (tab switching, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Optional: disconnect when tab becomes hidden
                // Uncomment if you want to disconnect when tab is not visible
                /*
                if (window.sypnexApps) {
                    Object.keys(window.sypnexApps).forEach(appId => {
                        const sypnexAPI = window.sypnexApps[appId].sypnexAPI;
                        if (sypnexAPI && sypnexAPI.isSocketConnected()) {
                            sypnexAPI.disconnectSocket();
                        }
                    });
                }
                */
            }
        });
    }

    async cacheLatestVersions() {
        /**
         * Fetch latest app versions and cache them in VFS with timestamp checking
         * Uses 5-minute cache expiration to avoid excessive API calls
         */
        try {
            const CACHE_FILE_PATH = '/system/cache/latest_versions.json';
            const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
            
            
            // Initialize VFS API access
            const tempAPI = new window.SypnexAPI();
            
            // Try to read cached data
            let useCache = false;
            let cachedData = null;
            
            try {
                const cacheExists = await tempAPI.virtualItemExists(CACHE_FILE_PATH);
                if (cacheExists) {
                    cachedData = await tempAPI.readVirtualFileJSON(CACHE_FILE_PATH);
                    
                    // Check if cache is still valid
                    const cacheAge = Date.now() - cachedData.timestamp;
                    if (cacheAge < CACHE_DURATION_MS) {
                        useCache = true;
                    } else {
                    }
                }
            } catch (cacheError) {
            }
            
            if (useCache && cachedData) {
                // Use cached data
                this.latestVersions = cachedData.apps;
            } else {
                // Fetch fresh data from API
                
                const response = await fetch('/api/updates/latest');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.apps) {
                        // Store comprehensive app data in memory for quick access
                        this.latestVersions = data.apps;
                        
                        // Cache the data in VFS with timestamp
                        try {
                            const cacheData = {
                                timestamp: Date.now(),
                                apps: data.apps,
                                cached_at: new Date().toISOString()
                            };
                            
                            // Ensure system and cache directories exist
                            await tempAPI.createVirtualDirectoryStructure('/system/cache');
                            
                            // Write cache file
                            await tempAPI.writeVirtualFileJSON(CACHE_FILE_PATH, cacheData);
                        } catch (cacheWriteError) {
                            console.warn('⚠️ Failed to cache app versions to VFS:', cacheWriteError);
                            // Continue anyway - caching failure shouldn't break functionality
                        }
                    } else {
                        console.warn('⚠️ Failed to get latest versions:', data.error || 'Unknown error');
                        this.latestVersions = null;
                    }
                } else {
                    console.warn('⚠️ Failed to fetch latest versions: HTTP', response.status);
                    this.latestVersions = null;
                }
            }
            
            // Update any currently open windows
            if (this.updateUpdateButtonsForAllWindows) {
                this.updateUpdateButtonsForAllWindows();
            }
            
        } catch (error) {
            // Network error, offline, or server unreachable - fail silently
            console.warn('⚠️ Unable to check for updates (offline or network error):', error.message);
            this.latestVersions = null;
        }
    }

    async refreshLatestVersionsCache() {
        /**
         * Force refresh the app versions cache (ignores existing cache)
         * Useful after app install/uninstall operations
         */
        try {
            const CACHE_FILE_PATH = '/system/cache/latest_versions.json';
            const tempAPI = new window.SypnexAPI();
            
            
            const response = await fetch('/api/updates/latest');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.apps) {
                    // Store comprehensive app data in memory for quick access
                    this.latestVersions = data.apps;
                    
                    // Update cache in VFS with fresh timestamp
                    try {
                        const cacheData = {
                            timestamp: Date.now(),
                            apps: data.apps,
                            cached_at: new Date().toISOString()
                        };
                        
                        // Ensure system and cache directories exist
                        await tempAPI.createVirtualDirectoryStructure('/system/cache');
                        
                        // Write cache file
                        await tempAPI.writeVirtualFileJSON(CACHE_FILE_PATH, cacheData);
                    } catch (cacheWriteError) {
                        console.warn('⚠️ Failed to cache app versions to VFS:', cacheWriteError);
                    }
                    
                    // Update any currently open windows
                    if (this.updateUpdateButtonsForAllWindows) {
                        this.updateUpdateButtonsForAllWindows();
                    }
                    
                    return true;
                } else {
                    console.warn('⚠️ Failed to refresh versions cache:', data.error || 'Unknown error');
                    return false;
                }
            } else {
                console.warn('⚠️ Failed to fetch latest versions: HTTP', response.status);
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Unable to refresh cache (offline or network error):', error.message);
            return false;
        }
    }

    getLatestVersion(appId) {
        /**
         * Get the latest cached version for an app
         */
        if (this.latestVersions && this.latestVersions[appId]) {
            // Access version from app_info structure to match API format
            return this.latestVersions[appId].app_info?.version || this.latestVersions[appId].version;
        }
        return null;
    }

    getLatestAppData(appId) {
        /**
         * Get the complete cached app data (version, download_url, filename)
         */
        if (this.latestVersions && this.latestVersions[appId]) {
            return this.latestVersions[appId];
        }
        return null;
    }

    async checkWelcomeScreen() {
        /**
         * Check if the welcome screen should be shown for first-time users
         */
        try {
            // Check if welcome screen exists
            if (!window.sypnexWelcomeScreen) {
                return;
            }

            // Check if user has completed welcome
            const shouldShow = await window.sypnexWelcomeScreen.checkShouldShow();
            
            if (shouldShow) {
                // Show welcome screen
                setTimeout(() => {
                    window.sypnexWelcomeScreen.show();
                }, 500); // Small delay to ensure OS is fully loaded
            }
        } catch (error) {
            console.error('Error checking welcome screen:', error);
        }
    }

    resetAllWindows() {
        /**
         * Reset all open windows to default size and position
         * Nuclear option to fix messed up window layouts
         */
        if (this.apps.size === 0) {
            this.showNotification('No windows to reset', 'info');
            return;
        }

        let resetCount = 0;
        
        // Iterate through all open windows
        this.apps.forEach((windowElement, appId) => {
            // Skip minimized windows
            if (windowElement.dataset.minimized === 'true') {
                return;
            }

            // Calculate default position for this window
            const { x, y, width, height } = this.calculateDefaultWindowPosition(resetCount);
            
            // Apply default positioning and sizing
            windowElement.style.left = `${x}px`;
            windowElement.style.top = `${y}px`;
            windowElement.style.width = `${width}px`;
            windowElement.style.height = `${height}px`;
            
            // Ensure window is visible and not maximized
            windowElement.style.display = 'block';
            windowElement.classList.remove('maximized');
            
            resetCount++;
        });

        this.showNotification(`Reset ${resetCount} windows to default positions`, 'success');
    }
}
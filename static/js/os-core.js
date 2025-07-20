// Sypnex OS - Core Module
// Contains the main SypnexOS class and core initialization

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
        this.updateTime();
        this.loadWallpaper();
        
        // Setup page unload cleanup
        this.setupPageUnloadCleanup();
        
        // Cache latest app versions on startup
        this.cacheLatestVersions();
        
        // Update time and network status every second
        setInterval(() => {
            this.updateTime();
            this.updateNetworkStatus();
            this.updateWebSocketStatus();
        }, 5000);
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
            } else if ((e.metaKey || e.ctrlKey) && e.key === 't') {
                e.preventDefault();
                this.toggleHeartbeatEndpoint();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
                e.preventDefault();
                this.toggleTaskbar();
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

    showNotification(message, type = 'info') {
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

    toggleHeartbeatEndpoint() {
        this.useHeartbeat = !this.useHeartbeat;
        console.log(`Switched to ${this.useHeartbeat ? 'heartbeat' : 'time'} endpoint`);
        
        // Update immediately
        this.updateTime();
    }

    async loadSypnexAPI() {
        if (this.sypnexAPIContent) {
            return this.sypnexAPIContent;
        }
        
        try {
            // Load bundled SypnexAPI from single endpoint
            console.log('Loading bundled SypnexAPI...');
            const response = await fetch('/static/js/sypnex-api.js');
            
            if (response.ok) {
                this.sypnexAPIContent = await response.text();
                console.log('SypnexAPI bundle loaded successfully');
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
                        console.log(`Disconnecting WebSocket for app: ${appId} (page unload)`);
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
                            console.log(`Disconnecting WebSocket for app: ${appId} (tab hidden)`);
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
         * Fetch latest app versions and cache them for the session
         * This runs once on OS startup to avoid repeated API calls
         */
        try {
            console.log('Caching latest app versions...');
            
            const response = await fetch('/api/updates/latest');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.apps) {
                    // Store comprehensive app data in memory for quick access
                    this.latestVersions = data.apps;
                    console.log('✅ Latest app versions cached successfully');
                    
                    // Update any currently open windows
                    if (this.updateUpdateButtonsForAllWindows) {
                        this.updateUpdateButtonsForAllWindows();
                    }
                } else {
                    console.warn('⚠️ Failed to get latest versions:', data.error || 'Unknown error');
                    this.latestVersions = null;
                }
            } else {
                console.warn('⚠️ Failed to fetch latest versions: HTTP', response.status);
                this.latestVersions = null;
            }
        } catch (error) {
            // Network error, offline, or server unreachable - fail silently
            console.warn('⚠️ Unable to check for updates (offline or network error):', error.message);
            this.latestVersions = null;
        }
    }

    getLatestVersion(appId) {
        /**
         * Get the latest cached version for an app
         */
        if (this.latestVersions && this.latestVersions[appId]) {
            return this.latestVersions[appId].version;
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
}
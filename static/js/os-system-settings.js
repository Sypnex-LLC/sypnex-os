// Sypnex OS - System Settings Module
// Contains system settings functionality

// Extend SypnexOS class with system settings methods
Object.assign(SypnexOS.prototype, {
    setupSystemSettings(windowElement) {
        console.log('SystemSettings: Setup called');
        
        // Initialize the app
        this.initializeSystemSettingsEventListeners(windowElement);
        this.loadSystemPreferences(windowElement);
    },
    
    initializeSystemSettingsEventListeners(windowElement) {
        // Refresh button
        const refreshBtn = windowElement.querySelector('.refresh-system-settings');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                //REMOVED RENAME BUTTON PROB NOT NEEDED
            });
        }
        
        // Developer mode toggle
        const developerModeToggle = windowElement.querySelector('#developer-mode-toggle');
        if (developerModeToggle) {
            developerModeToggle.addEventListener('change', (e) => {
                this.saveDeveloperMode(e.target.checked);
            });
        }
        
        // App scale select
        const appScaleSelect = windowElement.querySelector('#app-scale-select');
        if (appScaleSelect) {
            appScaleSelect.addEventListener('change', (e) => {
                this.saveAppScale(e.target.value);
            });
        }

        // Wallpaper selection button
        const selectWallpaperBtn = windowElement.querySelector('#select-wallpaper-btn');
        if (selectWallpaperBtn) {
            selectWallpaperBtn.addEventListener('click', () => {
                this.selectWallpaper();
            });
        }

        // Remove wallpaper button
        const removeWallpaperBtn = windowElement.querySelector('#remove-wallpaper-btn');
        if (removeWallpaperBtn) {
            removeWallpaperBtn.addEventListener('click', () => {
                this.removeWallpaper();
            });
        }

        // Wallpaper sizing select
        const wallpaperSizingSelect = windowElement.querySelector('#wallpaper-sizing-select');
        if (wallpaperSizingSelect) {
            wallpaperSizingSelect.addEventListener('change', (e) => {
                this.saveWallpaperSizing(e.target.value);
            });
        }
    },
    
    async loadSystemPreferences(windowElement) {
        try {
            // Load developer mode setting
            const response = await fetch('/api/preferences/system/developer_mode');
            const data = await response.json();
            
            const developerModeToggle = windowElement.querySelector('#developer-mode-toggle');
            if (developerModeToggle) {
                developerModeToggle.checked = data.value === 'true';
            }
            
            // Load app scale setting
            const scaleResponse = await fetch('/api/preferences/ui/app_scale');
            const scaleData = await scaleResponse.json();
            
            const appScaleSelect = windowElement.querySelector('#app-scale-select');
            if (appScaleSelect) {
                appScaleSelect.value = scaleData.value || '100';
            }

            // Load wallpaper setting
            const wallpaperResponse = await fetch('/api/preferences/ui/wallpaper');
            const wallpaperData = await wallpaperResponse.json();
            
            this.updateWallpaperPreview(windowElement, wallpaperData.value);

            // Load wallpaper sizing setting
            const sizingResponse = await fetch('/api/preferences/ui/wallpaper_sizing');
            const sizingData = await sizingResponse.json();
            
            const wallpaperSizingSelect = windowElement.querySelector('#wallpaper-sizing-select');
            if (wallpaperSizingSelect) {
                wallpaperSizingSelect.value = sizingData.value || 'cover';
            }
            
        } catch (error) {
            console.error('Error loading system preferences:', error);
        }
    },
    
    async saveDeveloperMode(enabled) {
        try {
            const response = await fetch('/api/preferences/system/developer_mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: enabled.toString()
                })
            });
            
            if (response.ok) {
                this.showNotification(`Developer mode ${enabled ? 'enabled' : 'disabled'}`, 'success');
                
                // Broadcast the change to other parts of the system
                this.broadcastDeveloperModeChange(enabled);
            } else {
                throw new Error('Failed to save developer mode setting');
            }
            
        } catch (error) {
            console.error('Error saving developer mode:', error);
            this.showNotification('Failed to save developer mode setting', 'error');
            
            // Revert the toggle if save failed
            const developerModeToggle = document.querySelector('#developer-mode-toggle');
            if (developerModeToggle) {
                developerModeToggle.checked = !enabled;
            }
        }
    },
    
    async saveAppScale(scale) {
        try {
            const response = await fetch('/api/preferences/ui/app_scale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: scale
                })
            });
            
            if (response.ok) {
                this.showNotification(`App scale set to ${scale}%`, 'success');
                
                // Broadcast the change to other parts of the system
                this.broadcastAppScaleChange(scale);
            } else {
                throw new Error('Failed to save app scale setting');
            }
            
        } catch (error) {
            console.error('Error saving app scale:', error);
            this.showNotification('Failed to save app scale setting', 'error');
            
            // Revert the select if save failed
            const appScaleSelect = document.querySelector('#app-scale-select');
            if (appScaleSelect) {
                appScaleSelect.value = '100';
            }
        }
    },
    
    broadcastAppScaleChange(scale) {
        // Dispatch a custom event that other parts of the system can listen to
        const event = new CustomEvent('appScaleChanged', {
            detail: { scale: scale }
        });
        window.dispatchEvent(event);
    },
    
    broadcastDeveloperModeChange(enabled) {
        // Dispatch a custom event that other parts of the system can listen to
        const event = new CustomEvent('developerModeChanged', {
            detail: { enabled: enabled }
        });
        window.dispatchEvent(event);
    },

    async saveWallpaperSizing(sizing) {
        try {
            const response = await fetch('/api/preferences/ui/wallpaper_sizing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: sizing
                })
            });

            if (response.ok) {
                this.showNotification(`Wallpaper sizing set to: ${sizing}`, 'success');
                
                // Re-apply current wallpaper with new sizing
                const wallpaperResponse = await fetch('/api/preferences/ui/wallpaper');
                const wallpaperData = await wallpaperResponse.json();
                if (wallpaperData.value) {
                    this.applyWallpaper(wallpaperData.value, sizing);
                }
                
            } else {
                throw new Error('Failed to save wallpaper sizing setting');
            }
            
        } catch (error) {
            console.error('Error saving wallpaper sizing:', error);
            this.showNotification('Failed to save wallpaper sizing setting', 'error');
        }
    },

    async selectWallpaper() {
        try {
            // Create a temporary SypnexAPI instance for system use
            const tempAPI = new window.SypnexAPI();
            tempAPI.appId = 'system-settings'; // Set context for API
            
            // Use the proper SypnexAPI file explorer
            const selectedPath = await tempAPI.showFileExplorer({
                mode: 'open',
                title: 'Select Wallpaper Image',
                initialPath: '/',
                onSelect: null, // We'll use the return value instead
                onCancel: null
            });

            if (selectedPath) {
                // Verify it's an image file
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
                const isImage = imageExtensions.some(ext => 
                    selectedPath.toLowerCase().endsWith(ext)
                );

                if (!isImage) {
                    this.showNotification('Please select an image file (JPG, PNG, GIF, WebP, BMP)', 'error');
                    return;
                }

                await this.saveWallpaper(selectedPath);
            }
        } catch (error) {
            console.error('Error selecting wallpaper:', error);
            this.showNotification('Failed to open file explorer', 'error');
        }
    },

    async saveWallpaper(wallpaperPath) {
        try {
            const response = await fetch('/api/preferences/ui/wallpaper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: wallpaperPath
                })
            });

            if (response.ok) {
                this.showNotification('Wallpaper updated successfully', 'success');
                
                // Update preview in settings
                const systemSettingsWindow = document.querySelector('[data-app-id="system-settings"]');
                if (systemSettingsWindow) {
                    this.updateWallpaperPreview(systemSettingsWindow, wallpaperPath);
                }
                
                // Apply wallpaper to desktop (will automatically use current sizing preference)
                this.applyWallpaper(wallpaperPath);
                
            } else {
                throw new Error('Failed to save wallpaper setting');
            }
            
        } catch (error) {
            console.error('Error saving wallpaper:', error);
            this.showNotification('Failed to save wallpaper setting', 'error');
        }
    },

    async removeWallpaper() {
        try {
            const response = await fetch('/api/preferences/ui/wallpaper', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: ''
                })
            });

            if (response.ok) {
                this.showNotification('Wallpaper removed', 'success');
                
                // Update preview in settings
                const systemSettingsWindow = document.querySelector('[data-app-id="system-settings"]');
                if (systemSettingsWindow) {
                    this.updateWallpaperPreview(systemSettingsWindow, '');
                }
                
                // Remove wallpaper from desktop
                this.applyWallpaper('');
                
            } else {
                throw new Error('Failed to remove wallpaper setting');
            }
            
        } catch (error) {
            console.error('Error removing wallpaper:', error);
            this.showNotification('Failed to remove wallpaper', 'error');
        }
    },

    updateWallpaperPreview(windowElement, wallpaperPath) {
        const preview = windowElement.querySelector('#current-wallpaper-preview');
        const previewImg = windowElement.querySelector('#wallpaper-preview-img');
        const wallpaperName = windowElement.querySelector('#wallpaper-name');

        if (wallpaperPath) {
            // Show preview using correct VFS API endpoint
            preview.style.display = 'flex';
            // Create temporary API instance to get the correct file URL
            const tempAPI = new window.SypnexAPI();
            previewImg.src = tempAPI.getVirtualFileUrl(wallpaperPath);
            wallpaperName.textContent = wallpaperPath.split('/').pop();
        } else {
            // Hide preview
            preview.style.display = 'none';
            wallpaperName.textContent = 'No wallpaper selected';
        }
    },

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
    },

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
});
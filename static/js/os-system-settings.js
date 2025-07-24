// Sypnex OS - System Settings Module
// Contains system settings functionality

// Extend SypnexOS class with system settings methods
Object.assign(SypnexOS.prototype, {
    setupSystemSettings(windowElement) {
        
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
        
        // Reset OS button
        const resetOsBtn = windowElement.querySelector('#reset-os-btn');
        if (resetOsBtn) {
            resetOsBtn.addEventListener('click', () => {
                this.handleResetOS();
            });
        }
        
        // App scale select
        const appScaleSelect = windowElement.querySelector('#app-scale-select');
        if (appScaleSelect) {
            appScaleSelect.addEventListener('change', (e) => {
                this.saveAppScale(e.target.value);
            });
        }

        // Wallpaper preview click (replaces select wallpaper button)
        const wallpaperPreview = windowElement.querySelector('#current-wallpaper-preview');
        if (wallpaperPreview) {
            wallpaperPreview.addEventListener('click', () => {
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

        // PIN code inputs
        const pinInputs = windowElement.querySelectorAll('.pin-input');
        pinInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                this.handlePinInput(e, index, pinInputs);
            });
            input.addEventListener('keydown', (e) => {
                this.handlePinKeydown(e, index, pinInputs);
            });
            input.addEventListener('paste', (e) => {
                this.handlePinPaste(e, pinInputs);
            });
        });

        // Set PIN button
        const setPinBtn = windowElement.querySelector('#set-pin-btn');
        if (setPinBtn) {
            setPinBtn.addEventListener('click', () => {
                this.setSystemPin(windowElement);
            });
        }

        // Remove PIN button
        const removePinBtn = windowElement.querySelector('#remove-pin-btn');
        if (removePinBtn) {
            removePinBtn.addEventListener('click', () => {
                this.removeSystemPin(windowElement);
            });
        }

        // Display name input
        const displayNameInput = windowElement.querySelector('#display-name-input');
        
        if (displayNameInput) {
            displayNameInput.addEventListener('input', (e) => {
                this.handleDisplayNameInput(e);
            });
            displayNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.changeDisplayName(windowElement);
                }
            });
        }

        // Default text editor select
        const defaultTextEditorSelect = windowElement.querySelector('#default-text-editor-select');
        if (defaultTextEditorSelect) {
            defaultTextEditorSelect.addEventListener('change', (e) => {
                this.saveDefaultTextEditor(e.target.value);
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

            // Load PIN code setting
            const pinResponse = await fetch('/api/preferences/security/pin_code');
            const pinData = await pinResponse.json();
            
            this.updatePinStatus(windowElement, pinData.value ? true : false);

            // Load display name setting
            const displayNameResponse = await fetch('/api/preferences/user/display_name');
            const displayNameData = await displayNameResponse.json();
            
            this.loadDisplayName(windowElement, displayNameData.value || 'Not set');

            // Load default text editor setting and available editors
            await this.loadDefaultTextEditorSettings(windowElement);
            
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
        const placeholder = windowElement.querySelector('.wallpaper-placeholder');

        if (wallpaperPath) {
            // Show image, hide placeholder
            previewImg.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
            // Create temporary API instance to get the correct file URL
            const tempAPI = new window.SypnexAPI();
            previewImg.src = tempAPI.getVirtualFileUrl(wallpaperPath);
        } else {
            // Show placeholder, hide image
            previewImg.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
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
    },

    // PIN Code Management Methods
    handlePinInput(event, index, pinInputs) {
        const input = event.target;
        const value = input.value;

        // Only allow numeric input
        if (!/^\d$/.test(value) && value !== '') {
            input.value = '';
            return;
        }

        // Update visual state
        if (value) {
            input.classList.add('filled');
            // Move to next input if current is filled
            if (index < pinInputs.length - 1) {
                pinInputs[index + 1].focus();
            }
        } else {
            input.classList.remove('filled');
        }

        // Check if all inputs are filled
        this.checkPinComplete(pinInputs);
    },

    handlePinKeydown(event, index, pinInputs) {
        const input = event.target;

        // Handle backspace
        if (event.key === 'Backspace') {
            if (!input.value && index > 0) {
                // Move to previous input if current is empty
                pinInputs[index - 1].focus();
                pinInputs[index - 1].value = '';
                pinInputs[index - 1].classList.remove('filled');
            } else if (input.value) {
                // Clear current input
                input.value = '';
                input.classList.remove('filled');
            }
            this.checkPinComplete(pinInputs);
            event.preventDefault();
        }
        
        // Handle arrow keys
        if (event.key === 'ArrowLeft' && index > 0) {
            pinInputs[index - 1].focus();
            event.preventDefault();
        }
        
        if (event.key === 'ArrowRight' && index < pinInputs.length - 1) {
            pinInputs[index + 1].focus();
            event.preventDefault();
        }

        // Prevent non-numeric input
        if (!/[\d]/.test(event.key) && !['Backspace', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.key)) {
            event.preventDefault();
        }
    },

    handlePinPaste(event, pinInputs) {
        event.preventDefault();
        const paste = (event.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/\D/g, '').slice(0, 4);

        digits.split('').forEach((digit, index) => {
            if (index < pinInputs.length) {
                pinInputs[index].value = digit;
                pinInputs[index].classList.add('filled');
            }
        });

        // Focus the next empty input or the last one
        const nextEmpty = digits.length < 4 ? digits.length : 3;
        pinInputs[nextEmpty].focus();

        this.checkPinComplete(pinInputs);
    },

    checkPinComplete(pinInputs) {
        const pin = Array.from(pinInputs).map(input => input.value).join('');
        const setPinBtn = document.querySelector('#set-pin-btn');
        const removePinBtn = document.querySelector('#remove-pin-btn');
        
        // Handle Set PIN button (when no PIN is set)
        if (setPinBtn && setPinBtn.style.display !== 'none') {
            setPinBtn.disabled = pin.length !== 4;
            if (pin.length === 4) {
                setPinBtn.classList.add('primary');
                setPinBtn.classList.remove('secondary');
            } else {
                setPinBtn.classList.add('secondary');
                setPinBtn.classList.remove('primary');
            }
        }
        
        // Handle Remove PIN button (when PIN is set)
        if (removePinBtn && removePinBtn.style.display !== 'none') {
            this.checkPinCompleteForRemoval(pinInputs, removePinBtn);
        }
    },

    checkPinCompleteForRemoval(pinInputs, removePinBtn) {
        const pin = Array.from(pinInputs).map(input => input.value).join('');
        
        if (removePinBtn) {
            removePinBtn.disabled = pin.length !== 4;
            if (pin.length === 4) {
                removePinBtn.classList.add('primary');
                removePinBtn.classList.remove('outline');
                removePinBtn.innerHTML = '<i class="fas fa-unlock"></i> Verify & Remove';
            } else {
                removePinBtn.classList.add('outline');
                removePinBtn.classList.remove('primary');
                removePinBtn.innerHTML = '<i class="fas fa-unlock"></i> Enter PIN to Remove';
            }
        }
    },

    async setSystemPin(windowElement) {
        const pinInputs = windowElement.querySelectorAll('.pin-input');
        const pin = Array.from(pinInputs).map(input => input.value).join('');

        if (pin.length !== 4) {
            this.showNotification('Please enter a 4-digit PIN code', 'error');
            return;
        }

        try {
            const response = await fetch('/api/preferences/security/pin_code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: pin
                })
            });

            if (response.ok) {
                this.showNotification('PIN code set successfully', 'success');
                this.updatePinStatus(windowElement, true);
                this.clearPinInputs(pinInputs);
                // Refresh lock button visibility
                this.refreshLockButtonVisibility();
            } else {
                throw new Error('Failed to set PIN code');
            }

        } catch (error) {
            console.error('Error setting PIN code:', error);
            this.showNotification('Failed to set PIN code', 'error');
        }
    },

    async removeSystemPin(windowElement) {
        const pinInputs = windowElement.querySelectorAll('.pin-input');
        const enteredPin = Array.from(pinInputs).map(input => input.value).join('');

        if (enteredPin.length !== 4) {
            this.showNotification('Please enter your current PIN code to remove it', 'error');
            return;
        }

        try {
            // Verify the PIN using the new verification endpoint
            const verifyResponse = await fetch('/api/preferences/security/pin_code/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: enteredPin
                })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.success) {
                this.showNotification('Failed to verify PIN code', 'error');
                this.clearPinInputs(pinInputs);
                return;
            }

            if (!verifyData.valid) {
                this.showNotification('Incorrect PIN code. Please try again.', 'error');
                this.clearPinInputs(pinInputs);
                return;
            }

            // PIN is valid, proceed with removal
            const response = await fetch('/api/preferences/security/pin_code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: ''
                })
            });

            if (response.ok) {
                this.showNotification('PIN code removed successfully', 'success');
                this.updatePinStatus(windowElement, false);
                this.clearPinInputs(pinInputs);
                // Refresh lock button visibility
                this.refreshLockButtonVisibility();
            } else {
                throw new Error('Failed to remove PIN code');
            }

        } catch (error) {
            console.error('Error removing PIN code:', error);
            this.showNotification('Failed to remove PIN code', 'error');
        }
    },

    updatePinStatus(windowElement, hasPinSet) {
        const setPinBtn = windowElement.querySelector('#set-pin-btn');
        const removePinBtn = windowElement.querySelector('#remove-pin-btn');
        const pinInputs = windowElement.querySelectorAll('.pin-input');

        if (hasPinSet) {
            setPinBtn.style.display = 'none';
            removePinBtn.style.display = 'inline-flex';
            
            // Update button text and functionality for removal
            removePinBtn.innerHTML = '<i class="fas fa-unlock"></i> Remove PIN';
            
            // Enable remove button when PIN is complete
            this.checkPinCompleteForRemoval(pinInputs, removePinBtn);
        } else {
            setPinBtn.style.display = 'inline-flex';
            removePinBtn.style.display = 'none';
            
            // Reset button functionality for setting
            this.checkPinComplete(pinInputs);
        }
    },

    clearPinInputs(pinInputs) {
        pinInputs.forEach(input => {
            input.value = '';
            input.classList.remove('filled');
        });
        
        const setPinBtn = document.querySelector('#set-pin-btn');
        const removePinBtn = document.querySelector('#remove-pin-btn');
        
        // Reset Set PIN button
        if (setPinBtn && setPinBtn.style.display !== 'none') {
            setPinBtn.disabled = true;
            setPinBtn.classList.add('secondary');
            setPinBtn.classList.remove('primary');
        }
        
        // Reset Remove PIN button
        if (removePinBtn && removePinBtn.style.display !== 'none') {
            removePinBtn.disabled = true;
            removePinBtn.classList.add('outline');
            removePinBtn.classList.remove('primary');
            removePinBtn.innerHTML = '<i class="fas fa-unlock"></i> Enter PIN to Remove';
        }
    },

    // Method to refresh lock button visibility with fallback
    async refreshLockButtonVisibility() {
        // Try to use systemLock if available
        if (window.systemLock) {
            window.systemLock.refreshPinStatus();
            return;
        }

        // Fallback: directly update lock button visibility
        try {
            const response = await fetch('/api/preferences/security/pin_code');
            if (response.ok) {
                const data = await response.json();
                const hasPin = data.value ? true : false;
                
                const lockButton = document.getElementById('lock-button');
                if (lockButton) {
                    lockButton.style.display = hasPin ? 'block' : 'none';
                } else {
                    console.warn('System Settings: Lock button element not found');
                }
            }
        } catch (error) {
            console.error('System Settings: Error refreshing lock button visibility:', error);
        }
    },

    // Display Name Management Functions
    loadDisplayName(windowElement, displayName) {
        const displayNameInput = windowElement.querySelector('#display-name-input');
        
        if (displayNameInput) {
            displayNameInput.value = displayName === 'Not set' ? '' : displayName;
            displayNameInput.setAttribute('data-original', displayName);
        }
    },

    handleDisplayNameInput(event) {
        const input = event.target;
        const originalValue = input.getAttribute('data-original') || '';
        const currentValue = input.value.trim();
        const isValid = currentValue.length >= 1 && currentValue.length <= 50;
        const hasChanged = currentValue !== originalValue && currentValue !== '';
        
        // Visual feedback
        if (currentValue.length > 0) {
            if (hasChanged && isValid) {
                input.classList.add('changed');
                input.style.borderColor = 'var(--accent-color)';
            } else if (!isValid) {
                input.classList.remove('changed');
                input.style.borderColor = '#ff4757';
            } else {
                input.classList.remove('changed');
                input.style.borderColor = 'var(--glass-border)';
            }
        } else {
            input.classList.remove('changed');
            input.style.borderColor = 'var(--glass-border)';
        }
    },

    async changeDisplayName(windowElement) {
        const displayNameInput = windowElement.querySelector('#display-name-input');
        
        if (!displayNameInput) return;
        
        const newDisplayName = displayNameInput.value.trim();
        
        if (!newDisplayName || newDisplayName.length > 50) {
            this.showNotification('Please enter a valid display name (1-50 characters)', 'error');
            return;
        }
        
        // Check if actually changed
        const originalValue = displayNameInput.getAttribute('data-original') || '';
        if (newDisplayName === originalValue) {
            this.showNotification('Display name is already set to that value', 'info');
            return;
        }
        
        try {
            const response = await fetch('/api/preferences/user/display_name', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: newDisplayName
                })
            });
            
            if (response.ok) {
                // Update the original value
                displayNameInput.setAttribute('data-original', newDisplayName);
                displayNameInput.classList.remove('changed');
                displayNameInput.style.borderColor = 'var(--glass-border)';
                
                this.showNotification(`Display name changed to "${newDisplayName}"`, 'success');
            } else {
                throw new Error('Failed to save display name');
            }
            
        } catch (error) {
            console.error('Error changing display name:', error);
            this.showNotification('Failed to change display name. Please try again.', 'error');
        }
    },

    async handleResetOS() {
        try {
            // Create a temporary SypnexAPI instance to use the confirmation dialog
            const tempAPI = new window.SypnexAPI('system-settings');
            
            const confirmed = await tempAPI.showConfirmation(
                'Reset Operating System',
                'This will reset the entire operating system to its default state. All user data, settings, and installed apps will be lost.',
                {
                    type: 'danger',
                    confirmText: 'Reset OS',
                    cancelText: 'Cancel',
                    icon: 'fas fa-exclamation-triangle'
                }
            );

            if (confirmed) {
                this.showNotification('Resetting system...', 'info');
                
                try {
                    // Call the reset endpoint
                    const response = await fetch('/api/system/reset', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showNotification('System reset complete - reloading...', 'success');
                        
                        // Wait a moment for the user to see the success message
                        setTimeout(async () => {
                            // Refresh apps and cache before reloading
                            try {
                                // Refresh backend registry
                                await fetch('/api/user-apps/refresh', { method: 'POST' });
                                
                                // Also refresh the latest versions cache
                                if (this.refreshLatestVersionsCache) {
                                    await this.refreshLatestVersionsCache();
                                }
                            } catch (error) {
                                console.error('Error refreshing apps before reload:', error);
                            }
                            
                            window.location.reload();
                        }, 1500);
                    } else {
                        this.showNotification(`Reset failed: ${result.error}`, 'error');
                        console.error('Reset failed:', result.error);
                    }
                } catch (error) {
                    this.showNotification('Network error during reset', 'error');
                    console.error('Reset network error:', error);
                }
            } else {
            }
        } catch (error) {
            console.error('Error showing reset confirmation:', error);
            this.showNotification('Error showing confirmation dialog', 'error');
        }
    },

    async loadDefaultTextEditorSettings(windowElement) {
        try {
            // Load available text editors (apps with 'editor' keyword)
            const editorsResponse = await fetch('/api/apps/by-keyword/text_editor');
            const editorsData = await editorsResponse.json();
            
            const defaultTextEditorSelect = windowElement.querySelector('#default-text-editor-select');
            if (!defaultTextEditorSelect) return;
            
            // Clear existing options
            defaultTextEditorSelect.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'No default editor (system choice)';
            defaultTextEditorSelect.appendChild(defaultOption);
            
            // Add available text editors
            if (editorsData.success && editorsData.apps.length > 0) {
                editorsData.apps.forEach(app => {
                    const option = document.createElement('option');
                    option.value = app.id;
                    option.textContent = `${app.name} (${app.type === 'builtin' ? 'Built-in' : 'User App'})`;
                    defaultTextEditorSelect.appendChild(option);
                });
            } else {
                // No text editors found
                const noEditorsOption = document.createElement('option');
                noEditorsOption.value = '';
                noEditorsOption.textContent = 'No text editors available';
                noEditorsOption.disabled = true;
                defaultTextEditorSelect.appendChild(noEditorsOption);
            }
            
            // Load current default text editor setting
            const defaultEditorResponse = await fetch('/api/preferences/system/default_text_editor');
            const defaultEditorData = await defaultEditorResponse.json();
            
            if (defaultEditorData.success && defaultEditorData.value) {
                defaultTextEditorSelect.value = defaultEditorData.value;
            }
            
        } catch (error) {
            console.error('Error loading default text editor settings:', error);
            
            // Show error in select
            const defaultTextEditorSelect = windowElement.querySelector('#default-text-editor-select');
            if (defaultTextEditorSelect) {
                defaultTextEditorSelect.innerHTML = '<option value="">Error loading editors</option>';
            }
        }
    },

    async saveDefaultTextEditor(editorId) {
        try {
            const response = await fetch('/api/preferences/system/default_text_editor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: editorId
                })
            });
            
            if (response.ok) {
                if (editorId) {
                    // Get the editor name for the notification
                    const select = document.querySelector('#default-text-editor-select');
                    const selectedOption = select.querySelector(`option[value="${editorId}"]`);
                    const editorName = selectedOption ? selectedOption.textContent : editorId;
                    this.showNotification(`Default text editor set to: ${editorName}`, 'success');
                } else {
                    this.showNotification('Default text editor preference cleared', 'success');
                }
            } else {
                throw new Error('Failed to save default text editor setting');
            }
            
        } catch (error) {
            console.error('Error saving default text editor:', error);
            this.showNotification('Failed to save default text editor setting', 'error');
            
            // Revert the selection if save failed
            const defaultTextEditorSelect = document.querySelector('#default-text-editor-select');
            if (defaultTextEditorSelect) {
                // Try to reload the current setting
                try {
                    const currentResponse = await fetch('/api/preferences/system/default_text_editor');
                    const currentData = await currentResponse.json();
                    defaultTextEditorSelect.value = currentData.value || '';
                } catch (revertError) {
                    console.error('Error reverting default text editor selection:', revertError);
                }
            }
        }
    }
});
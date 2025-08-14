// Sypnex OS - Welcome Screen Module
// Handles the first-time user welcome experience

class SypnexWelcomeScreen {
    constructor() {
        this.overlay = document.getElementById('welcome-screen-overlay');
        this.displayNameInput = document.getElementById('display-name-input');
        this.startButton = document.getElementById('start-button');
        this.phase1 = document.getElementById('welcome-phase-1');
        this.phase2 = document.getElementById('welcome-phase-2');
        this.skipAppsBtn = document.getElementById('skip-apps-btn');
        this.installSelectedBtn = document.getElementById('install-selected-btn');
        this.optionalAppsContainer = document.getElementById('optional-apps-container');
        this.isShown = false;
        this.currentPhase = 1;
        this.selectedApps = new Set();
        
        this.init();
    }

    init() {
        if (!this.overlay || !this.displayNameInput || !this.startButton) {
            console.error('Welcome screen elements not found');
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Display name input validation
        this.displayNameInput.addEventListener('input', () => {
            this.validateInput();
        });

        // Enter key to start
        this.displayNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.startButton.disabled) {
                this.handleStart();
            }
        });

        // Start button click
        this.startButton.addEventListener('click', () => {
            this.handleStart();
        });

        // Phase 2 button listeners
        if (this.skipAppsBtn) {
            this.skipAppsBtn.addEventListener('click', () => {
                this.completeWelcome();
            });
        }

        if (this.installSelectedBtn) {
            this.installSelectedBtn.addEventListener('click', () => {
                this.handleInstallSelected();
            });
        }

        // Focus on input when welcome screen is shown
        this.displayNameInput.addEventListener('focus', () => {
            this.displayNameInput.select();
        });
    }

    validateInput() {
        const displayName = this.displayNameInput.value.trim();
        const isValid = displayName.length >= 1 && displayName.length <= 50;
        
        this.startButton.disabled = !isValid;
        
        // Visual feedback
        if (displayName.length > 0) {
            this.displayNameInput.style.borderColor = isValid ? 'var(--accent-color)' : '#ff4757';
        } else {
            this.displayNameInput.style.borderColor = 'var(--glass-border)';
        }
    }

    async handleStart() {
        const displayName = this.displayNameInput.value.trim();
        
        if (!displayName) {
            this.showError('Please enter a display name');
            return;
        }

        // Show loading state
        this.setLoadingState(true);

        try {
            // Save display name first
            await this.saveDisplayName(displayName);
            
            // Check if optional apps are available (SaaS instance)
            const hasOptionalApps = await this.checkForOptionalApps();
            
            if (hasOptionalApps) {
                // Transition to phase 2 (optional apps)
                this.setLoadingState(false);
                this.transitionToPhase2();
            } else {
                // Complete welcome flow (open source instance)
                this.completeWelcome();
            }
            
        } catch (error) {
            console.error('Error during welcome start:', error);
            this.showError('Failed to initialize. Please try again.');
            this.setLoadingState(false);
        }
    }

    async checkForOptionalApps() {
        try {
            const response = await fetch('/api/app-store/onboarding');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.onboarding_apps && data.onboarding_apps.length > 0) {
                    this.loadOptionalApps(data.onboarding_apps);
                    return true;
                }
            }
        } catch (error) {
            console.log('No optional apps available (likely open source instance)');
        }
        return false;
    }

    transitionToPhase2() {
        this.currentPhase = 2;
        
        // Fade out phase 1
        this.phase1.classList.add('fade-out');
        
        setTimeout(() => {
            this.phase1.style.display = 'none';
            this.phase2.style.display = 'block';
            
            // Fade in phase 2
            setTimeout(() => {
                this.phase2.classList.add('fade-in');
            }, 50);
        }, 400);
    }

    loadOptionalApps(apps) {
        this.optionalAppsContainer.innerHTML = '';
        
        apps.forEach(app => {
            const appElement = this.createOptionalAppElement(app);
            this.optionalAppsContainer.appendChild(appElement);
            
            // Auto-select all apps in SaaS mode (user can uncheck what they don't want)
            this.selectedApps.add(app.id);
            appElement.classList.add('selected');
        });
        
        // Update install button state since we pre-selected all apps
        this.installSelectedBtn.disabled = false;
    }

    createOptionalAppElement(app) {
        const appDiv = document.createElement('div');
        appDiv.className = 'optional-app-item';
        appDiv.dataset.appId = app.id;
        
        // Check if this is the store app (required)
        const isStoreApp = app.id === 'sypnex_os_store';
        if (isStoreApp) {
            appDiv.classList.add('required-app');
        }
        
        appDiv.innerHTML = `
            <div class="optional-app-checkbox ${isStoreApp ? 'required' : ''}"></div>
            <div class="optional-app-info">
                <h3>${app.name} ${isStoreApp ? '<span class="required-badge">Required</span>' : ''}</h3>
                <p>${app.description || 'Enhance your Sypnex OS experience'}</p>
            </div>
        `;
        
        appDiv.addEventListener('click', () => {
            this.toggleAppSelection(app.id, appDiv);
        });
        
        return appDiv;
    }

    toggleAppSelection(appId, element) {
        // Prevent unchecking the store app (it's required)
        if (appId === 'sypnex_os_store' && this.selectedApps.has(appId)) {
            // Store app is required, show a brief message
            if (window.sypnexOS && window.sypnexOS.showNotification) {
                window.sypnexOS.showNotification('The App Store is required and cannot be deselected', 'info');
            }
            return;
        }
        
        if (this.selectedApps.has(appId)) {
            this.selectedApps.delete(appId);
            element.classList.remove('selected');
        } else {
            this.selectedApps.add(appId);
            element.classList.add('selected');
        }
        
        // Update install button state
        this.installSelectedBtn.disabled = this.selectedApps.size === 0;
    }

    async handleInstallSelected() {
        if (this.selectedApps.size === 0) return;
        
        // Show loading state
        this.setInstallLoadingState(true);
        
        try {
            const tempAPI = new SypnexAPI();
            const apiBaseUrl = '/api/app-store';
            const selectedAppIds = Array.from(this.selectedApps);
            
            let successCount = 0;
            let failCount = 0;
            
            // Install each selected app one by one
            for (const appId of selectedAppIds) {
                try {
                    const downloadUrl = `${apiBaseUrl}/download/${appId}`;
                    
                    // Use the SypnexAPI to install/update the app
                    const result = await tempAPI.updateApp(appId, downloadUrl);
                    
                    // If we get here without error, it was successful
                    successCount++;
                    console.log(`Successfully installed app ${appId}`);
                    
                } catch (error) {
                    failCount++;
                    console.error(`Error installing app ${appId}:`, error);
                }
            }
            
            // Refresh the app registry after all installations
            if (successCount > 0) {
                try {
                    await tempAPI.refreshAppRegistry();
                } catch (error) {
                    console.error('Error refreshing app registry:', error);
                }
            }
            
            // Show completion notification
            if (successCount > 0 && failCount === 0) {
                if (window.sypnexOS && window.sypnexOS.showNotification) {
                    window.sypnexOS.showNotification(`Successfully installed ${successCount} app${successCount > 1 ? 's' : ''}!`, 'success');
                }
            } else if (successCount > 0 && failCount > 0) {
                if (window.sypnexOS && window.sypnexOS.showNotification) {
                    window.sypnexOS.showNotification(`Installed ${successCount} app${successCount > 1 ? 's' : ''}, ${failCount} failed`, 'warning');
                }
            } else if (failCount > 0) {
                if (window.sypnexOS && window.sypnexOS.showNotification) {
                    window.sypnexOS.showNotification(`Failed to install ${failCount} app${failCount > 1 ? 's' : ''}`, 'error');
                }
            }
            
        } catch (error) {
            console.error('Error during app installation:', error);
            if (window.sypnexOS && window.sypnexOS.showNotification) {
                window.sypnexOS.showNotification('Failed to install selected apps', 'error');
            }
        } finally {
            this.setInstallLoadingState(false);
            this.completeWelcome();
        }
    }

    async saveDisplayName(displayName) {
        const response = await fetch('/api/preferences/user/display_name', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: displayName })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save display name');
        }
    }

    async completeWelcome() {
        try {
            // Mark welcome as completed
            await this.markWelcomeCompleted();
            
            // Hide welcome screen
            this.hide();
            
            // Show success notification
            if (window.sypnexOS && window.sypnexOS.showNotification) {
                const displayName = this.displayNameInput.value.trim();
                window.sypnexOS.showNotification(`Welcome to Sypnex OS, ${displayName}!`, 'success');
            }
            
        } catch (error) {
            console.error('Error completing welcome:', error);
            this.showError('Failed to complete setup. Please try again.');
        }
    }

    async markWelcomeCompleted() {
        const response = await fetch('/api/preferences/system/welcome_completed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: 'true' })
        });
        
        if (!response.ok) {
            throw new Error('Failed to mark welcome as completed');
        }
    }

    setInstallLoadingState(loading) {
        if (loading) {
            this.installSelectedBtn.classList.add('loading');
            this.installSelectedBtn.disabled = true;
            this.installSelectedBtn.innerHTML = '<i class="fas fa-spinner"></i> Installing...';
            
            // Disable skip button during installation - no backing out once committed
            this.skipAppsBtn.disabled = true;
        } else {
            this.installSelectedBtn.classList.remove('loading');
            this.installSelectedBtn.disabled = this.selectedApps.size === 0;
            this.installSelectedBtn.innerHTML = '<i class="fas fa-download"></i> Install Selected';
            
            // Re-enable skip button after installation completes
            this.skipAppsBtn.disabled = false;
        }
    }

    async launchTourVideo() {
        try {
            // Set intent for video player to open the tour video
            const intentData = {
                action: 'open_file',
                data: {
                    filePath: '/tutorials/tour.mp4'
                }
            };

            // Store intent in video player preferences
            const intentResponse = await fetch('/api/preferences/media_player/_pending_intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value: intentData })
            });

            if (!intentResponse.ok) {
                throw new Error('Failed to set video player intent');
            }

            // Launch video player app - it will automatically check for and process the intent
            if (window.sypnexOS && window.sypnexOS.openApp) {
                await window.sypnexOS.openApp('media_player');
            }

        } catch (error) {
            console.error('Error launching tour video:', error);
            // Don't throw error - tour failure shouldn't break welcome flow
            if (window.sypnexOS && window.sypnexOS.showNotification) {
                window.sypnexOS.showNotification('Tour video could not be loaded', 'warning');
            }
        }
    }

    setLoadingState(loading) {
        if (loading) {
            this.startButton.classList.add('loading');
            this.startButton.innerHTML = '<i class="fas fa-spinner"></i> Setting up...';
            this.startButton.disabled = true;
            this.displayNameInput.disabled = true;
        } else {
            this.startButton.classList.remove('loading');
            this.startButton.innerHTML = '<i class="fas fa-arrow-right"></i> Let\'s Start';
            this.displayNameInput.disabled = false;
            this.validateInput(); // Re-validate to set button state
        }
    }

    showError(message) {
        // Create or update error message
        let errorElement = document.querySelector('.welcome-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'welcome-error';
            errorElement.style.cssText = `
                color: #ff4757;
                font-size: 0.9rem;
                margin-top: 10px;
                text-align: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            this.startButton.parentNode.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.opacity = '1';
        
        // Hide error after 5 seconds
        setTimeout(() => {
            if (errorElement) {
                errorElement.style.opacity = '0';
            }
        }, 5000);
    }

    async show() {
        if (this.isShown) return;
        
        this.isShown = true;
        this.overlay.classList.remove('welcome-screen-hidden');
        
        // Focus on input after animation
        setTimeout(() => {
            this.displayNameInput.focus();
        }, 300);
    }

    hide() {
        if (!this.isShown) return;
        
        this.isShown = false;
        this.overlay.classList.add('welcome-screen-hidden');
        
        // Clear form
        this.displayNameInput.value = '';
        this.startButton.disabled = true;
        this.setLoadingState(false);
    }

    async checkShouldShow() {
        try {
            // First check if system is locked - don't show welcome over lock screen
            const lockResponse = await fetch('/api/system/lock-status');
            if (lockResponse.ok) {
                const lockData = await lockResponse.json();
                if (lockData.locked) {
                    return false; // Don't show welcome if system is locked
                }
            }

            // Check welcome status
            const response = await fetch('/api/preferences/system/welcome_completed');
            const data = await response.json();
            
            // Show welcome if preference doesn't exist or is not 'true'
            const welcomeCompleted = data.value === 'true';
            return !welcomeCompleted;
        } catch (error) {
            console.error('Error checking welcome status:', error);
            // Default to showing welcome on error (but not if system is locked)
            return true;
        }
    }

    // Generate some suggested display names
    generateSuggestions() {
        const suggestions = [
            'Explorer', 'Creator', 'Developer', 'Designer', 'Innovator',
            'Builder', 'Maker', 'Dreamer', 'Visionary', 'Pioneer'
        ];
        return suggestions[Math.floor(Math.random() * suggestions.length)];
    }
}

// Initialize welcome screen when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sypnexWelcomeScreen = new SypnexWelcomeScreen();
});

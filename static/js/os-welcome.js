// Sypnex OS - Welcome Screen Module
// Handles the first-time user welcome experience

class SypnexWelcomeScreen {
    constructor() {
        this.overlay = document.getElementById('welcome-screen-overlay');
        this.displayNameInput = document.getElementById('display-name-input');
        this.startButton = document.getElementById('start-button');
        this.isShown = false;
        
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
            // Save display name and welcome completion to preferences
            await this.saveWelcomeData(displayName);
            
            // Hide welcome screen
            this.hide();
            
            // Show success notification
            if (window.sypnexOS && window.sypnexOS.showNotification) {
                window.sypnexOS.showNotification(`Welcome to Sypnex OS, ${displayName}!`, 'success');
            }
            
            // Set intent for video player to open tour video
            await this.launchTourVideo();
            
        } catch (error) {
            console.error('Error saving welcome data:', error);
            this.showError('Failed to save welcome data. Please try again.');
            this.setLoadingState(false);
        }
    }

    async saveWelcomeData(displayName) {
        // Save display name
        const displayNameResponse = await fetch('/api/preferences/user/display_name', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: displayName })
        });

        if (!displayNameResponse.ok) {
            throw new Error('Failed to save display name');
        }

        // Mark welcome as completed
        const welcomeResponse = await fetch('/api/preferences/system/welcome_completed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: 'true' })
        });

        if (!welcomeResponse.ok) {
            throw new Error('Failed to save welcome completion');
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

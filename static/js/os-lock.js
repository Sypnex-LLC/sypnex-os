/**
 * Sypnex OS - System Lock Module
 * Handles system locking/unlocking with PIN authentication
 */

class SystemLock {
    constructor() {
        this.lockOverlay = null;
        this.lockButton = null;
        this.pinInputs = [];
        this.unlockButton = null;
        this.errorMessage = null;
        this.isLocked = false;
        this.hasPin = false;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
    }

    setupElements() {
        // Get DOM elements
        this.lockOverlay = document.getElementById('system-lock-overlay');
        this.lockButton = document.getElementById('lock-button');
        this.pinInputs = Array.from(document.querySelectorAll('.lock-pin-input'));
        this.unlockButton = document.getElementById('unlock-button');
        this.errorMessage = document.getElementById('lock-error-message');

        if (!this.lockOverlay) {
            console.error('SystemLock: Lock overlay not found');
            return;
        }

        this.setupEventListeners();
        this.checkPinStatus();
        this.checkLockStatus(); // Check if system is already locked
    }

    setupEventListeners() {
        // Lock button click
        if (this.lockButton) {
            this.lockButton.addEventListener('click', () => this.lockSystem());
        }

        // PIN input handling
        this.pinInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => this.handlePinInput(e, index));
            input.addEventListener('keydown', (e) => this.handlePinKeydown(e, index));
            input.addEventListener('paste', (e) => this.handlePinPaste(e));
        });

        // Unlock button click
        if (this.unlockButton) {
            this.unlockButton.addEventListener('click', () => this.unlockSystem());
        }

        // Prevent context menu on lock overlay
        if (this.lockOverlay) {
            this.lockOverlay.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        // Handle escape key to prevent bypass
        document.addEventListener('keydown', (e) => {
            if (this.isLocked && e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    handlePinInput(event, index) {
        const input = event.target;
        const value = input.value;

        // Only allow digits
        if (!/^\d*$/.test(value)) {
            input.value = '';
            return;
        }

        // Move to next input if digit entered
        if (value && index < this.pinInputs.length - 1) {
            this.pinInputs[index + 1].focus();
        }

        this.updateUnlockButton();
        this.clearError();
    }

    handlePinKeydown(event, index) {
        const input = event.target;

        if (event.key === 'Backspace' && !input.value && index > 0) {
            // Move to previous input on backspace if current is empty
            this.pinInputs[index - 1].focus();
        } else if (event.key === 'Enter') {
            // Try to unlock on Enter
            event.preventDefault();
            if (this.isPinComplete()) {
                this.unlockSystem();
            }
        }
    }

    handlePinPaste(event) {
        event.preventDefault();
        const paste = (event.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/\D/g, '').slice(0, 4);

        // Fill inputs with pasted digits
        this.pinInputs.forEach((input, index) => {
            input.value = digits[index] || '';
        });

        // Focus appropriate input
        const nextEmpty = this.pinInputs.findIndex(input => !input.value);
        if (nextEmpty !== -1) {
            this.pinInputs[nextEmpty].focus();
        } else {
            this.pinInputs[3].focus();
        }

        this.updateUnlockButton();
        this.clearError();
    }

    isPinComplete() {
        return this.pinInputs.every(input => input.value.length === 1);
    }

    updateUnlockButton() {
        if (this.unlockButton) {
            this.unlockButton.disabled = !this.isPinComplete();
        }
    }

    clearPinInputs() {
        this.pinInputs.forEach(input => {
            input.value = '';
        });
        if (this.pinInputs.length > 0) {
            this.pinInputs[0].focus();
        }
        this.updateUnlockButton();
    }

    showError(message = 'Incorrect PIN. Please try again.') {
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorMessage.style.display = 'block';
        }
        
        // Add error class to inputs for visual feedback
        this.pinInputs.forEach(input => {
            input.classList.add('error');
        });

        // Clear inputs and focus first one
        setTimeout(() => {
            this.clearPinInputs();
            this.clearError();
        }, 1500);
    }

    clearError() {
        if (this.errorMessage) {
            this.errorMessage.style.display = 'none';
        }
        
        // Remove error class from inputs
        this.pinInputs.forEach(input => {
            input.classList.remove('error');
        });
    }

    async checkPinStatus() {
        try {
            const response = await fetch('/api/preferences/security/pin_code');
            if (response.ok) {
                const data = await response.json();
                const newHasPin = data.value ? true : false;
                
                // Update internal state
                this.hasPin = newHasPin;
                
                
                // Show/hide lock button based on PIN existence
                if (this.lockButton) {
                    this.lockButton.style.display = this.hasPin ? 'block' : 'none';
                } else {
                    console.warn('Lock: Lock button element not found');
                }
            }
        } catch (error) {
            console.error('Error checking PIN status:', error);
        }
    }

    async checkLockStatus() {
        try {
            const response = await fetch('/api/system/lock-status');
            if (response.ok) {
                const data = await response.json();
                if (data.locked) {
                    // System is locked, show overlay immediately
                    this.showLockOverlay();
                }
            }
        } catch (error) {
            console.error('Error checking lock status:', error);
        }
    }

    showLockOverlay() {
        this.isLocked = true;
        this.lockOverlay.classList.remove('system-lock-hidden');
        this.clearPinInputs();
        
        // Focus first input
        setTimeout(() => {
            if (this.pinInputs.length > 0) {
                this.pinInputs[0].focus();
            }
        }, 100);

        // Disable browser shortcuts and prevent page interaction
        document.body.style.overflow = 'hidden';
        
    }

    lockSystem() {
        if (!this.hasPin) {
            console.warn('Cannot lock system: No PIN set');
            return;
        }

        // Send lock request to server
        fetch('/api/system/lock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => {
            if (response.ok) {
                this.showLockOverlay();
            }
        }).catch(error => {
            console.error('Error locking system:', error);
        });
    }

    async unlockSystem() {
        if (!this.isPinComplete()) {
            return;
        }

        const pin = this.pinInputs.map(input => input.value).join('');
        
        try {
            const response = await fetch('/api/system/unlock', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ pin })
            });

            const result = await response.json();

            if (response.ok && result.valid) {
                // PIN is correct, unlock system
                this.isLocked = false;
                this.lockOverlay.classList.add('system-lock-hidden');
                document.body.style.overflow = '';
                this.clearPinInputs();
                
                // Reload wallpaper after unlock
                if (window.sypnexOS && window.sypnexOS.loadWallpaper) {
                    window.sypnexOS.loadWallpaper();
                }
            } else {
                // PIN is incorrect
                this.showError();
            }
        } catch (error) {
            console.error('Error verifying PIN:', error);
            this.showError('Error verifying PIN. Please try again.');
        }
    }

    // Public methods for external use
    lock() {
        this.lockSystem();
    }

    isSystemLocked() {
        return this.isLocked;
    }

    refreshPinStatus() {
        this.checkPinStatus();
    }
}

// Initialize and make available globally
// SystemLock constructor already handles DOM ready logic internally
window.systemLock = new SystemLock();
window.SystemLock = SystemLock;

// Sypnex OS - Status Bar Open Apps Management
// Shows icons for all open apps in the status bar for quick switching

// Extend SypnexOS class with status bar app management methods
Object.assign(SypnexOS.prototype, {
    async addAppToStatusBar(appId) {
        const statusApps = document.getElementById('status-open-apps');
        if (!statusApps) return;

        // Check if app is already in status bar
        const existingApp = statusApps.querySelector(`[data-app-id="${appId}"]`);
        if (existingApp) {
            return;
        }

        try {
            // Get app data
            const appData = await this.getAppData(appId);
            
            
            const appIcon = document.createElement('button');
            appIcon.className = 'status-app-icon';
            appIcon.dataset.appId = appId;
            appIcon.title = appData.name;
            appIcon.innerHTML = `<i class="${appData.icon}"></i>`;

            // Add click event to switch to app
            appIcon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.switchToApp(appId);
            });

            statusApps.appendChild(appIcon);
            
            // Update the active state
            this.updateStatusBarAppStates();
            
        } catch (error) {
            console.error('Error adding app to status bar:', error);
        }
    },

    removeAppFromStatusBar(appId) {
        const statusApps = document.getElementById('status-open-apps');
        if (!statusApps) return;

        const appIcon = statusApps.querySelector(`[data-app-id="${appId}"]`);
        if (appIcon) {
            appIcon.remove();
        }
    },

    updateStatusBarAppStates() {
        const statusApps = document.getElementById('status-open-apps');
        if (!statusApps) return;

        const appIcons = statusApps.querySelectorAll('.status-app-icon');
        
        appIcons.forEach(appIcon => {
            const appId = appIcon.dataset.appId;
            const windowElement = this.apps.get(appId);
            
            if (!windowElement) return;

            // Remove all state classes
            appIcon.classList.remove('active', 'minimized');
            
            // Add appropriate state class
            if (appId === this.activeWindow) {
                appIcon.classList.add('active');
            } else if (windowElement.dataset.minimized === 'true') {
                appIcon.classList.add('minimized');
            }
        });
    },

    switchToApp(appId) {
        const windowElement = this.apps.get(appId);
        if (!windowElement) return;

        // Check if the window is minimized
        if (windowElement.dataset.minimized === 'true') {
            // Restore the minimized window
            this.restoreWindow(appId);
        } else {
            // Just focus the window if it's already visible
            this.focusWindow(appId);
        }
        
        // Update status bar states
        this.updateStatusBarAppStates();
    },

    clearStatusBarApps() {
        const statusApps = document.getElementById('status-open-apps');
        if (statusApps) {
            statusApps.innerHTML = '';
        }
    }
});

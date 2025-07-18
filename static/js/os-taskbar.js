// Sypnex OS - Taskbar Management Module
// Contains taskbar functionality for minimized apps

// Extend SypnexOS class with taskbar methods
Object.assign(SypnexOS.prototype, {
    async addToTaskbar(appId) {
        const taskbarApps = document.querySelector('.taskbar-apps');
        if (!taskbarApps) return;

        // Check if app is already in taskbar
        if (taskbarApps.querySelector(`[data-app-id="${appId}"]`)) {
            return;
        }

        try {
            // Get app data
            const appData = await this.getAppData(appId);
            
            const taskbarApp = document.createElement('div');
            taskbarApp.className = 'taskbar-app';
            taskbarApp.dataset.appId = appId;
            taskbarApp.innerHTML = `
                <i class="${appData.icon}"></i>
                <span>${appData.name}</span>
                <button class="app-close" title="Close App">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Add click event to restore window
            taskbarApp.addEventListener('click', (e) => {
                if (!e.target.closest('.app-close')) {
                    this.restoreWindow(appId);
                }
            });

            // Add close button event
            const closeBtn = taskbarApp.querySelector('.app-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeApp(appId);
            });

            taskbarApps.appendChild(taskbarApp);
            this.showTaskbar();
        } catch (error) {
            console.error('Error adding app to taskbar:', error);
        }
    },

    removeFromTaskbar(appId) {
        const taskbarApp = document.querySelector(`.taskbar-app[data-app-id="${appId}"]`);
        if (taskbarApp) {
            taskbarApp.remove();
            this.hideTaskbarIfEmpty();
        }
    },

    clearTaskbar() {
        const taskbarApps = document.querySelector('.taskbar-apps');
        if (taskbarApps) {
            taskbarApps.innerHTML = '';
            this.hideTaskbarIfEmpty();
        }
    },

    showTaskbar() {
        const taskbar = document.getElementById('taskbar');
        if (taskbar) {
            taskbar.classList.remove('taskbar-hidden');
            taskbar.classList.add('taskbar-visible');
        }
    },

    hideTaskbarIfEmpty() {
        const taskbarApps = document.querySelector('.taskbar-apps');
        const taskbar = document.getElementById('taskbar');
        
        if (taskbarApps && taskbar && taskbarApps.children.length === 0) {
            taskbar.classList.remove('taskbar-visible');
            taskbar.classList.add('taskbar-hidden');
        }
    },

    updateTaskbarAppState(appId, isActive = false) {
        const taskbarApp = document.querySelector(`.taskbar-app[data-app-id="${appId}"]`);
        if (taskbarApp) {
            if (isActive) {
                taskbarApp.classList.add('active');
            } else {
                taskbarApp.classList.remove('active');
            }
        }
    },

    restoreAllMinimizedApps() {
        this.apps.forEach((windowElement, appId) => {
            if (windowElement.dataset.minimized === 'true') {
                this.restoreWindow(appId);
            }
        });
    },

    toggleTaskbar() {
        const taskbar = document.getElementById('taskbar');
        if (taskbar) {
            const isVisible = taskbar.classList.contains('taskbar-visible');
            if (isVisible) {
                taskbar.classList.remove('taskbar-visible');
                taskbar.classList.add('taskbar-hidden');
            } else {
                taskbar.classList.remove('taskbar-hidden');
                taskbar.classList.add('taskbar-visible');
            }
        }
    }
}); 
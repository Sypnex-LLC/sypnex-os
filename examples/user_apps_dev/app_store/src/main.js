console.log('App Store script loaded');

// App Store functionality
class AppStore {
    constructor() {
        this.apps = new Map();
        this.installedApps = new Set();
        this.filteredApps = new Map();
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        // Check if SypnexAPI is available
        if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
            console.log('App Store initialized with SypnexAPI');
            this.setupEventListeners();
            this.loadApps();
        } else {
            console.error('SypnexAPI not available');
            this.showError('SypnexAPI not available. App Store cannot function properly.');
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refresh-apps').addEventListener('click', () => {
            this.loadApps();
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.filterApps(e.target.value);
        });

        // Retry button
        document.getElementById('retry-button').addEventListener('click', () => {
            this.loadApps();
        });
    }

    async loadApps(showLoading = true) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        if (showLoading) {
            this.showLoading();
        }

        try {
            // Load available apps and installed apps in parallel
            const [availableApps, installedApps] = await Promise.all([
                this.fetchAvailableApps(),
                this.fetchInstalledApps()
            ]);

            this.apps = availableApps;
            this.installedApps = installedApps;
            this.filteredApps = new Map(this.apps);

            if (this.apps.size === 0) {
                this.showEmpty();
            } else {
                this.renderApps();
            }

        } catch (error) {
            console.error('Error loading apps:', error);
            this.showError(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    async fetchAvailableApps() {
        try {
            const response = await fetch('/api/updates/latest');
            if (!response.ok) {
                throw new Error(`Failed to fetch apps: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success || !data.apps) {
                throw new Error('Invalid response format');
            }

            const appsMap = new Map();
            Object.entries(data.apps).forEach(([appId, appData]) => {
                appsMap.set(appId, {
                    id: appId,
                    name: this.formatAppName(appId),
                    version: appData.version,
                    download_url: appData.download_url,
                    filename: appData.filename,
                    description: this.generateDescription(appId)
                });
            });

            return appsMap;
        } catch (error) {
            console.error('Error fetching available apps:', error);
            throw new Error('Failed to load available apps. Please check your connection.');
        }
    }

    async fetchInstalledApps() {
        try {
            const response = await fetch('/api/apps');
            if (!response.ok) {
                throw new Error(`Failed to fetch installed apps: ${response.status}`);
            }

            const apps = await response.json();
            const installedSet = new Set();
            
            apps.forEach(app => {
                if (app.type === 'user_app') {
                    installedSet.add(app.id);
                }
            });

            return installedSet;
        } catch (error) {
            console.error('Error fetching installed apps:', error);
            // Don't throw here, just return empty set so we can still show available apps
            return new Set();
        }
    }

    formatAppName(appId) {
        return appId.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    generateDescription(appId) {
        const descriptions = {
            flow_editor: 'Visual node-based workflow editor for creating and executing data processing pipelines',
            llm_chat: 'Interactive chat interface for communicating with large language models',
            text_editor: 'Simple and efficient text editor with syntax highlighting support',
            threejs_example: 'Interactive 3D graphics demonstration using Three.js library'
        };
        
        return descriptions[appId] || `${this.formatAppName(appId)} - A useful application for Sypnex OS`;
    }

    filterApps(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredApps = new Map(this.apps);
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredApps = new Map();
            
            this.apps.forEach((app, appId) => {
                if (app.name.toLowerCase().includes(term) ||
                    app.description.toLowerCase().includes(term) ||
                    appId.toLowerCase().includes(term)) {
                    this.filteredApps.set(appId, app);
                }
            });
        }

        if (this.filteredApps.size === 0) {
            this.showEmpty();
        } else {
            this.renderApps();
        }
    }

    renderApps() {
        const appsGrid = document.getElementById('apps-grid');
        appsGrid.innerHTML = '';
        
        this.filteredApps.forEach((app, appId) => {
            const appCard = this.createAppCard(app);
            appsGrid.appendChild(appCard);
        });

        this.showAppsGrid();
    }

    createAppCard(app) {
        const isInstalled = this.installedApps.has(app.id);
        
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <div class="app-card-header">
                <div class="app-icon">
                    <i class="${this.getAppIcon(app.id)}"></i>
                </div>
                <div class="app-info">
                    <h3>${app.name}</h3>
                    <span class="app-version">v${app.version}</span>
                </div>
            </div>
            <div class="app-description">
                ${app.description}
            </div>
            <div class="app-actions">
                <div class="app-status ${isInstalled ? 'installed' : 'not-installed'}">
                    <i class="fas ${isInstalled ? 'fa-check-circle' : 'fa-circle'}"></i>
                    ${isInstalled ? 'Installed' : 'Not Installed'}
                </div>
                <button class="btn btn-sm ${isInstalled ? 'btn-secondary' : 'btn-primary'}" 
                        data-app-id="${app.id}" 
                        data-download-url="${app.download_url}"
                        ${isInstalled ? 'disabled' : ''}>
                    <i class="fas ${isInstalled ? 'fa-check' : 'fa-download'}"></i>
                    ${isInstalled ? 'Installed' : 'Install'}
                </button>
            </div>
        `;

        // Add install button event listener
        if (!isInstalled) {
            const installBtn = card.querySelector('button');
            installBtn.addEventListener('click', () => {
                this.installApp(app.id, app.download_url, installBtn);
            });
        }

        return card;
    }

    getAppIcon(appId) {
        const icons = {
            flow_editor: 'fa-project-diagram',
            llm_chat: 'fa-comments',
            text_editor: 'fa-edit',
            threejs_example: 'fa-cube'
        };
        
        return `fas ${icons[appId] || 'fa-puzzle-piece'}`;
    }

    async installApp(appId, downloadUrl, button) {
        try {
            // Show loading state
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Installing...';
            button.disabled = true;

            // Use the update endpoint to install the app (it handles downloads from URLs)
            const response = await fetch(`/api/user-apps/update/${appId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    download_url: downloadUrl
                })
            });

            const result = await response.json();

            if (response.ok) {
                showNotification(`${result.app_name || appId} installed successfully!`, 'success');
                
                // Update the UI to reflect the installation
                this.installedApps.add(appId);
                
                // Update button state
                button.innerHTML = '<i class="fas fa-check"></i> Installed';
                button.className = 'btn btn-sm btn-secondary';
                button.disabled = true;
                
                // Update status indicator
                const statusElement = button.closest('.app-card').querySelector('.app-status');
                statusElement.className = 'app-status installed';
                statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Installed';
                
                // Refresh the app registry
                await fetch('/api/user-apps/refresh', { method: 'POST' });
                
            } else {
                throw new Error(result.error || 'Installation failed');
            }

        } catch (error) {
            console.error('Installation error:', error);
            showNotification(`Installation failed: ${error.message}`, 'error');
            
            // Restore button state
            button.innerHTML = '<i class="fas fa-download"></i> Install';
            button.disabled = false;
        }
    }

    showLoading() {
        this.hideAllStates();
        document.getElementById('loading-state').style.display = 'flex';
    }

    showError(message) {
        this.hideAllStates();
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-state').style.display = 'flex';
    }

    showEmpty() {
        this.hideAllStates();
        document.getElementById('empty-state').style.display = 'flex';
    }

    showAppsGrid() {
        this.hideAllStates();
        document.getElementById('apps-grid').style.display = 'grid';
    }

    hideAllStates() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('apps-grid').style.display = 'none';
    }
}

// Initialize the app store when the script loads
const appStore = new AppStore();

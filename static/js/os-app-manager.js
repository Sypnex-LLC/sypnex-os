
Object.assign(SypnexOS.prototype, {
    setupUserAppManager(windowElement) {
        const userAppList = windowElement.querySelector('.user-app-list');
        const terminalAppList = windowElement.querySelector('.terminal-app-list');
        const refreshBtn = windowElement.querySelector('.refresh-user-apps');
        const installBtn = windowElement.querySelector('.install-app-btn');
        const statusSummary = windowElement.querySelector('.status-summary');
        const installModal = windowElement.querySelector('#installAppModal');

        // Helper method to refresh backend registry
        const refreshBackendRegistry = async (showFeedback = false) => {
            try {
                const response = await fetch('/api/user-apps/refresh', { method: 'POST' });
                if (showFeedback) {
                    const data = await response.json();
                    this.showNotification(data.message, 'success');
                    return data;
                }
            } catch (error) {
                console.error('Error refreshing backend registry:', error);
                throw error;
            }
        };

        const loadUserApps = async () => {
            try {
                const response = await fetch('/api/user-apps');
                const apps = await response.json();

                // Separate apps by type
                const userApps = apps.filter(app => app.type === 'user_app');

                // Update status summary
                if (statusSummary) {
                    statusSummary.innerHTML = `
                        <div class="status-item">
                            <span class="status-label">Total Apps</span>
                            <span class="status-value">${apps.length}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">User Apps</span>
                            <span class="status-value">${userApps.length}</span>
                        </div>
                    `;
                }



                // Update user app list
                if (userAppList) {
                    if (userApps.length === 0) {
                        userAppList.innerHTML = '<div class="no-apps-message">No user apps found.</div>';
                    } else {
                        userAppList.innerHTML = userApps.map(app => {
                            const source = app.source || 'unknown';
                            const sourceBadge = source === 'vfs' ?
                                '<span class="app-source-badge app-source-vfs">Installed</span>' :
                                '<span class="app-source-badge app-source-local">Local</span>';

                            const uninstallButton = source === 'vfs' ?
                                `<button class="app-uninstall" onclick="window.sypnexOS.uninstallApp('${app.id}', '${app.name}')">
                                    <i class="fas fa-trash"></i> Uninstall
                                </button>` : '';

                            return `
                                <div class="user-app-item">
                                    <div class="app-info">
                                        <div class="app-name">
                                            ${app.name}
                                            <span class="app-type-badge app-type-user">User App</span>
                                            ${sourceBadge}
                                        </div>
                                        <div class="app-description">${app.description}</div>
                                        <div class="app-meta">
                                            ID: ${app.id} | Author: ${app.author || 'Unknown'} | Version: ${app.version || '1.0.0'}
                                        </div>
                                    </div>
                                    <div class="app-actions">
                                        <button class="user-app-launch" onclick="window.sypnexOS.openApp('${app.id}')">
                                            <i class="fas fa-external-link-alt"></i> Launch
                                        </button>
                                        ${uninstallButton}
                                    </div>
                                </div>
                            `;
                        }).join('');
                    }
                }

            } catch (error) {
                console.error('Error loading user apps:', error);
                if (userAppList) {
                    userAppList.innerHTML = '<div class="error-message">Error loading user apps</div>';
                }
            }
        };

        // Setup install modal functionality
        const setupInstallModal = () => {
            if (!installModal) return;

            const installClose = installModal.querySelector('.modal-close');
            const installCancel = installModal.querySelector('.modal-cancel');
            const installSubmit = installModal.querySelector('.install-app-submit');
            const fileInput = installModal.querySelector('#appPackage');
            const progressDiv = installModal.querySelector('#installProgress');
            const form = installModal.querySelector('#installAppForm');

            // Show install modal
            if (installBtn) {
                installBtn.addEventListener('click', () => {
                    installModal.style.display = 'block';
                });
            }

            // Close install modal
            if (installClose) {
                installClose.addEventListener('click', () => {
                    installModal.style.display = 'none';
                });
            }

            if (installCancel) {
                installCancel.addEventListener('click', () => {
                    installModal.style.display = 'none';
                });
            }

            // Install app submission
            if (installSubmit) {
                installSubmit.addEventListener('click', async () => {
                    const file = fileInput.files[0];

                    if (!file) {
                        this.showNotification('Please select a package file', 'error');
                        return;
                    }

                    if (!file.name.endsWith('.app')) {
                        this.showNotification('Please select a valid .app package file', 'error');
                        return;
                    }

                    // Show progress
                    progressDiv.style.display = 'block';
                    form.style.display = 'none';

                    try {
                        const formData = new FormData();
                        formData.append('package', file);

                        const response = await fetch('/api/user-apps/install', {
                            method: 'POST',
                            body: formData
                        });

                        const result = await response.json();

                        if (response.ok) {
                            this.showNotification(`App installed successfully: ${result.app_name}`, 'success');
                            installModal.style.display = 'none';
                            // Auto-refresh backend registry and UI after install
                            await refreshBackendRegistry();
                            // Also refresh the latest versions cache to reflect new app
                            if (this.refreshLatestVersionsCache) {
                                await this.refreshLatestVersionsCache();
                            }
                            loadUserApps(); // Reload apps to show the new one
                        } else {
                            this.showNotification(result.error || 'Failed to install app', 'error');
                        }
                    } catch (error) {
                        console.error('Error installing app:', error);
                        this.showNotification('Failed to install app', 'error');
                    } finally {
                        // Hide progress and show form again
                        progressDiv.style.display = 'none';
                        form.style.display = 'block';
                        fileInput.value = ''; // Clear file input
                    }
                });
            }

            // Close modal when clicking outside
            window.addEventListener('click', (event) => {
                if (event.target === installModal) {
                    installModal.style.display = 'none';
                }
            });
        };

        // Setup uninstall functionality
        this.uninstallApp = async (appId, appName) => {
            if (!confirm(`Are you sure you want to uninstall "${appName}"? This action cannot be undone.`)) {
                return;
            }

            try {
                const response = await fetch(`/api/user-apps/uninstall/${appId}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (response.ok) {
                    this.showNotification(`App uninstalled successfully: ${appName}`, 'success');
                    // Auto-refresh backend registry and UI after uninstall
                    await refreshBackendRegistry();
                    // Also refresh the latest versions cache since app was removed
                    if (this.refreshLatestVersionsCache) {
                        await this.refreshLatestVersionsCache();
                    }
                    loadUserApps(); // Reload apps
                } else {
                    this.showNotification(result.error || 'Failed to uninstall app', 'error');
                }
            } catch (error) {
                console.error('Error uninstalling app:', error);
                this.showNotification('Failed to uninstall app', 'error');
            }
        };

        // Load initial apps
        loadUserApps();

        // Setup install modal
        setupInstallModal();

        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                try {
                    await refreshBackendRegistry(true); // Show feedback for manual refresh
                    loadUserApps();
                } catch (error) {
                    this.showNotification('Error refreshing user apps', 'error');
                }
            });
        }
    }
});
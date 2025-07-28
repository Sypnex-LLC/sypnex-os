Object.assign(SypnexOS.prototype, {
    setupResourceManager(windowElement) {
        const appId = windowElement.dataset.appId;
        const systemOverview = windowElement.querySelector('.system-overview');
        const resourceTableBody = windowElement.querySelector('.resource-table-body');
        const servicesTableBody = windowElement.querySelector('.services-table-body');

        // Get built-in app tracker if available
        const tracker = window.sypnexApps && window.sypnexApps[appId] ? window.sypnexApps[appId] : null;

        // Cache for app data - refreshed much less frequently than metrics
        let appDataCache = new Map();
        let lastAppDataRefresh = 0;
        const APP_DATA_CACHE_DURATION = 30000; // 30 seconds

        // Function to refresh app data cache
        const refreshAppDataCache = async () => {
            try {
                const response = await fetch('/api/apps/resource-manager-data');
                if (response.ok) {
                    const appMap = await response.json();
                    appDataCache.clear();
                    for (const [id, data] of Object.entries(appMap)) {
                        appDataCache.set(id, data);
                    }
                    lastAppDataRefresh = Date.now();
                } else {
                    console.error('Failed to fetch app data cache');
                }
            } catch (error) {
                console.error('Error refreshing app data cache:', error);
            }
        };

        // Function to get app data from cache (with automatic refresh if needed)
        const getAppDataFromCache = async (appId) => {
            // Refresh cache if it's stale or empty
            if (Date.now() - lastAppDataRefresh > APP_DATA_CACHE_DURATION || appDataCache.size === 0) {
                await refreshAppDataCache();
            }
            
            return appDataCache.get(appId) || null;
        };

        // Resource monitoring data
        let resourceData = {
            apps: new Map(),
            system: {
                totalMemory: 0,
                usedMemory: 0,
                totalApps: 0,
                activeApps: 0
            }
        };

        // Helper function to get DOM node count for an app
        const getAppDOMNodes = (appId) => {
            // Use the app window from SypnexOS apps map, not DOM search
            const appWindow = this.apps.get(appId);
            if (appWindow && appWindow.querySelector) {
                // Count all elements within the app window
                const nodeCount = appWindow.querySelectorAll('*').length;
                return nodeCount;
            }
            return 0;
        };

        // Helper function to get real event listener count from sandbox
        const getEventListeners = (appId) => {
            if (window.sypnexApps && window.sypnexApps[appId]) {
                // Check if it's a user app with sandbox tracking
                if (window.sypnexApps[appId].getEventListenerCount) {
                    return window.sypnexApps[appId].getEventListenerCount();
                }
                // For built-in apps, count interactive elements using SypnexOS apps map
                const appWindow = this.apps.get(appId);
                if (appWindow && appWindow.querySelector) {
                    const interactiveElements = appWindow.querySelectorAll('button, input, select, textarea, a, [onclick], [onchange], [oninput]');
                    return interactiveElements.length;
                }
            }
            return 0;
        };

        // Helper function to get timer count from sandbox  
        const getActiveTimers = (appId) => {
            if (window.sypnexApps && window.sypnexApps[appId] && window.sypnexApps[appId].getTimerCount) {
                return window.sypnexApps[appId].getTimerCount();
            }
            return 0;
        };

        // Helper function to get network activity (WebSocket connections)
        const getNetworkActivity = (appId) => {
            let connections = 0;
            let status = 'none';
            
            if (window.sypnexApps && window.sypnexApps[appId] && window.sypnexApps[appId].sypnexAPI) {
                const api = window.sypnexApps[appId].sypnexAPI;
                if (api.socket && api.socket.connected) {
                    connections = 1;
                    status = 'connected';
                } else if (api.socket) {
                    status = 'disconnected';
                }
            }
            
            return { connections, status };
        };

        // Function to update system overview
        const updateSystemOverview = () => {
            const apps = Array.from(this.apps.entries());
            
            const runningApps = Array.from(this.apps.values()).filter(app =>
                app.dataset.minimized !== 'true'
            ).length;
            const totalApps = this.apps.size;

            // Calculate fresh metrics for each app
            let totalDOMNodes = 0;
            let totalTimers = 0;
            let totalGlobalEvents = 0;
            let activeConnections = 0;

            for (const [appId, appWindow] of apps) {
                // Get fresh metrics for each app
                const domNodes = getAppDOMNodes(appId);
                const timers = getActiveTimers(appId);
                const events = getEventListeners(appId);
                const network = getNetworkActivity(appId);
                
                totalDOMNodes += domNodes;
                totalTimers += timers;
                totalGlobalEvents += events;
                
                if (network.connections > 0) {
                    activeConnections += network.connections;
                }
            }


            if (systemOverview) {
                systemOverview.innerHTML = `
                    <div class="overview-item">
                        <span class="overview-label">Running Apps</span>
                        <span class="overview-value">${runningApps}</span>
                        <span class="overview-unit">of ${totalApps} total</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">Total DOM Nodes</span>
                        <span class="overview-value">${totalDOMNodes}</span>
                        <span class="overview-unit">across all apps</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">Active Timers</span>
                        <span class="overview-value">${totalTimers}</span>
                        <span class="overview-unit">system-wide</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">Global Events</span>
                        <span class="overview-value">${totalGlobalEvents}</span>
                        <span class="overview-unit">tracked listeners</span>
                    </div>
                `;
            }
        };

        // Function to update resource table
        const updateResourceTable = async () => {
            if (!resourceTableBody) return;

            const apps = Array.from(this.apps.entries());

            // Get existing rows to avoid complete rebuild
            const existingRows = new Map();
            resourceTableBody.querySelectorAll('tr[data-app-id]').forEach(row => {
                existingRows.set(row.dataset.appId, row);
            });

            // Track which apps are still active
            const activeAppIds = new Set();
            let validAppsCount = 0;

            for (const [appId, appWindow] of apps) {
                try {
                    activeAppIds.add(appId);

                    // Get app metadata from cache instead of individual API call
                    const appData = await getAppDataFromCache(appId);
                    if (!appData) {
                        continue;
                    }

                    // Get fresh metrics for this app
                    const domNodes = getAppDOMNodes(appId);
                    const activeTimers = getActiveTimers(appId);
                    const globalEvents = getEventListeners(appId);
                    const network = getNetworkActivity(appId);
                    
                    validAppsCount++; // Increment count for valid apps

                    // Determine status
                    const isMinimized = appWindow.dataset.minimized === 'true';
                    const status = isMinimized ? 'minimized' : 'running';
                    const statusClass = isMinimized ? 'status-minimized' : 'status-running';

                    // Create performance indicators
                    const domNodesClass = domNodes > 500 ? 'high' : domNodes > 200 ? 'medium' : 'low';
                    const timersClass = activeTimers > 5 ? 'high' : activeTimers > 2 ? 'medium' : 'low';
                    const eventsClass = globalEvents > 10 ? 'high' : globalEvents > 5 ? 'medium' : 'low';

                    // Check if row exists and update in place, or create new one
                    let row = existingRows.get(appId);
                    if (row) {
                        // Update existing row - only update the dynamic parts
                        const statusBadge = row.querySelector('.status-badge');
                        if (statusBadge && (statusBadge.className !== `status-badge ${statusClass}` || statusBadge.textContent !== status)) {
                            statusBadge.className = `status-badge ${statusClass}`;
                            statusBadge.textContent = status;
                        }

                        // Update DOM nodes metric
                        const domNodesMetric = row.children[2];
                        if (domNodesMetric) {
                            const valueDiv = domNodesMetric.querySelector('.metric-value');
                            const fillDiv = domNodesMetric.querySelector('.metric-fill');
                            if (valueDiv && valueDiv.textContent !== domNodes.toString()) {
                                valueDiv.textContent = domNodes;
                                fillDiv.className = `metric-fill ${domNodesClass}`;
                                fillDiv.style.width = `${Math.min((domNodes / 1000) * 100, 100)}%`;
                            }
                        }

                        // Update timers metric
                        const timersMetric = row.children[3];
                        if (timersMetric) {
                            const valueDiv = timersMetric.querySelector('.metric-value');
                            const fillDiv = timersMetric.querySelector('.metric-fill');
                            if (valueDiv && valueDiv.textContent !== activeTimers.toString()) {
                                valueDiv.textContent = activeTimers;
                                fillDiv.className = `metric-fill ${timersClass}`;
                                fillDiv.style.width = `${Math.min((activeTimers / 10) * 100, 100)}%`;
                            }
                        }

                        // Update network metric
                        const networkMetric = row.children[4];
                        if (networkMetric) {
                            const values = networkMetric.querySelectorAll('.metric-value');
                            if (values[0] && values[0].textContent !== network.connections.toString()) {
                                values[0].textContent = network.connections;
                            }
                            if (values[1] && values[1].textContent !== network.status) {
                                values[1].textContent = network.status;
                            }
                        }

                        // Update events metric
                        const eventsMetric = row.children[5];
                        if (eventsMetric) {
                            const valueDiv = eventsMetric.querySelector('.metric-value');
                            const fillDiv = eventsMetric.querySelector('.metric-fill');
                            if (valueDiv && valueDiv.textContent !== globalEvents.toString()) {
                                valueDiv.textContent = globalEvents;
                                fillDiv.className = `metric-fill ${eventsClass}`;
                                fillDiv.style.width = `${Math.min((globalEvents / 20) * 100, 100)}%`;
                            }
                        }

                    } else {
                        // Create new row only if it doesn't exist
                        row = document.createElement('tr');
                        row.dataset.appId = appId;
                        row.innerHTML = `
                            <td>
                                <div class="app-name-cell">
                                    <i class="app-icon ${appData.icon}"></i>
                                    <span>${appData.name}</span>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${statusClass}">${status}</span>
                            </td>
                            <td>
                                <div class="metric-value">${domNodes}</div>
                                <div class="metric-bar">
                                    <div class="metric-fill ${domNodesClass}" 
                                         style="width: ${Math.min((domNodes / 1000) * 100, 100)}%"></div>
                                </div>
                            </td>
                            <td>
                                <div class="metric-value">${activeTimers}</div>
                                <div class="metric-bar">
                                    <div class="metric-fill ${timersClass}" 
                                         style="width: ${Math.min((activeTimers / 10) * 100, 100)}%"></div>
                                </div>
                            </td>
                            <td>
                                <div class="metric-value">${network.connections}</div>
                                <div class="metric-value" style="font-size: 0.8em; color: var(--text-secondary);">${network.status}</div>
                            </td>
                            <td>
                                <div class="metric-value">${globalEvents}</div>
                                <div class="metric-bar">
                                    <div class="metric-fill ${eventsClass}" 
                                         style="width: ${Math.min((globalEvents / 20) * 100, 100)}%"></div>
                                </div>
                            </td>
                            <td>
                                <div class="app-actions">
                                    <button class="action-btn" onclick="window.sypnexOS.focusWindow('${appId}')" title="Focus">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="action-btn danger" onclick="window.sypnexOS.terminateAppFromResourceManager('${appId}')" title="End Process">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </td>
                        `;
                        resourceTableBody.appendChild(row);
                    }

                } catch (error) {
                    console.error(`Error getting data for app ${appId}:`, error);
                }
            }

            // Remove rows for apps that no longer exist
            existingRows.forEach((row, appId) => {
                if (!activeAppIds.has(appId)) {
                    row.remove();
                }
            });

            // Show "no apps" message only if we truly have no valid apps
            if (validAppsCount === 0) {
                if (!resourceTableBody.querySelector('.no-apps-message')) {
                    resourceTableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="no-apps-message">No applications are currently running</td>
                        </tr>
                    `;
                }
            } else {
                // Remove "no apps" message if we have valid apps
                const noAppsMessage = resourceTableBody.querySelector('.no-apps-message');
                if (noAppsMessage) {
                    noAppsMessage.parentElement.remove();
                }
            }
            
        };

        // Function to update services table
        const updateServicesTable = async () => {
            if (!servicesTableBody) return;

            try {
                const response = await fetch('/api/services');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                const services = data.services || [];

                if (services.length === 0) {
                    if (!servicesTableBody.querySelector('.no-apps-message')) {
                        servicesTableBody.innerHTML = `
                            <tr>
                                <td colspan="5" class="no-apps-message">No services are currently available</td>
                            </tr>
                        `;
                    }
                    return;
                }

                // Get existing rows to avoid complete rebuild
                const existingRows = new Map();
                servicesTableBody.querySelectorAll('tr').forEach(row => {
                    const serviceNameCell = row.querySelector('.app-name-cell span');
                    if (serviceNameCell) {
                        existingRows.set(serviceNameCell.textContent, row);
                    }
                });

                // Track which services are still active
                const activeServiceIds = new Set();

                for (const service of services) {
                    const serviceId = service.id || service.name || 'Unknown Service';
                    activeServiceIds.add(serviceId);

                    const isRunning = service.running;
                    const status = isRunning ? 'running' : 'stopped';
                    const statusClass = isRunning ? 'status-running' : 'status-stopped';
                    
                    // Check if row exists and update in place, or create new one
                    let row = existingRows.get(serviceId);
                    if (row) {
                        // Update existing row - only update the dynamic parts
                        const statusBadge = row.querySelector('.status-badge');
                        if (statusBadge && (statusBadge.className !== `status-badge ${statusClass}` || statusBadge.textContent !== status)) {
                            statusBadge.className = `status-badge ${statusClass}`;
                            statusBadge.textContent = status;
                        }

                        // Update actions only if the running state changed
                        const actionsCell = row.querySelector('.app-actions');
                        const hasStartButton = actionsCell.querySelector('i.fa-play') !== null;
                        const hasStopButton = actionsCell.querySelector('i.fa-stop') !== null;
                        
                        if ((isRunning && hasStartButton) || (!isRunning && hasStopButton)) {
                            actionsCell.innerHTML = `
                                ${!isRunning ? `
                                    <button class="action-btn" onclick="window.sypnexOS.startService('${service.id}')" title="Start Service">
                                        <i class="fas fa-play"></i>
                                    </button>
                                ` : ''}
                                ${isRunning ? `
                                    <button class="action-btn danger" onclick="window.sypnexOS.stopService('${service.id}')" title="Stop Service">
                                        <i class="fas fa-stop"></i>
                                    </button>
                                ` : ''}
                            `;
                        }

                    } else {
                        // Create new row only if it doesn't exist
                        row = document.createElement('tr');
                        row.innerHTML = `
                            <td>
                                <div class="app-name-cell">
                                    <i class="app-icon fas fa-cog"></i>
                                    <span>${serviceId}</span>
                                </div>
                            </td>
                            <td>
                                <span class="status-badge ${statusClass}">${status}</span>
                            </td>
                            <td>
                                <span class="service-description">${service.description || 'No description available'}</span>
                            </td>
                            <td>
                                <span class="service-version">${service.version || '1.0.0'}</span>
                            </td>
                            <td>
                                <div class="app-actions">
                                    ${!isRunning ? `
                                        <button class="action-btn" onclick="window.sypnexOS.startService('${service.id}')" title="Start Service">
                                            <i class="fas fa-play"></i>
                                        </button>
                                    ` : ''}
                                    ${isRunning ? `
                                        <button class="action-btn danger" onclick="window.sypnexOS.stopService('${service.id}')" title="Stop Service">
                                            <i class="fas fa-stop"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        `;
                        servicesTableBody.appendChild(row);
                    }
                }

                // Remove rows for services that no longer exist
                existingRows.forEach((row, serviceId) => {
                    if (!activeServiceIds.has(serviceId)) {
                        row.remove();
                    }
                });

            } catch (error) {
                console.error('Error fetching services:', error);
                if (!servicesTableBody.querySelector('.no-apps-message')) {
                    servicesTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="no-apps-message">Error loading services: ${error.message}</td>
                        </tr>
                    `;
                }
            }
        };

        // Function to refresh all data
        let isRefreshing = false;
        const refreshResources = async () => {
            if (isRefreshing) {
                return;
            }
            
            isRefreshing = true;
            
            try {
                // Update both displays - let each function get fresh metrics
                await Promise.all([
                    updateResourceTable(),
                    updateServicesTable()
                ]);
                updateSystemOverview();
                
            } catch (error) {
                console.error('Error refreshing resource data:', error);
            } finally {
                isRefreshing = false;
            }
        };

        // Set up event listeners - none needed for auto-refresh monitor

        // Load initial data
        refreshResources();

        // Auto-refresh every 1 second for resource monitoring
        let autoRefreshInterval;
        if (tracker && tracker.isBuiltinApp) {
            // Use tracked timer for built-in apps
            autoRefreshInterval = this.createTrackedTimer(appId, refreshResources, 1000, true);
        } else {
            // Fallback to regular timer
            autoRefreshInterval = setInterval(refreshResources, 1000);
        }
        
        // Clean up interval when window is closed
        windowElement.addEventListener('close', () => {
            if (tracker && tracker.isBuiltinApp) {
                this.clearTrackedTimer(appId, autoRefreshInterval, true);
            } else {
                clearInterval(autoRefreshInterval);
            }
        });
    },

    // Service management functions
    async startService(serviceId) {
        try {
            // Immediately update UI to show "starting" state
            this.updateServiceButtonState(serviceId, 'starting');
            
            const response = await fetch(`/api/services/${serviceId}/start`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showNotification(`Service ${serviceId} started successfully`, 'success');
                // Update UI to show "running" state immediately
                this.updateServiceButtonState(serviceId, 'running');
            } else {
                const errorData = await response.json();
                this.showNotification(`Failed to start service ${serviceId}: ${errorData.error}`, 'error');
                // Revert to "stopped" state on error
                this.updateServiceButtonState(serviceId, 'stopped');
            }
        } catch (error) {
            console.error('Error starting service:', error);
            this.showNotification(`Error starting service ${serviceId}: ${error.message}`, 'error');
            // Revert to "stopped" state on error
            this.updateServiceButtonState(serviceId, 'stopped');
        }
    },

    async stopService(serviceId) {
        try {
            // Create a temporary SypnexAPI instance to use the confirmation dialog
            const tempAPI = new window.SypnexAPI('resource-manager');
            
            const confirmed = await tempAPI.showConfirmation(
                'Stop Service',
                `Are you sure you want to stop the service "${serviceId}"? This may affect system functionality.`,
                {
                    type: 'danger',
                    confirmText: 'Stop Service',
                    cancelText: 'Cancel',
                    icon: 'fas fa-stop'
                }
            );
            
            if (!confirmed) return;

            // Immediately update UI to show "stopping" state
            this.updateServiceButtonState(serviceId, 'stopping');

            const response = await fetch(`/api/services/${serviceId}/stop`, {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showNotification(`Service ${serviceId} stopped successfully`, 'success');
                // Update UI to show "stopped" state immediately
                this.updateServiceButtonState(serviceId, 'stopped');
            } else {
                const errorData = await response.json();
                this.showNotification(`Failed to stop service ${serviceId}: ${errorData.error}`, 'error');
                // Revert to "running" state on error
                this.updateServiceButtonState(serviceId, 'running');
            }
        } catch (error) {
            console.error('Error stopping service:', error);
            this.showNotification(`Error stopping service ${serviceId}: ${error.message}`, 'error');
            // Revert to "running" state on error
            this.updateServiceButtonState(serviceId, 'running');
        }
    },

    // Helper function to update service button state immediately
    updateServiceButtonState(serviceId, state) {
        const resourceManager = document.querySelector('[data-app-id="resource-manager"]');
        if (!resourceManager) return;

        const servicesTable = resourceManager.querySelector('.services-table-body');
        if (!servicesTable) return;

        // Find the service row
        const rows = servicesTable.querySelectorAll('tr');
        for (const row of rows) {
            const serviceNameCell = row.querySelector('.app-name-cell span');
            if (serviceNameCell && serviceNameCell.textContent === serviceId) {
                // Update status badge
                const statusBadge = row.querySelector('.status-badge');
                const actionsCell = row.querySelector('.app-actions');
                
                if (statusBadge && actionsCell) {
                    switch (state) {
                        case 'starting':
                            statusBadge.className = 'status-badge status-unknown';
                            statusBadge.textContent = 'starting';
                            actionsCell.innerHTML = `
                                <button class="action-btn" disabled title="Starting...">
                                    <i class="fas fa-spinner fa-spin"></i>
                                </button>
                            `;
                            break;
                        case 'stopping':
                            statusBadge.className = 'status-badge status-unknown';
                            statusBadge.textContent = 'stopping';
                            actionsCell.innerHTML = `
                                <button class="action-btn danger" disabled title="Stopping...">
                                    <i class="fas fa-spinner fa-spin"></i>
                                </button>
                            `;
                            break;
                        case 'running':
                            statusBadge.className = 'status-badge status-running';
                            statusBadge.textContent = 'running';
                            actionsCell.innerHTML = `
                                <button class="action-btn danger" onclick="window.sypnexOS.stopService('${serviceId}')" title="Stop Service">
                                    <i class="fas fa-stop"></i>
                                </button>
                            `;
                            break;
                        case 'stopped':
                            statusBadge.className = 'status-badge status-stopped';
                            statusBadge.textContent = 'stopped';
                            actionsCell.innerHTML = `
                                <button class="action-btn" onclick="window.sypnexOS.startService('${serviceId}')" title="Start Service">
                                    <i class="fas fa-play"></i>
                                </button>
                            `;
                            break;
                    }
                }
                break;
            }
        }
    },

    // App management function with immediate UI feedback
    async terminateAppFromResourceManager(appId) {
        try {
            // Get app data for better confirmation message from the Resource Manager cache
            const resourceManager = document.querySelector('[data-app-id="resource-manager"]');
            let appName = appId;
            
            if (resourceManager) {
                // Try to get the app name from the existing table row to avoid API call
                const row = resourceManager.querySelector(`tr[data-app-id="${appId}"]`);
                if (row) {
                    const nameSpan = row.querySelector('.app-name-cell span');
                    if (nameSpan) {
                        appName = nameSpan.textContent;
                    }
                }
            }

            // Create a temporary SypnexAPI instance to use the confirmation dialog
            const tempAPI = new window.SypnexAPI('resource-manager');
            
            const confirmed = await tempAPI.showConfirmation(
                'Terminate Application',
                `Are you sure you want to terminate "${appName}"? Any unsaved data will be lost.`,
                {
                    type: 'danger',
                    confirmText: 'Terminate',
                    cancelText: 'Cancel',
                    icon: 'fas fa-times'
                }
            );
            
            if (!confirmed) return;

            // Immediately update UI to show "terminating" state
            this.updateAppButtonState(appId, 'terminating');
            
            // Call the actual close function
            this.closeApp(appId);
            
            // Show notification
            this.showNotification(`Application ${appName} terminated`, 'info');
        } catch (error) {
            console.error('Error terminating app:', error);
            this.showNotification(`Error terminating application: ${error.message}`, 'error');
        }
    },

    // Helper function to update app button state immediately
    updateAppButtonState(appId, state) {
        const resourceManager = document.querySelector('[data-app-id="resource-manager"]');
        if (!resourceManager) return;

        const appsTable = resourceManager.querySelector('.resource-table-body');
        if (!appsTable) return;

        // Find the app row using data-app-id attribute
        const row = appsTable.querySelector(`tr[data-app-id="${appId}"]`);
        if (row) {
            // Update status badge and actions
            const statusBadge = row.querySelector('.status-badge');
            const actionsCell = row.querySelector('.app-actions');
            
            if (statusBadge && actionsCell) {
                switch (state) {
                    case 'terminating':
                        statusBadge.className = 'status-badge status-error';
                        statusBadge.textContent = 'terminating';
                        actionsCell.innerHTML = `
                            <button class="action-btn" disabled title="Terminating...">
                                <i class="fas fa-spinner fa-spin"></i>
                            </button>
                            <button class="action-btn danger" disabled title="Terminating...">
                                <i class="fas fa-spinner fa-spin"></i>
                            </button>
                        `;
                        
                        // Remove the row after a short delay since the app will be closed
                        setTimeout(() => {
                            if (row.parentNode) {
                                row.remove();
                            }
                        }, 500);
                        break;
                }
            }
        }
    }
}); 
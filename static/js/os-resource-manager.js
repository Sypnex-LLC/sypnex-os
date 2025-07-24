Object.assign(SypnexOS.prototype, {
    setupResourceManager(windowElement) {
        const appId = windowElement.dataset.appId;
        const systemOverview = windowElement.querySelector('.system-overview');
        const resourceTableBody = windowElement.querySelector('.resource-table-body');
        const refreshBtn = windowElement.querySelector('.refresh-resources');

        // Get built-in app tracker if available
        const tracker = window.sypnexApps && window.sypnexApps[appId] ? window.sypnexApps[appId] : null;

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
            const appWindow = document.querySelector(`[data-app-id="${appId}"]`);
            if (appWindow) {
                return appWindow.querySelectorAll('*').length;
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
                // For built-in apps, count interactive elements
                const appWindow = document.querySelector(`[data-app-id="${appId}"]`);
                if (appWindow) {
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
        const updateSystemOverview = (appMetrics) => {
            const apps = Array.from(this.apps.entries());
            
            const runningApps = Array.from(this.apps.values()).filter(app =>
                app.dataset.minimized !== 'true'
            ).length;
            const totalApps = this.apps.size;

            // Use pre-calculated metrics to avoid DOM counting after modifications
            let totalDOMNodes = 0;
            let totalTimers = 0;
            let totalGlobalEvents = 0;
            let activeConnections = 0;

            for (const [appId, appWindow] of apps) {
                const metrics = appMetrics.get(appId);
                if (metrics) {
                    
                    totalDOMNodes += metrics.domNodes;
                    totalTimers += metrics.timers;
                    totalGlobalEvents += metrics.events;
                    
                    if (metrics.network.connections > 0) {
                        activeConnections += metrics.network.connections;
                    }
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
        const updateResourceTable = async (appMetrics) => {
            if (!resourceTableBody) return;

            const apps = Array.from(this.apps.entries());

            if (apps.length === 0) {
                resourceTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="no-apps-message">No applications are currently running</td>
                    </tr>
                `;
                return;
            }

            resourceTableBody.innerHTML = '';
            let tableTotalDOM = 0;

            for (const [appId, appWindow] of apps) {
                try {
                    // Get app metadata
                    const appData = await this.getAppData(appId);
                    if (!appData) {
                        continue;
                    }

                    // Use pre-calculated metrics
                    const metrics = appMetrics.get(appId);
                    if (!metrics) continue;
                    
                    const domNodes = metrics.domNodes;
                    const activeTimers = metrics.timers;
                    const globalEvents = metrics.events;
                    const network = metrics.network;

                    tableTotalDOM += domNodes;

                    // Determine status
                    const isMinimized = appWindow.dataset.minimized === 'true';
                    const status = isMinimized ? 'minimized' : 'running';
                    const statusClass = isMinimized ? 'status-minimized' : 'status-running';

                    // Create performance indicators
                    const domNodesClass = domNodes > 500 ? 'high' : domNodes > 200 ? 'medium' : 'low';
                    const timersClass = activeTimers > 5 ? 'high' : activeTimers > 2 ? 'medium' : 'low';
                    const eventsClass = globalEvents > 10 ? 'high' : globalEvents > 5 ? 'medium' : 'low';

                    // Create table row
                    const row = document.createElement('tr');
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
                                <button class="action-btn danger" onclick="window.sypnexOS.closeApp('${appId}')" title="End Process">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </td>
                    `;

                    resourceTableBody.appendChild(row);

                } catch (error) {
                    console.error(`Error getting data for app ${appId}:`, error);
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
                // Get measurements for both BEFORE any DOM changes
                const apps = Array.from(this.apps.entries());
                const appMetrics = new Map();
                
                // Collect all metrics first to prevent DOM modification affecting counts
                for (const [appId, appWindow] of apps) {
                    appMetrics.set(appId, {
                        domNodes: getAppDOMNodes(appId),
                        timers: getActiveTimers(appId),
                        events: getEventListeners(appId),
                        network: getNetworkActivity(appId)
                    });
                }
                
                // Now update both displays with the same data
                await updateResourceTable(appMetrics);
                updateSystemOverview(appMetrics);
            } finally {
                isRefreshing = false;
            }
        };

        // Set up event listeners
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshResources);
            // Track this event listener if tracker is available
            if (tracker && tracker.trackEventListener) {
                tracker.trackEventListener(refreshBtn, 'click', refreshResources);
            }
        }

        // Load initial data
        refreshResources();

        // Auto-refresh every 5 seconds using tracked timer
        let autoRefreshInterval;
        if (tracker && tracker.isBuiltinApp) {
            // Use tracked timer for built-in apps
            autoRefreshInterval = this.createTrackedTimer(appId, refreshResources, 5000, true);
        } else {
            // Fallback to regular timer
            autoRefreshInterval = setInterval(refreshResources, 5000);
        }

        // Clean up interval when window is closed (cleanup is now handled automatically)
        windowElement.addEventListener('close', () => {
            if (tracker && tracker.isBuiltinApp) {
                this.clearTrackedTimer(appId, autoRefreshInterval, true);
            } else {
                clearInterval(autoRefreshInterval);
            }
        });
    }
}); 
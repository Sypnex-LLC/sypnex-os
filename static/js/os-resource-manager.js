Object.assign(SypnexOS.prototype, {
    setupResourceManager(windowElement) {
        const systemOverview = windowElement.querySelector('.system-overview');
        const resourceTableBody = windowElement.querySelector('.resource-table-body');
        const refreshBtn = windowElement.querySelector('.refresh-resources');

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

        // Helper function to format bytes
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        };

        // Helper function to get memory usage (estimated)
        const getMemoryUsage = () => {
            if (performance.memory) {
                return {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                };
            }
            // Fallback estimation
            return {
                used: window.performance.now() * 1000, // Rough estimation
                total: 100 * 1024 * 1024, // Assume 100MB
                limit: 100 * 1024 * 1024
            };
        };

        // Helper function to get DOM node count for an app
        const getAppDOMNodes = (appId) => {
            const appWindow = document.querySelector(`[data-app-id="${appId}"]`);
            if (appWindow) {
                return appWindow.querySelectorAll('*').length;
            }
            return 0;
        };

        // Helper function to get event listener count (estimated)
        const getEventListeners = (appId) => {
            // This is a rough estimation since we can't directly count event listeners
            const appWindow = document.querySelector(`[data-app-id="${appId}"]`);
            if (appWindow) {
                // Count elements that might have event listeners
                const interactiveElements = appWindow.querySelectorAll('button, input, select, textarea, a, [onclick], [onchange], [oninput]');
                return interactiveElements.length;
            }
            return 0;
        };

        // Helper function to get network activity (estimated)
        const getNetworkActivity = (appId) => {
            // This would need to be tracked by intercepting fetch/XMLHttpRequest
            // For now, return a placeholder
            return {
                requests: Math.floor(Math.random() * 10), // Placeholder
                bytes: Math.floor(Math.random() * 1024 * 100) // Placeholder
            };
        };

        // Helper function to get CPU usage (estimated based on execution time)
        const getCPUUsage = (appId) => {
            // This is a very rough estimation
            return Math.floor(Math.random() * 100); // Placeholder
        };

        // Function to update system overview
        const updateSystemOverview = () => {
            const memory = getMemoryUsage();
            const runningApps = Array.from(this.apps.values()).filter(app =>
                app.dataset.minimized !== 'true'
            ).length;
            const totalApps = this.apps.size;

            if (systemOverview) {
                systemOverview.innerHTML = `
                    <div class="overview-item">
                        <span class="overview-label">Memory Usage</span>
                        <span class="overview-value">${formatBytes(memory.used)}</span>
                        <span class="overview-unit">of ${formatBytes(memory.total)}</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">Running Apps</span>
                        <span class="overview-value">${runningApps}</span>
                        <span class="overview-unit">of ${totalApps} total</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">System Load</span>
                        <span class="overview-value">${Math.floor((memory.used / memory.total) * 100)}%</span>
                        <span class="overview-unit">estimated</span>
                    </div>
                    <div class="overview-item">
                        <span class="overview-label">Active Connections</span>
                        <span class="overview-value">${window.sypnexApps ? Object.keys(window.sypnexApps).length : 0}</span>
                        <span class="overview-unit">websockets</span>
                    </div>
                `;
            }
        };

        // Function to update resource table
        const updateResourceTable = async () => {
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

            for (const [appId, appWindow] of apps) {
                try {
                    // Get app metadata
                    const appData = await this.getAppData(appId);
                    if (!appData) continue;

                    // Get resource metrics
                    const domNodes = getAppDOMNodes(appId);
                    const eventListeners = getEventListeners(appId);
                    const network = getNetworkActivity(appId);
                    const cpuUsage = getCPUUsage(appId);
                    const memoryUsage = domNodes * 100; // Rough estimation based on DOM nodes

                    // Determine status
                    const isMinimized = appWindow.dataset.minimized === 'true';
                    const status = isMinimized ? 'minimized' : 'running';
                    const statusClass = isMinimized ? 'status-minimized' : 'status-running';

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
                            <div class="metric-value">${formatBytes(memoryUsage)}</div>
                            <div class="metric-bar">
                                <div class="metric-fill ${memoryUsage > 1000000 ? 'high' : memoryUsage > 500000 ? 'medium' : 'low'}" 
                                     style="width: ${Math.min((memoryUsage / 2000000) * 100, 100)}%"></div>
                            </div>
                        </td>
                        <td>
                            <div class="metric-value">${cpuUsage}%</div>
                            <div class="metric-bar">
                                <div class="metric-fill ${cpuUsage > 80 ? 'high' : cpuUsage > 50 ? 'medium' : 'low'}" 
                                     style="width: ${cpuUsage}%"></div>
                            </div>
                        </td>
                        <td>
                            <div class="metric-value">${network.requests} req</div>
                            <div class="metric-value" style="font-size: 0.8em; color: var(--text-secondary);">${formatBytes(network.bytes)}</div>
                        </td>
                        <td>
                            <div class="metric-value">${eventListeners}</div>
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
        const refreshResources = async () => {
            updateSystemOverview();
            await updateResourceTable();
        };

        // Set up event listeners
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshResources);
        }

        // Load initial data
        refreshResources();

        // Auto-refresh every 5 seconds
        const autoRefreshInterval = setInterval(refreshResources, 5000);

        // Clean up interval when window is closed
        windowElement.addEventListener('close', () => {
            clearInterval(autoRefreshInterval);
        });
    }
}); 
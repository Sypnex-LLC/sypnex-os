// Sypnex OS - Window Management Module
// Contains app window creation, resizing, dragging, and controls

// Extend SypnexOS class with window management methods
Object.assign(SypnexOS.prototype, {
    // Initialize global window management system
    initGlobalWindowManager() {
        if (this.globalWindowManagerInitialized) return;
        
        this.globalDragState = {
            isDragging: false,
            offset: { x: 0, y: 0 }
        };
        
        this.globalResizeState = {
            isResizing: false,
            direction: '',
            startX: 0,
            startY: 0,
            startWidth: 0,
            startHeight: 0,
            startLeft: 0,
            startTop: 0
        };
        
        // Single set of global listeners for ALL windows
        document.addEventListener('mousemove', this.handleGlobalMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleGlobalMouseUp.bind(this));
        
        this.globalWindowManagerInitialized = true;
    },
    
    handleGlobalMouseMove(e) {
        if (!this.activeWindow) return;
        const activeWindowElement = this.apps.get(this.activeWindow);
        if (!activeWindowElement) return;
        
        // Handle dragging
        if (this.globalDragState.isDragging) {
            const x = e.clientX - this.globalDragState.offset.x;
            const y = e.clientY - this.globalDragState.offset.y;
            
            activeWindowElement.style.left = `${x}px`;
            activeWindowElement.style.top = `${y}px`;
        }
        
        // Handle resizing
        if (this.globalResizeState.isResizing) {
            const deltaX = e.clientX - this.globalResizeState.startX;
            const deltaY = e.clientY - this.globalResizeState.startY;
            
            let newWidth = this.globalResizeState.startWidth;
            let newHeight = this.globalResizeState.startHeight;
            let newLeft = this.globalResizeState.startLeft;
            let newTop = this.globalResizeState.startTop;
            
            // Calculate new dimensions based on resize direction
            switch (this.globalResizeState.direction) {
                case 'se':
                    newWidth = Math.max(400, this.globalResizeState.startWidth + deltaX);
                    newHeight = Math.max(300, this.globalResizeState.startHeight + deltaY);
                    break;
                case 'sw':
                    newWidth = Math.max(400, this.globalResizeState.startWidth - deltaX);
                    newHeight = Math.max(300, this.globalResizeState.startHeight + deltaY);
                    newLeft = this.globalResizeState.startLeft + this.globalResizeState.startWidth - newWidth;
                    break;
                case 'ne':
                    newWidth = Math.max(400, this.globalResizeState.startWidth + deltaX);
                    newHeight = Math.max(300, this.globalResizeState.startHeight - deltaY);
                    newTop = this.globalResizeState.startTop + this.globalResizeState.startHeight - newHeight;
                    break;
                case 'nw':
                    newWidth = Math.max(400, this.globalResizeState.startWidth - deltaX);
                    newHeight = Math.max(300, this.globalResizeState.startHeight - deltaY);
                    newLeft = this.globalResizeState.startLeft + this.globalResizeState.startWidth - newWidth;
                    newTop = this.globalResizeState.startTop + this.globalResizeState.startHeight - newHeight;
                    break;
                case 's':
                    newHeight = Math.max(300, this.globalResizeState.startHeight + deltaY);
                    break;
                case 'n':
                    newHeight = Math.max(300, this.globalResizeState.startHeight - deltaY);
                    newTop = this.globalResizeState.startTop + this.globalResizeState.startHeight - newHeight;
                    break;
                case 'e':
                    newWidth = Math.max(400, this.globalResizeState.startWidth + deltaX);
                    break;
                case 'w':
                    newWidth = Math.max(400, this.globalResizeState.startWidth - deltaX);
                    newLeft = this.globalResizeState.startLeft + this.globalResizeState.startWidth - newWidth;
                    break;
            }
            
            // Apply new dimensions
            requestAnimationFrame(() => {
                activeWindowElement.style.width = `${newWidth}px`;
                activeWindowElement.style.height = `${newHeight}px`;
                activeWindowElement.style.left = `${newLeft}px`;
                activeWindowElement.style.top = `${newTop}px`;
            });
        }
    },
    
    handleGlobalMouseUp(e) {
        if (!this.activeWindow) return;
        
        // Handle drag end
        if (this.globalDragState.isDragging) {
            this.globalDragState.isDragging = false;
            this.saveWindowState(this.activeWindow);
        }
        
        // Handle resize end
        if (this.globalResizeState.isResizing) {
            this.globalResizeState.isResizing = false;
            this.globalResizeState.direction = '';
            
            const activeWindowElement = this.apps.get(this.activeWindow);
            if (activeWindowElement) {
                activeWindowElement.classList.remove('resizing');
                // Debounce the save operation
                clearTimeout(activeWindowElement.saveTimeout);
                activeWindowElement.saveTimeout = setTimeout(() => {
                    this.saveWindowState(this.activeWindow);
                }, 100);
            }
        }
    },
    async openApp(appId) {
        // Check if app is already open
        if (this.apps.has(appId)) {
            const windowElement = this.apps.get(appId);
            
            // Check if the window is minimized
            if (windowElement.dataset.minimized === 'true') {
                // Restore the minimized window
                this.restoreWindow(appId);
            } else {
                // Just focus the window if it's already visible
                this.focusWindow(appId);
            }
            return;
        }

        try {
            // First, get app metadata to determine the app type
            const appDataResponse = await fetch('/api/apps');
            if (appDataResponse.ok) {
                const allApps = await appDataResponse.json();
                const appData = allApps.find(app => app.id === appId);

                if (appData.type == "System_Service") {
                    this.showNotification(`app cannot be open directly`, 'success');
                    return;
                }
                
                if (appData && appData.type === 'user_app') {
                    // User app - fetch from user apps endpoint
                    const userAppResponse = await fetch(`/api/user-apps/${appId}`);
                    if (userAppResponse.ok) {
                        const userAppData = await userAppResponse.json();
                        const appHtml = userAppData.html;
                        
                        // Create and show the window
                        const windowElement = await this.createAppWindow(appId, appHtml);
                    } else {
                        throw new Error(`User app ${appId} not found`);
                    }
                } else {
                    // System app or plugin - fetch from apps endpoint
                    const response = await fetch(`/api/apps/${appId}`);
                    if (!response.ok) {
                        throw new Error(`App ${appId} not found`);
                    }
                    const appHtml = await response.text();
                    
                    // Create and show the window
                    const windowElement = await this.createAppWindow(appId, appHtml);
                }
            } else {
                // Fallback: try system apps first, then user apps
                const response = await fetch(`/api/apps/${appId}`);
                if (response.ok) {
                    const appHtml = await response.text();
                    
                    // Create and show the window
                    const windowElement = await this.createAppWindow(appId, appHtml);
                } else {
                    // Try user apps as fallback
                    const userAppResponse = await fetch(`/api/user-apps/${appId}`);
                    if (userAppResponse.ok) {
                        const userAppData = await userAppResponse.json();
                        const appHtml = userAppData.html;
                        
                        // Create and show the window
                        const windowElement = await this.createAppWindow(appId, appHtml);
                    } else {
                        throw new Error(`App ${appId} not found`);
                    }
                }
            }
            
        } catch (error) {
            console.error('Error opening app:', error);
            this.showNotification(`Failed to open ${appId}`, 'error');
        }
    },

    // Load and process the sandbox template
    async loadSandboxTemplate() {
        if (!this.sandboxTemplate) {
            try {
                const response = await fetch('/static/js/sandbox-template.js');
                this.sandboxTemplate = await response.text();
            } catch (error) {
                console.error('Error loading sandbox template:', error);
                throw new Error('Failed to load sandbox template');
            }
        }
        return this.sandboxTemplate;
    },

    async createAppWindow(appId, appHtml) {
        // Initialize global window manager if not already done
        this.initGlobalWindowManager();
        
        // 1. Fetch the scale value first (before creating the window)
        let scale = '100';
        try {
            const response = await fetch('/api/preferences/ui/app_scale');
            const data = await response.json();
            scale = data.value || '100';
        } catch (e) {
            scale = '100';
        }

        // 2. Create the window element
        const template = document.getElementById('app-window-template');
        const windowElement = template.content.cloneNode(true).querySelector('.app-window');
        windowElement.dataset.appId = appId;

        // 3. Apply the scale class BEFORE appending to DOM
        windowElement.classList.remove('scale-75', 'scale-80', 'scale-85', 'scale-90', 'scale-95',
            'scale-100', 'scale-105', 'scale-110', 'scale-115', 'scale-120',
            'scale-125', 'scale-130', 'scale-135', 'scale-140', 'scale-145', 'scale-150');
        windowElement.classList.add(`scale-${scale}`);

        // Load saved window state or use defaults
        const savedState = await this.loadWindowState(appId);
        if (savedState) {
            windowElement.style.left = `${savedState.x}px`;
            windowElement.style.top = `${savedState.y}px`;
            windowElement.style.width = `${savedState.width}px`;
            windowElement.style.height = `${savedState.height}px`;
            
            if (savedState.maximized) {
                windowElement.classList.add('maximized');
                // Keep resize handles visible even when maximized
            }
        } else {
            // Use smart default positioning - center the window with reasonable size
            const { x, y, width, height } = this.calculateDefaultWindowPosition(this.windowCounter);
            
            windowElement.style.left = `${x}px`;
            windowElement.style.top = `${y}px`;
            windowElement.style.width = `${width}px`;
            windowElement.style.height = `${height}px`;
        }

        // Set window title and icon
        if (appId.startsWith('settings-')) {
            // Skip app data fetching for settings windows - they don't exist in backend
            windowElement.querySelector('.app-icon').className = 'app-icon fas fa-cog';
            windowElement.querySelector('.app-name').textContent = 'Settings';
        } else {
            this.getAppData(appId).then(appData => {
                windowElement.querySelector('.app-icon').className = `app-icon ${appData.icon}`;
                windowElement.querySelector('.app-name').textContent = appData.name;
            });
        }

        // Check if app has settings and show/hide settings button (skip for settings windows)
        if (!appId.startsWith('settings-')) {
            this.checkAppSettings(appId, windowElement);
            this.checkAppReload(appId, windowElement);
            this.checkAppUpdate(appId, windowElement);
        }

        // Extract script content from user apps before setting innerHTML
        let scripts = [];
        if (appHtml.includes('<script>')) {
            // Extract all script tags and their content
            const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
            let match;
            while ((match = scriptRegex.exec(appHtml)) !== null) {
                scripts.push(match[1]);
            }
            // Remove script tags from HTML
            appHtml = appHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        }

        // Load app content
        windowElement.querySelector('.app-window-content').innerHTML = appHtml;

        // Execute scripts after HTML is inserted
        scripts.forEach(async (scriptContent) => {
            try {
                // Detect function names from the script content before execution
                const functionNames = [];
                const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
                let match;
                while ((match = functionRegex.exec(scriptContent)) !== null) {
                    functionNames.push(match[1]);
                }
                
                // Load SypnexAPI content from external file
                const sypnexAPIContent = await this.loadSypnexAPI();
                
                if (!sypnexAPIContent) {
                    console.error('Failed to load SypnexAPI - app cannot run');
                    this.showNotification('Failed to load SypnexAPI - app cannot run', 'error');
                    return;
                }
                
                // Load and process sandbox template with variable substitution
                const sandboxTemplate = await this.loadSandboxTemplate();
                
                // PRE-PROCESS: Automatically replace document.getElementById calls with scoped version
                // This allows developers to use vanilla JavaScript without knowing about scoping
                const processedScriptContent = scriptContent
                    .replace(/document\.getElementById\s*\(/g, 'getElementById(')
                    .replace(/document\.querySelector\s*\(/g, 'querySelector(')
                    .replace(/document\.querySelectorAll\s*\(/g, 'querySelectorAll(')
                    .replace(/document\.head\.appendChild\s*\(/g, 'appendToHead(')
                    .replace(/document\.body\.appendChild\s*\(/g, 'appendToBody(')
                    .replace(/document\.getElementsByClassName\s*\(/g, 'getElementsByClassName(')
                    .replace(/document\.getElementsByTagName\s*\(/g, 'getElementsByTagName(')
                    .replace(/document\.getElementsByName\s*\(/g, 'getElementsByName(')
                    // TEMPORARILY DISABLED: DOM navigation scoping - causes cross-app contamination
                    // TODO: Implement centralized tracking pattern like timer/event tracking
                    // .replace(/(\w+)\.closest\s*\(/g, '$1.scopedClosest(')
                    // .replace(/(\w+)\.parentNode\b/g, '$1.scopedParentNode')
                    // .replace(/(\w+)\.parentElement\b/g, '$1.scopedParentElement')
                    .replace(/localStorage\.setItem\s*\(/g, 'setAppStorage(')
                    .replace(/localStorage\.getItem\s*\(/g, 'getAppStorage(')
                    .replace(/localStorage\.removeItem\s*\(/g, 'removeAppStorage(')
                    .replace(/localStorage\.clear\s*\(\)/g, 'clearAppStorage()')
                    .replace(/sessionStorage\.setItem\s*\(/g, 'setAppSessionStorage(')
                    .replace(/sessionStorage\.getItem\s*\(/g, 'getAppSessionStorage(')
                    .replace(/sessionStorage\.removeItem\s*\(/g, 'removeAppSessionStorage(')
                    .replace(/sessionStorage\.clear\s*\(\)/g, 'clearAppSessionStorage()')
                    .replace(/window\.location\.href\s*=\s*([^;=]+);/g, 'setAppLocation($1);')
                    .replace(/document\.location\s*=\s*([^;=]+);/g, 'setAppLocation($1);')
                    .replace(/window\.location\.reload\s*\(/g, 'reloadApp(')
                    .replace(/window\.history\.pushState\s*\(/g, 'appPushState(')
                    .replace(/window\.history\.replaceState\s*\(/g, 'appReplaceState(');
                
                const sandboxedScript = sandboxTemplate
                    .replace(/\$\{appId\}/g, appId)
                    .replace(/\$\{sypnexAPIContent\}/g, sypnexAPIContent)
                    .replace(/\$\{scriptContent\}/g, processedScriptContent)
                    .replace(/\$\{functionNames\}/g, JSON.stringify(functionNames));
                
                // Create a new script element and execute it
                const script = document.createElement('script');
                script.textContent = sandboxedScript;
                document.head.appendChild(script);
                // Remove the script element after execution
                document.head.removeChild(script);
            } catch (error) {
                console.error('Error executing user app script:', error);
            }
        });
        
        // Add resize handles
        this.addResizeHandles(windowElement);
        
        // Setup window controls
        this.setupWindowControls(windowElement, appId);
        
        // Setup app-specific functionality
        this.setupAppFunctionality(appId, windowElement);
        
        // Make window draggable
        this.makeWindowDraggable(windowElement);
        
        // Add to DOM and track
        document.getElementById('app-windows').appendChild(windowElement);
        this.apps.set(appId, windowElement);
        this.windowCounter++;
        
        // Focus the window
        this.focusWindow(appId);
        
        return windowElement;
    },

    addResizeHandles(windowElement) {
        const handles = [
            { class: 'nw', position: 'top-left' },
            { class: 'ne', position: 'top-right' },
            { class: 'sw', position: 'bottom-left' },
            { class: 'se', position: 'bottom-right' },
            { class: 'n', position: 'top' },
            { class: 's', position: 'bottom' },
            { class: 'e', position: 'right' },
            { class: 'w', position: 'left' }
        ];

        handles.forEach(handle => {
            const handleElement = document.createElement('div');
            handleElement.className = `resize-handle ${handle.class}`;
            handleElement.dataset.resizeDirection = handle.class;
            windowElement.appendChild(handleElement);
        });

        // Setup resize functionality
        this.setupWindowResize(windowElement);
    },

    setupWindowResize(windowElement) {
        const handleMouseDown = (e) => {
            const handle = e.target;
            if (!handle.classList.contains('resize-handle')) return;

            // Focus the window first
            this.focusWindow(windowElement.dataset.appId);
            
            // If window is maximized, un-maximize it when user starts resizing
            if (windowElement.classList.contains('maximized')) {
                windowElement.classList.remove('maximized');
                this.saveWindowState(windowElement.dataset.appId);
            }

            // Start global resize state
            this.globalResizeState.isResizing = true;
            this.globalResizeState.direction = handle.dataset.resizeDirection;
            this.globalResizeState.startX = e.clientX;
            this.globalResizeState.startY = e.clientY;
            this.globalResizeState.startWidth = windowElement.offsetWidth;
            this.globalResizeState.startHeight = windowElement.offsetHeight;
            this.globalResizeState.startLeft = windowElement.offsetLeft;
            this.globalResizeState.startTop = windowElement.offsetTop;

            windowElement.classList.add('resizing');

            e.preventDefault();
            e.stopPropagation();
        };

        // Add event listener to the window element
        windowElement.addEventListener('mousedown', handleMouseDown);
        
        // Store cleanup function (though we don't need to clean up global listeners anymore)
        windowElement.cleanupResize = () => {
            windowElement.removeEventListener('mousedown', handleMouseDown);
        };
    },

    setupWindowControls(windowElement, appId) {
        const closeBtn = windowElement.querySelector('.app-close');
        const minimizeBtn = windowElement.querySelector('.app-minimize');
        const maximizeBtn = windowElement.querySelector('.app-maximize');
        const settingsBtn = windowElement.querySelector('.app-settings');
        const reloadBtn = windowElement.querySelector('.app-reload');
        const updateBtn = windowElement.querySelector('.app-update');

        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.focusWindow(appId);  // Focus first
            this.closeApp(appId);     // Then close
        });

        minimizeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            this.focusWindow(appId);  // Focus first
            if (windowElement.dataset.minimized === 'true') {
                this.restoreWindow(appId);
                minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
            } else {
                await this.minimizeWindow(appId);
                minimizeBtn.innerHTML = '<i class="fas fa-window-restore"></i>';
            }
        });

        maximizeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            this.focusWindow(appId);  // Focus first
            await this.maximizeWindow(appId);
        });

        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.focusWindow(appId);  // Focus first
            this.openAppSettings(appId);
        });

        reloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.focusWindow(appId);  // Focus first
            this.reloadApp(appId);
        });

        updateBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            this.focusWindow(appId);  // Focus first
            try {
                // Get the cached app data with download URL
                const appData = this.getLatestAppData(appId);
                if (!appData || !appData.download_url) {
                    this.showNotification('Update URL not available', 'error');
                    return;
                }
                
                // Show loading state
                updateBtn.style.opacity = '0.5';
                updateBtn.style.pointerEvents = 'none';
                
                const response = await fetch(`/api/user-apps/update/${appId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        download_url: appData.download_url
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    this.showNotification(`${result.app_name} updated successfully!`, 'success');
                    
                    // Hide update button since app is now up to date
                    updateBtn.style.display = 'none';
                    
                    // Refresh the app registry to recognize the new version
                    await fetch('/api/user-apps/refresh', { method: 'POST' });
                    
                    // Refresh the app cache to get latest versions
                    await this.refreshLatestVersionsCache();
                    
                    // Reload the app to apply the update
                    setTimeout(() => {
                        this.reloadApp(appId);
                    }, 500);
                } else {
                    this.showNotification(`Update failed: ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('Update error:', error);
                this.showNotification(`Update failed: ${error.message}`, 'error');
            } finally {
                // Restore button state
                updateBtn.style.opacity = '';
                updateBtn.style.pointerEvents = '';
            }
        });
    },

    async checkAppSettings(appId, windowElement) {
        // Skip for settings windows - they don't have app metadata
        if (appId.startsWith('settings-')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/app-metadata/${appId}`);
            if (response.ok) {
                const appData = await response.json();
                const settingsBtn = windowElement.querySelector('.app-settings');
                
                // Show settings button if app has settings defined
                if (appData.settings && appData.settings.length > 0) {
                    settingsBtn.style.display = 'flex';
                } else {
                    settingsBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error checking app settings:', error);
        }
    },

    async checkAppReload(appId, windowElement) {
        // Skip for settings windows - they don't have app metadata
        if (appId.startsWith('settings-')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/app-metadata/${appId}`);
            if (response.ok) {
                const appData = await response.json();
                const reloadBtn = windowElement.querySelector('.app-reload');
                
                // Show reload button for user apps only AND when developer mode is enabled
                const isDeveloperMode = await this.isDeveloperModeEnabled();
                if (appData.type === 'user_app' && isDeveloperMode) {
                    reloadBtn.style.display = 'flex';
                } else {
                    reloadBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error checking app reload capability:', error);
        }
    },

    async checkAppUpdate(appId, windowElement) {
        // Skip for settings windows and non-user apps
        if (appId.startsWith('settings-')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/app-metadata/${appId}`);
            if (response.ok) {
                const appData = await response.json();
                const updateBtn = windowElement.querySelector('.app-update');
                
                // Only check updates for user apps
                if (appData.type === 'user_app') {
                    // Get current app version from metadata
                    const currentVersion = appData.version || appData.metadata?.version;
                    
                    if (currentVersion) {
                        // Get latest version from cached data
                        const latestVersion = this.getLatestVersion(appId);
                        
                        if (latestVersion && currentVersion !== latestVersion) {
                            // Update available - show the red download icon
                            updateBtn.style.display = 'flex';
                            updateBtn.title = `Update available: v${latestVersion} (current: v${currentVersion})`;
                        } else {
                            updateBtn.style.display = 'none';
                        }
                    } else {
                        // No version info, hide update button
                        updateBtn.style.display = 'none';
                    }
                } else {
                    // Not a user app, hide update button
                    updateBtn.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error checking app update:', error);
        }
    },
    
    async isDeveloperModeEnabled() {
        try {
            const response = await fetch('/api/preferences/system/developer_mode');
            const data = await response.json();
            return data.value === 'true';
        } catch (error) {
            console.error('Error checking developer mode:', error);
            return false; // Default to false if error
        }
    },
    
    async updateDeveloperModeForAllWindows() {
        // Update reload button visibility for all open windows
        const isDeveloperMode = await this.isDeveloperModeEnabled();
        
        for (const [appId, windowElement] of this.apps) {
            if (!appId.startsWith('settings-')) {
                const reloadBtn = windowElement.querySelector('.app-reload');
                if (reloadBtn) {
                    // Only show for user apps when developer mode is enabled
                    const shouldShow = isDeveloperMode && windowElement.dataset.appType === 'user_app';
                    reloadBtn.style.display = shouldShow ? 'flex' : 'none';
                }
            }
        }
    },

    async updateUpdateButtonsForAllWindows() {
        // Update update button visibility for all open windows
        for (const [appId, windowElement] of this.apps) {
            if (!appId.startsWith('settings-')) {
                await this.checkAppUpdate(appId, windowElement);
            }
        }
    },

    async openAppSettings(appId) {
        // Unique settings window ID
        const settingsAppId = `settings-${appId}`;
        // If already open, focus it
        if (this.apps.has(settingsAppId)) {
            this.focusWindow(settingsAppId);
            return;
        }
        // Fetch app metadata for settings structure
        const appData = await fetch(`/api/app-metadata/${appId}`).then(res => res.json());
        // Fetch current settings from database
        const currentSettings = await fetch(`/api/app-settings/${appId}`).then(res => res.json()).catch(() => ({ settings: {} }));
        
        // Build settings form HTML
        let formHtml = '';
        if (appData.settings && appData.settings.length > 0) {
            appData.settings.forEach(setting => {
                const fieldId = `setting-${setting.key}`;
                const label = setting.label || setting.key;
                // Use database value if available, otherwise fall back to default from .app file
                const currentValue = currentSettings.settings && currentSettings.settings[setting.key] !== undefined 
                    ? currentSettings.settings[setting.key] 
                    : (setting.value !== undefined ? setting.value : '');
                formHtml += `
                    <div class="form-group">
                        <label for="${fieldId}">${label}</label>
                        <input type="text" id="${fieldId}" name="${setting.key}" value="${currentValue}" class="form-control" />
                    </div>
                `;
            });
        } else {
            formHtml = '<div style="text-align:center;color:var(--text-secondary);padding:20px;">No settings available for this app.</div>';
        }
        // Add save/cancel buttons
        formHtml += `
            <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                <button class="app-btn secondary settings-cancel">Cancel</button>
                <button class="app-btn primary settings-save">Save</button>
            </div>
        `;
        // Build window content
        const windowContent = `
            <form id="settings-form-${settingsAppId}">
                ${formHtml}
            </form>
        `;
        // Create the app window using the standard template
        const windowElement = await this.createAppWindow(settingsAppId, windowContent);
        // Hide the minimize button for settings window
        const minimizeBtn = windowElement.querySelector('.app-minimize');
        if (minimizeBtn) minimizeBtn.style.display = 'none';
        // Add event listeners for save/cancel
        const form = windowElement.querySelector('form');
        form.querySelector('.settings-cancel').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeApp(settingsAppId);
        });
        form.querySelector('.settings-save').addEventListener('click', async (e) => {
            e.preventDefault();
            const inputs = form.querySelectorAll('input');
            let success = true;
            for (const input of inputs) {
                const key = input.name;
                const value = input.value;
                // Save each setting via API
                const res = await fetch(`/api/app-settings/${appId}/${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value })
                });
                if (!res.ok) success = false;
            }
            if (success) {
                this.closeApp(settingsAppId);
                this.showNotification('Settings saved! Reloading app...', 'success');
                
                // Auto-reload the app to apply new settings
                setTimeout(() => {
                    this.reloadApp(appId);
                }, 500); // Small delay to ensure settings are saved
            } else {
                this.showNotification('Failed to save some settings.', 'error');
            }
        });
    },

    initModalEvents() {
        // Modal elements
        const modal = document.getElementById('app-settings-modal');
        const closeBtn = document.getElementById('app-settings-close');
        const cancelBtn = document.getElementById('app-settings-cancel');
        const saveBtn = document.getElementById('app-settings-save');

        // Close/cancel logic
        [closeBtn, cancelBtn].forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                modal.style.display = 'none';
                modal.classList.remove('modal-open');
            });
        });

        // Save logic
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const appId = modal.dataset.appId;
            const form = document.getElementById('app-settings-form');
            const inputs = form.querySelectorAll('input');
            let success = true;
            for (const input of inputs) {
                const key = input.name;
                const value = input.value;
                // Save each setting via API
                const res = await fetch(`/api/app-settings/${appId}/${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value })
                });
                if (!res.ok) success = false;
            }
            if (success) {
                modal.style.display = 'none';
                modal.classList.remove('modal-open');
                this.showNotification('Settings saved! Reloading app...', 'success');
                
                // Auto-reload the app to apply new settings
                setTimeout(() => {
                    this.reloadApp(appId);
                }, 500); // Small delay to ensure settings are saved
            } else {
                this.showNotification('Failed to save some settings.', 'error');
            }
        });
    },

    setupAppFunctionality(appId, windowElement) {
        // Initialize built-in app tracking for all system apps
        this.initBuiltinAppTracking(appId);
        
        switch (appId) {
            case 'terminal':
                this.setupTerminalCore(windowElement);
                break;
            case 'user-app-manager':
                this.setupUserAppManager(windowElement);
                break;
            case 'virtual-file-system':
                this.setupVirtualFileSystem(windowElement);
                break;
            case 'resource-manager':
                this.setupResourceManager(windowElement);
                break;
            case 'system-settings':
                this.setupSystemSettings(windowElement);
                break;
        }
    },

    makeWindowDraggable(windowElement) {
        const header = windowElement.querySelector('.app-window-header');
        
        header.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on resize handles or window controls
            if (e.target.classList.contains('resize-handle') || 
                e.target.closest('.app-window-controls') ||
                windowElement.classList.contains('resizing')) return;
            
            // Focus the window first
            this.focusWindow(windowElement.dataset.appId);
            
            // Start global drag state
            const rect = windowElement.getBoundingClientRect();
            this.globalDragState.isDragging = true;
            this.globalDragState.offset.x = e.clientX - rect.left;
            this.globalDragState.offset.y = e.clientY - rect.top;
            
            e.preventDefault();
        });
    },

    focusWindow(appId) {
        // Remove focus from all windows and taskbar apps
        document.querySelectorAll('.app-window').forEach(window => {
            window.style.zIndex = '200';
        });
        
        // Update taskbar states
        this.apps.forEach((windowElement, id) => {
            this.updateTaskbarAppState(id, false);
        });
        
        // Focus the target window
        const windowElement = this.apps.get(appId);
        if (windowElement) {
            windowElement.style.zIndex = '201';
            this.activeWindow = appId;
            this.updateTaskbarAppState(appId, true);
        }
    },

    closeApp(appId) {
        const windowElement = this.apps.get(appId);
        if (windowElement) {
            // Save window state before closing
            this.saveWindowState(appId);
            
            // Clean up timers and event listeners automatically
            if (window.sypnexApps && window.sypnexApps[appId] && window.sypnexApps[appId].cleanup) {
                const cleanupResult = window.sypnexApps[appId].cleanup();
                const totalCleaned = cleanupResult.timers + cleanupResult.listeners;
                if (totalCleaned > 0) {
                }
            }
            
            // Clean up any lingering OS-level notifications
            const allNotifications = document.querySelectorAll('.notification');
            if (allNotifications.length > 0) {
                allNotifications.forEach(notification => notification.remove());
            }
            
            // Clean up WebSocket connection if app has one
            if (window.sypnexApps && window.sypnexApps[appId] && window.sypnexApps[appId].sypnexAPI) {
                const sypnexAPI = window.sypnexApps[appId].sypnexAPI;
                if (sypnexAPI.isSocketConnected()) {
                    sypnexAPI.disconnectSocket();
                }
                // Clean up the app reference
                delete window.sypnexApps[appId];
            }
            
            // Clean up resize event listeners
            if (windowElement.cleanupResize) {
                windowElement.cleanupResize();
            }
            
            // Remove from taskbar if minimized
            this.removeFromTaskbar(appId);
            
            windowElement.remove();
            this.apps.delete(appId);
        }
    },

    async reloadApp(appId) {
        try {
            // Show loading state
            const windowElement = this.apps.get(appId);
            if (!windowElement) return;
            
            const reloadBtn = windowElement.querySelector('.app-reload');
            reloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            reloadBtn.disabled = true;

            // Close the app properly (this handles all cleanup)
            this.closeApp(appId);
            
            // Small delay to ensure cleanup is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Reopen the app fresh
            await this.openApp(appId);
            
            this.showNotification(`App "${appId}" reloaded successfully`, 'success');
        } catch (error) {
            console.error('Error reloading app:', error);
            this.showNotification(`Failed to reload app: ${error.message}`, 'error');
        }
    },

    async minimizeWindow(appId) {
        const windowElement = this.apps.get(appId);
        if (windowElement) {
            windowElement.style.display = 'none';
            windowElement.dataset.minimized = 'true';
            // Add to taskbar
            await this.addToTaskbar(appId);
            // Save state when minimizing
            this.saveWindowState(appId);
        }
    },

    restoreWindow(appId) {
        const windowElement = this.apps.get(appId);
        if (windowElement) {
            windowElement.style.display = 'block';
            windowElement.dataset.minimized = 'false';
            // Remove from taskbar
            this.removeFromTaskbar(appId);
            // Reset the minimize button icon
            const minimizeBtn = windowElement.querySelector('.app-minimize');
            if (minimizeBtn) {
                minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
            }
            this.focusWindow(appId);
            // Save state when restoring
            this.saveWindowState(appId);
        }
    },

    async minimizeAllApps() {
        // Get all currently open apps that are not minimized
        const openApps = [];
        this.apps.forEach((windowElement, appId) => {
            if (windowElement.dataset.minimized !== 'true') {
                openApps.push(appId);
            }
        });

        // Minimize each open app
        for (const appId of openApps) {
            await this.minimizeWindow(appId);
        }

        // Show notification if any apps were minimized
        if (openApps.length > 0) {
            this.showNotification(`Minimized ${openApps.length} app${openApps.length > 1 ? 's' : ''}`, 'info');
        }
    },

    async maximizeWindow(appId) {
        const windowElement = this.apps.get(appId);
        if (windowElement) {
            if (windowElement.classList.contains('maximized')) {
                // Restore window - load saved state
                const savedState = await this.loadWindowState(appId);
                windowElement.classList.remove('maximized');
                
                if (savedState && !savedState.maximized) {
                    // Use saved position and size
                    windowElement.style.width = `${savedState.width}px`;
                    windowElement.style.height = `${savedState.height}px`;
                    windowElement.style.left = `${savedState.x}px`;
                    windowElement.style.top = `${savedState.y}px`;
                } else {
                    // Fallback to smart default position (same logic as new windows)
                    const defaultPos = this.calculateDefaultWindowPosition();
                    
                    windowElement.style.width = `${defaultPos.width}px`;
                    windowElement.style.height = `${defaultPos.height}px`;
                    windowElement.style.left = `${defaultPos.x}px`;
                    windowElement.style.top = `${defaultPos.y}px`;
                }
                
                // Resize handles are always visible, no need to show them
            } else {
                // Save current state before maximizing
                await this.saveWindowState(appId);
                
                // Get current scale to adjust maximize dimensions
                const currentScale = await this.getCurrentAppScale();
                const scaleFactor = currentScale / 100;
                
                // Calculate scaled maximize dimensions
                const scaledWidth = Math.floor((window.innerWidth - 40) / scaleFactor);
                const scaledHeight = Math.floor((window.innerHeight - 80) / scaleFactor);
                
                // Maximize window with scaled dimensions
                windowElement.classList.add('maximized');
                windowElement.style.width = `${scaledWidth}px`;
                windowElement.style.height = `${scaledHeight}px`;
                windowElement.style.left = '20px';
                windowElement.style.top = '20px';
                
                // Keep resize handles visible even when maximized
            }
            // Save state when maximizing/restoring
            this.saveWindowState(appId);
        }
    },

    async getAppData(appId) {
        try {
            // Try to get app data from the backend
            const response = await fetch('/api/apps');
            const allApps = await response.json();
            const appData = allApps.find(app => app.id === appId);
            
            if (appData) {
                return {
                    name: appData.name,
                    icon: appData.icon
                };
            }
        } catch (error) {
            console.error('Error fetching app data:', error);
        }
        
        // Fallback to hardcoded data for core apps
        const fallbackData = {
            calculator: { name: 'Calculator', icon: 'fas fa-calculator' },
            notepad: { name: 'Notepad', icon: 'fas fa-sticky-note' },
            base64: { name: 'Base64 Encoder', icon: 'fas fa-code' },
            hash: { name: 'Hash Generator', icon: 'fas fa-fingerprint' },
            clock: { name: 'Clock', icon: 'fas fa-clock' },
            tts: { name: 'Text to Speech', icon: 'fas fa-volume-up' },
            'user-app-manager': { name: 'User App Manager', icon: 'fas fa-user-cog' }
        };
        
        return fallbackData[appId] || { name: 'Unknown App', icon: 'fas fa-question' };
    },

    async loadWindowState(appId) {
        try {
            const response = await fetch(`/api/window-state/${appId}`);
            const data = await response.json();
            return data.success ? data.state : null;
        } catch (error) {
            console.error('Error loading window state:', error);
            return null;
        }
    },

    async saveWindowState(appId) {
        const windowElement = this.apps.get(appId);
        if (!windowElement) return;

        try {
            const rect = windowElement.getBoundingClientRect();
            const isMaximized = windowElement.classList.contains('maximized');
            
            const state = {
                x: parseInt(windowElement.style.left) || rect.left,
                y: parseInt(windowElement.style.top) || rect.top,
                width: parseInt(windowElement.style.width) || rect.width,
                height: parseInt(windowElement.style.height) || rect.height,
                maximized: isMaximized
            };

            const response = await fetch(`/api/window-state/${appId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
            
            const data = await response.json();
            if (!data.success) {
                console.error('Failed to save window state for', appId);
            }
        } catch (error) {
            console.error('Error saving window state:', error);
        }
    },
    
    async getCurrentAppScale() {
        try {
            const response = await fetch('/api/preferences/ui/app_scale');
            const data = await response.json();
            return parseInt(data.value) || 100;
        } catch (error) {
            console.error('Error getting current app scale:', error);
            return 100;
        }
    },
    
    async applyAppScaling(windowElement) {
        try {
            // Get the current app scale preference
            const response = await fetch('/api/preferences/ui/app_scale');
            const data = await response.json();
            const scale = data.value || '100';
            
            // Remove any existing scale classes
            windowElement.classList.remove('scale-75', 'scale-80', 'scale-85', 'scale-90', 'scale-95', 
                                         'scale-100', 'scale-105', 'scale-110', 'scale-115', 'scale-120',
                                         'scale-125', 'scale-130', 'scale-135', 'scale-140', 'scale-145', 'scale-150');
            
            // Apply the current scale class
            windowElement.classList.add(`scale-${scale}`);
            
        } catch (error) {
            console.error('Error applying app scaling:', error);
            // Default to 100% scale if there's an error
            windowElement.classList.add('scale-100');
        }
    },
    
    async updateAllAppScaling() {
        try {
            // Get current scale
            const currentScale = await this.getCurrentAppScale();
            const expectedScaleClass = `scale-${currentScale}`;
            
            // Get all app windows
            const appWindows = document.querySelectorAll('.app-window');
            
            // Only update windows that don't already have the correct scale
            for (const windowElement of appWindows) {
                if (!windowElement.classList.contains(expectedScaleClass)) {
                    await this.applyAppScaling(windowElement);
                }
            }
        } catch (error) {
            console.error('Error updating app scaling:', error);
        }
    },

    // Helper function to calculate smart default window positioning
    calculateDefaultWindowPosition(windowCounter = 0) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Default to a reasonable size (60% of screen width/height, min 600x500, max 1200x800)
        const defaultWidth = Math.min(1200, Math.max(600, Math.floor(screenWidth * 0.6)));
        const defaultHeight = Math.min(800, Math.max(500, Math.floor(screenHeight * 0.6)));
        
        // Center the window with slight offset for multiple windows
        const offset = windowCounter * 30;
        const centerX = Math.floor((screenWidth - defaultWidth) / 2) + offset;
        const centerY = Math.floor((screenHeight - defaultHeight) / 2) + offset;
        
        // Ensure window doesn't go off-screen
        const finalX = Math.min(centerX, screenWidth - defaultWidth - 20);
        const finalY = Math.min(centerY, screenHeight - defaultHeight - 20);
        
        return {
            x: Math.max(20, finalX),
            y: Math.max(20, finalY),
            width: defaultWidth,
            height: defaultHeight
        };
    },
});
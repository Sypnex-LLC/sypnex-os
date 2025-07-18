// Sypnex OS - Dashboard & Welcome Screen Module
// Contains dashboard functionality and welcome screen management

// Extend SypnexOS class with dashboard methods
Object.assign(SypnexOS.prototype, {
    showDashboard() {
        const overlay = document.getElementById('dashboard-overlay');
        
        if (!overlay) {
            console.error('Dashboard overlay not found!');
            return;
        }
        
        overlay.classList.remove('dashboard-hidden');
        overlay.classList.add('dashboard-visible');
        
        // Force a repaint
        overlay.offsetHeight;
        
        // Populate dashboard with apps
        this.populateDashboard();
        
        // Setup category filtering
        this.setupDashboardCategories();
    },

    hideDashboard() {
        const overlay = document.getElementById('dashboard-overlay');
        
        if (!overlay) {
            console.error('Dashboard overlay not found!');
            return;
        }
        
        overlay.classList.remove('dashboard-visible');
        overlay.classList.add('dashboard-hidden');
    },

    async populateDashboard(category = 'all') {
        const appGrid = document.getElementById('dashboard-app-grid');
        if (!appGrid) return;

        // Clear existing tiles
        appGrid.innerHTML = '';

        try {
            // Fetch all available apps using the new endpoint
            const response = await fetch('/api/apps');
            const allApps = await response.json();
            let filteredApps = allApps;

            // Filter by category if needed
            if (category === 'system') {
                filteredApps = allApps.filter(app => 
                    app.type === 'system' || app.type === 'builtin'
                );
            } else if (category === 'user') {
                filteredApps = allApps.filter(app => 
                    app.type === 'user_app'
                );
            }

            // Create app tiles
            filteredApps.forEach(app => {
                const appTile = document.createElement('div');
                appTile.className = 'dashboard-app-tile';
                appTile.dataset.app = app.id;
                appTile.dataset.category = app.type || 'system';
                
                let appType = 'System';
                if (app.type === 'user_app') {
                    appType = 'User App';
                } else if (app.type === 'builtin') {
                    appType = 'System';
                }else if(app.type == 'System_Service')
                {
                    appType = "System Service";
                }
                
                appTile.innerHTML = `
                    <i class="${app.icon}"></i>
                    <span>${app.name}</span>
                    <div class="app-type">${appType}</div>
                `;
                
                appTile.addEventListener('click', () => {
                    this.openApp(app.id);
                    this.hideDashboard();
                });
                
                appGrid.appendChild(appTile);
            });

        } catch (error) {
            console.error('Error populating dashboard:', error);
            appGrid.innerHTML = '<div style="text-align: center; color: #888; padding: 40px;">Error loading apps</div>';
        }
    },

    setupDashboardCategories() {
        const categoryButtons = document.querySelectorAll('.category-btn');
        const appGrid = document.getElementById('dashboard-app-grid');

        // Remove existing event listeners by cloning and replacing buttons
        categoryButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
        });

        // Add fresh event listeners
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter apps
                const category = btn.dataset.category;
                this.populateDashboard(category);
            });
        });

        // Close dashboard when clicking outside (only add once)
        const overlay = document.getElementById('dashboard-overlay');
        if (overlay && !overlay.hasAttribute('data-dashboard-initialized')) {
            overlay.setAttribute('data-dashboard-initialized', 'true');
            overlay.addEventListener('click', (e) => {
                if (e.target.id === 'dashboard-overlay') {
                    this.hideDashboard();
                }
            });
        }
    }
}); 
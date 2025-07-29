// Sypnex OS - Dashboard & Welcome Screen Module
// Contains dashboard functionality and welcome screen management

// Extend SypnexOS class with dashboard methods
Object.assign(SypnexOS.prototype, {
    async showDashboard() {
        // Prevent concurrent execution
        if (this.isDashboardLoading) {
            console.log('showDashboard: Already loading, skipping');
            return;
        }
        this.isDashboardLoading = true;

        try {
            const overlay = document.getElementById('dashboard-overlay');
            
            if (!overlay) {
                console.error('Dashboard overlay not found!');
                return;
            }
            
            // Get the last selected category from preferences FIRST
            const lastCategory = await this.getDashboardCategory();
            
            // Update UI to show the correct active button BEFORE showing dashboard
            this.setActiveCategoryButton(lastCategory);
            
            overlay.classList.remove('dashboard-hidden');
            overlay.classList.add('dashboard-visible');
            
            // Force a repaint
            overlay.offsetHeight;
            
            // Populate dashboard with apps using the saved category
            this.populateDashboard(lastCategory);
            
            // Setup category filtering
            this.setupDashboardCategories();
        } finally {
            this.isDashboardLoading = false;
        }
    },

    hideDashboard() {
        // Prevent hiding while dashboard is still loading
        if (this.isDashboardLoading) {
            console.log('hideDashboard: Dashboard is loading, skipping hide');
            return;
        }

        const overlay = document.getElementById('dashboard-overlay');
        
        if (!overlay) {
            console.error('Dashboard overlay not found!');
            return;
        }
        
        overlay.classList.remove('dashboard-visible');
        overlay.classList.add('dashboard-hidden');
    },

    async populateDashboard(category = 'all') {
        // Prevent concurrent execution
        if (this.isPopulatingDashboard) {
            console.log('populateDashboard: Already populating, skipping');
            return;
        }
        this.isPopulatingDashboard = true;

        try {
            const appGrid = document.getElementById('dashboard-app-grid');
            if (!appGrid) return;

            // Clear existing tiles
            appGrid.innerHTML = '';

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
            const appGrid = document.getElementById('dashboard-app-grid');
            if (appGrid) {
                appGrid.innerHTML = '<div style="text-align: center; color: #888; padding: 40px;">Error loading apps</div>';
            }
        } finally {
            this.isPopulatingDashboard = false;
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
            btn.addEventListener('click', async () => {
                // Update active button
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Get the category and save it to preferences
                const category = btn.dataset.category;
                await this.saveDashboardCategory(category);

                // Filter apps
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
    },

    async getDashboardCategory() {
        try {
            const response = await fetch('/api/preferences/ui/dashboard_category');
            if (response.ok) {
                const data = await response.json();
                return data.value || 'all'; // Default to 'all' if no preference set
            }
        } catch (error) {
            console.error('Error getting dashboard category preference:', error);
        }
        return 'all'; // Fallback to 'all'
    },

    async saveDashboardCategory(category) {
        try {
            const response = await fetch('/api/preferences/ui/dashboard_category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: category
                })
            });
            
            if (!response.ok) {
                console.error('Failed to save dashboard category preference');
            }
        } catch (error) {
            console.error('Error saving dashboard category:', error);
        }
    },

    setActiveCategoryButton(category) {
        // Remove active class from all buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set active class on the correct button
        const activeButton = document.querySelector(`[data-category="${category}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
}); 
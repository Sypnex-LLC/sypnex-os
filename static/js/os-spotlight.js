// Sypnex OS - Spotlight & Search Module
// Contains spotlight search functionality

// Extend SypnexOS class with spotlight methods
Object.assign(SypnexOS.prototype, {
    showSpotlight() {
        const overlay = document.getElementById('spotlight-overlay');
        const input = document.getElementById('spotlight-input');
        
        if (!overlay || !input) {
            console.error('Required elements not found!');
            return;
        }
        
        overlay.classList.remove('spotlight-hidden');
        overlay.classList.add('spotlight-visible');
        
        // Force a repaint
        overlay.offsetHeight;
        
        input.focus();
        input.select();
    },

    hideSpotlight() {
        const overlay = document.getElementById('spotlight-overlay');
        const input = document.getElementById('spotlight-input');
        
        overlay.classList.remove('spotlight-visible');
        overlay.classList.add('spotlight-hidden');
        input.value = '';
        this.clearSearchResults();
    },

    clearSearchResults() {
        const resultsContainer = document.getElementById('spotlight-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    },

    async getAppResults(query) {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            return results;
        } catch (error) {
            console.error('Error searching apps:', error);
            return [];
        }
    },

    searchApps(query) {
        const resultsContainer = document.getElementById('spotlight-results');
        if (!resultsContainer) return;

        if (!query.trim()) {
            resultsContainer.innerHTML = '';
            return;
        }

        // Show loading state
        resultsContainer.innerHTML = '<div class="spotlight-loading">Searching...</div>';

        // Fetch results from server
        this.getAppResults(query).then(results => {
            resultsContainer.innerHTML = '';

            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="spotlight-no-results">No apps found</div>';
                return;
            }

            results.forEach(result => {
                const resultElement = document.createElement('div');
                resultElement.className = 'spotlight-result';
                resultElement.innerHTML = `
                    <i class="${result.icon}"></i>
                    <div class="result-content">
                        <div class="result-title">${result.name}</div>
                        <div class="result-description">${result.description}</div>
                    </div>
                `;
                
                resultElement.addEventListener('click', () => {
                    this.openApp(result.id);
                    this.hideSpotlight();
                });
                
                resultsContainer.appendChild(resultElement);
            });
        }).catch(error => {
            console.error('Error searching apps:', error);
            resultsContainer.innerHTML = '<div class="spotlight-error">Search failed</div>';
        });
    }
}); 
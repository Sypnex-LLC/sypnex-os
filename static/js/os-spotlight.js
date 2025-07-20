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

        // Check if query is a math expression first
        const mathResult = this.evaluateMath(query.trim());
        if (mathResult !== null) {
            resultsContainer.innerHTML = '';
            
            const calculatorResult = document.createElement('div');
            calculatorResult.className = 'spotlight-result calculator-result';
            calculatorResult.innerHTML = `
                <i class="fas fa-calculator calculator-icon"></i>
                <div class="result-content">
                    <div class="result-title">${mathResult}</div>
                    <div class="result-description">Press Enter to copy to clipboard</div>
                </div>
            `;
            
            calculatorResult.addEventListener('click', () => {
                this.copyToClipboard(mathResult.toString());
                this.hideSpotlight();
            });
            
            resultsContainer.appendChild(calculatorResult);
            return;
        }

        // Show loading state for app search
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
    },

    evaluateMath(expression) {
        try {
            // Remove spaces and check if it looks like a math expression
            const cleanExpression = expression.replace(/\s/g, '');
            
            // Basic validation - should contain numbers and math operators
            const mathPattern = /^[0-9+\-*/().^%\s]+$/;
            if (!mathPattern.test(cleanExpression)) {
                return null;
            }

            // Check if it contains at least one operator and one number
            const hasOperator = /[+\-*/^%]/.test(cleanExpression);
            const hasNumber = /[0-9]/.test(cleanExpression);
            if (!hasOperator || !hasNumber) {
                return null;
            }

            // Replace ^ with ** for exponentiation
            const jsExpression = cleanExpression.replace(/\^/g, '**');
            
            // Evaluate safely using Function constructor (more secure than eval)
            const result = Function(`"use strict"; return (${jsExpression})`)();
            
            // Check if result is a valid number
            if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                // Format the result nicely
                if (Number.isInteger(result)) {
                    return result;
                } else {
                    // Round to reasonable decimal places
                    return Math.round(result * 100000000) / 100000000;
                }
            }
            
            return null;
        } catch (error) {
            // If evaluation fails, it's not a valid math expression
            return null;
        }
    },

    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Result copied to clipboard', 'success');
            }).catch(() => {
                this.fallbackCopyTextToClipboard(text);
            });
        } else {
            this.fallbackCopyTextToClipboard(text);
        }
    },

    fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showNotification('Result copied to clipboard', 'success');
        } catch (err) {
            console.error('Fallback: Could not copy text', err);
            this.showNotification('Could not copy to clipboard', 'error');
        }
        
        document.body.removeChild(textArea);
    }
}); 
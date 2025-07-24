// SypnexAPI Libraries - CDN library loading
// This file extends the SypnexAPI class with library loading functionality

// Extend SypnexAPI with library methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Load a library from CDN
     * @param {string} url - CDN URL of the library
     * @param {object} options - Loading options
     * @returns {Promise<any>} - Loaded library or true if successful
     */
    async loadLibrary(url, options = {}) {
        const {
            localName = null,
            timeout = 10000
        } = options;
        
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Library load timeout: ${url}`));
            }, timeout);
            
            const script = document.createElement('script');
            script.src = url;
            
            script.onload = () => {
                clearTimeout(timeoutId);
                
                if (localName && window[localName]) {
                    resolve(window[localName]);
                } else {
                    resolve(true);
                }
            };
            
            script.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load library: ${url}`));
            };
            
            document.head.appendChild(script);
        });
    },
    
}); 
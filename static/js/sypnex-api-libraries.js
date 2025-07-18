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
        
        console.log(`SypnexAPI [${this.appId}]: Loading library from ${url}`);
        
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Library load timeout: ${url}`));
            }, timeout);
            
            const script = document.createElement('script');
            script.src = url;
            
            script.onload = () => {
                clearTimeout(timeoutId);
                
                if (localName && window[localName]) {
                    console.log(`SypnexAPI [${this.appId}]: Library loaded, found global '${localName}'`);
                    resolve(window[localName]);
                } else {
                    console.log(`SypnexAPI [${this.appId}]: Library loaded successfully`);
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

    /**
     * Load a common library by name
     * @param {string} libraryName - Name of the common library to load
     * @param {object} options - Loading options (version, timeout, etc.)
     * @returns {Promise<any>} - Loaded library or true if successful
     */
    async loadCommonLibrary(libraryName, options = {}) {
        const {
            version = null,
            timeout = 10000
        } = options;
        
        // Define common libraries with their CDN URLs and global names
        const commonLibraries = {
            'jquery': {
                url: 'https://code.jquery.com/jquery-3.7.1.min.js',
                localName: 'jQuery',
                versions: {
                    '3.6.0': 'https://code.jquery.com/jquery-3.6.0.min.js',
                    '3.7.1': 'https://code.jquery.com/jquery-3.7.1.min.js'
                }
            },
            'threejs': {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
                localName: 'THREE',
                versions: {
                    'r128': 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
                    'r158': 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r158/three.min.js'
                }
            },
            'lodash': {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
                localName: '_',
                versions: {
                    '4.17.21': 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
                    '4.17.20': 'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.20/lodash.min.js'
                }
            },
            'moment': {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js',
                localName: 'moment',
                versions: {
                    '2.29.4': 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js',
                    '2.29.1': 'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js'
                }
            },
            'axios': {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.0/axios.min.js',
                localName: 'axios',
                versions: {
                    '1.6.0': 'https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.0/axios.min.js',
                    '1.5.0': 'https://cdnjs.cloudflare.com/ajax/libs/axios/1.5.0/axios.min.js'
                }
            },
            'chartjs': {
                url: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.js',
                localName: 'Chart',
                versions: {
                    '4.4.0': 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.js',
                    '3.9.1': 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
                }
            },
            'bootstrap': {
                url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
                localName: 'bootstrap',
                versions: {
                    '5.3.0': 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
                    '5.2.3': 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js'
                }
            }
        };
        
        if (!commonLibraries[libraryName]) {
            const availableLibraries = Object.keys(commonLibraries).join(', ');
            throw new Error(`Unknown common library: ${libraryName}. Available: ${availableLibraries}`);
        }
        
        const library = commonLibraries[libraryName];
        let url = library.url;
        
        // Use specific version if provided
        if (version && library.versions[version]) {
            url = library.versions[version];
        } else if (version && !library.versions[version]) {
            const availableVersions = Object.keys(library.versions).join(', ');
            throw new Error(`Unknown version '${version}' for ${libraryName}. Available versions: ${availableVersions}`);
        }
        
        console.log(`SypnexAPI [${this.appId}]: Loading common library: ${libraryName}${version ? ` (v${version})` : ''}`);
        
        return await this.loadLibrary(url, {
            localName: library.localName,
            timeout: timeout
        });
    }
    
}); 
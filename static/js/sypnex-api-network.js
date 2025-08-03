// SypnexAPI Network - Network operations and HTTP proxy
// This file extends the SypnexAPI class with network functionality

// Extend SypnexAPI with network methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Proxy an HTTP request through the system (tries direct CORS, falls back to proxy)
     * @async
     * @param {object} options - HTTP request options
     * @param {string} options.url - Target URL for the request
     * @param {string} [options.method='GET'] - HTTP method (GET, POST, PUT, DELETE, etc.)
     * @param {object} [options.headers={}] - HTTP headers to send
     * @param {*} [options.body] - Request body (will be JSON stringified if object)
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @param {boolean} [options.followRedirects=true] - Whether to follow redirects
     * @param {boolean} [options.forceProxy=false] - Force use of backend proxy instead of direct CORS
     * @returns {Promise<object>} - Response data in proxy format for compatibility
     */
    async proxyHTTP(options) {
        const {
            url,
            method = 'GET',
            headers = {},
            body = null,
            timeout = 30,
            followRedirects = true,
            forceProxy = false
        } = options;
        
        if (!url) {
            throw new Error('URL is required for HTTP proxy request');
        }

        // If forceProxy is true, skip direct CORS attempt
        if (forceProxy) {
            return await this._proxyThroughBackend(options);
        }

        // Try direct CORS first
        try {
            console.log(`SypnexAPI [${this.appId}]: Attempting direct CORS request to:`, url);
            const result = await this._directCORSRequest(options);
            console.log(`SypnexAPI [${this.appId}]: Direct CORS succeeded for:`, url);
            return result;
        } catch (corsError) {
            // If CORS fails, fall back to backend proxy
            console.log(`SypnexAPI [${this.appId}]: Direct CORS failed, falling back to proxy:`, corsError.message);
            const result = await this._proxyThroughBackend(options);
            console.log(`SypnexAPI [${this.appId}]: Backend proxy succeeded for:`, url);
            return result;
        }
    },

    /**
     * Make a direct CORS request
     * @private
     */
    async _directCORSRequest(options) {
        const {
            url,
            method = 'GET',
            headers = {},
            body = null,
            timeout = 30,
            followRedirects = true
        } = options;

        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
        
        try {
            // Prepare fetch options
            const fetchOptions = {
                method: method.toUpperCase(),
                headers: {
                    ...headers
                },
                signal: controller.signal,
                mode: 'cors',
                credentials: 'omit',
                redirect: followRedirects ? 'follow' : 'manual'
            };
            
            // Handle body based on content type and data type
            // Only add body for methods that support it
            if (body !== null && body !== undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
                if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof ArrayBuffer) && !(body instanceof Blob)) {
                    fetchOptions.body = JSON.stringify(body);
                    // Ensure Content-Type is set for JSON
                    if (!fetchOptions.headers['Content-Type'] && !fetchOptions.headers['content-type']) {
                        fetchOptions.headers['Content-Type'] = 'application/json';
                    }
                } else {
                    fetchOptions.body = body;
                }
            }
            
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);
            
            // Check for CORS failure - if response is not ok and type is 'opaque' or 'cors', it's likely a CORS issue
            if (!response.ok && (response.type === 'opaque' || response.type === 'cors')) {
                throw new Error(`CORS request failed with status ${response.status}`);
            }
            
            // Also check if response is completely empty (another CORS indicator)
            if (response.status === 0) {
                throw new Error('Network request failed - likely CORS issue');
            }
            
            // Check if response is binary based on content-type
            const contentType = response.headers.get('content-type') || '';
            const isBinary = contentType.includes('audio/') || 
                            contentType.includes('video/') || 
                            contentType.includes('image/') ||
                            contentType.includes('application/octet-stream') ||
                            contentType.includes('application/pdf');
            
            let content;
            if (isBinary) {
                // Handle binary response as base64
                const arrayBuffer = await response.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                content = btoa(binary);
            } else {
                // Handle text response
                content = await response.text();
                
                // Try to parse as JSON if content-type suggests it
                if (contentType.includes('application/json')) {
                    try {
                        content = JSON.parse(content);
                    } catch (e) {
                        // Keep as text if JSON parsing fails
                    }
                }
            }
            
            // Return response in the same format as the old proxy
            return {
                status: response.status,
                content: content,
                is_binary: isBinary,
                headers: Object.fromEntries(response.headers.entries())
            };
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                throw new Error(`Request timeout after ${timeout} seconds`);
            }
            
            // Let CORS errors bubble up so they can trigger fallback
            throw fetchError;
        }
    },

    /**
     * Make a request through the backend proxy
     * @private
     */
    async _proxyThroughBackend(options) {
        try {
            const {
                url,
                method = 'GET',
                headers = {},
                body = null,
                timeout = 30,
                followRedirects = true
            } = options;
            
            const proxyRequest = {
                url,
                method: method.toUpperCase(),
                headers,
                timeout,
                followRedirects
            };
            
            // Handle body based on content type and data type
            if (body !== null && body !== undefined) {
                proxyRequest.body = body;
            }
            
            const response = await fetch(`${this.baseUrl}/proxy/http`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(proxyRequest)
            });
            
            if (response.ok) {
                const result = await response.json();
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Proxy request failed: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error in backend proxy request:`, error);
            // Return error in proxy format for compatibility
            return {
                status: 0,
                error: error.message,
                content: null,
                is_binary: false
            };
        }
    },
    
    /**
     * Make a GET request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {object} [options={}] - Additional options
     * @param {object} [options.headers={}] - HTTP headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @returns {Promise<object>} - Response data
     */
    async proxyGET(url, options = {}) {
        return await this.proxyHTTP({
            url,
            method: 'GET',
            ...options
        });
    },
    
    /**
     * Make a POST request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {*} body - Request body
     * @param {object} [options={}] - Additional options
     * @param {object} [options.headers={}] - HTTP headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @returns {Promise<object>} - Response data
     */
    async proxyPOST(url, body, options = {}) {
        return await this.proxyHTTP({
            url,
            method: 'POST',
            body,
            ...options
        });
    },
    
    /**
     * Make a PUT request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {*} body - Request body
     * @param {object} [options={}] - Additional options
     * @param {object} [options.headers={}] - HTTP headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @returns {Promise<object>} - Response data
     */
    async proxyPUT(url, body, options = {}) {
        return await this.proxyHTTP({
            url,
            method: 'PUT',
            body,
            ...options
        });
    },
    
    /**
     * Make a DELETE request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {object} [options={}] - Additional options
     * @param {object} [options.headers={}] - HTTP headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @returns {Promise<object>} - Response data
     */
    async proxyDELETE(url, options = {}) {
        return await this.proxyHTTP({
            url,
            method: 'DELETE',
            ...options
        });
    },
    
    /**
     * Make a JSON API request through the proxy
     * @async
     * @param {string} url - Target URL
     * @param {object} [options={}] - Request options
     * @param {string} [options.method='GET'] - HTTP method
     * @param {object} [options.data] - JSON data to send
     * @param {object} [options.headers={}] - Additional headers
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @returns {Promise<object>} - Parsed JSON response
     */
    async proxyJSON(url, options = {}) {
        const {
            method = 'GET',
            data = null,
            headers = {},
            timeout = 30
        } = options;
        
        const requestOptions = {
            url,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            timeout
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            requestOptions.body = data;
        }
        
        return await this.proxyHTTP(requestOptions);
    }
    
});

// SypnexAPI Network - Network operations and HTTP proxy
// This file extends the SypnexAPI class with network functionality

// Extend SypnexAPI with network methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Proxy an HTTP request through the system
     * @async
     * @param {object} options - HTTP request options
     * @param {string} options.url - Target URL for the request
     * @param {string} [options.method='GET'] - HTTP method (GET, POST, PUT, DELETE, etc.)
     * @param {object} [options.headers={}] - HTTP headers to send
     * @param {*} [options.body] - Request body (will be JSON stringified if object)
     * @param {number} [options.timeout=30] - Request timeout in seconds
     * @param {boolean} [options.followRedirects=true] - Whether to follow redirects
     * @returns {Promise<object>} - Proxy response data
     */
    async proxyHTTP(options) {
        try {
            const {
                url,
                method = 'GET',
                headers = {},
                body = null,
                timeout = 30,
                followRedirects = true
            } = options;
            
            if (!url) {
                throw new Error('URL is required for HTTP proxy request');
            }
            
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
            
            console.log(`SypnexAPI [${this.appId}]: Proxying ${method} request to ${url}`);
            
            const response = await fetch(`${this.baseUrl}/proxy/http`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(proxyRequest)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`SypnexAPI [${this.appId}]: HTTP proxy request completed with status ${result.status}`);
                return result;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Proxy request failed: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error in HTTP proxy request:`, error);
            throw error;
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

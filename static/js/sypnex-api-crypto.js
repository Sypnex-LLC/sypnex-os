// SypnexAPI Crypto - Simple encryption/decryption for user applications
// Extends SypnexAPI with basic crypto methods

Object.assign(SypnexAPI.prototype, {
    /**
     * Encrypt a value using the system's encryption service
     * @param {string|object} value - The value to encrypt (will be JSON.stringify'd if object)
     * @returns {Promise<string|null>} The encrypted value as a string, or null if encryption failed
     * @example
     * // Encrypt a simple string
     * const encrypted = await sypnexAPI.encrypt("my secret data");
     * 
     * // Encrypt an object
     * const encryptedObj = await sypnexAPI.encrypt({username: "john", password: "secret"});
     */
    async encrypt(value) {
        try {
            const response = await fetch(`${this.baseUrl}/crypto/encrypt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.encrypted;
                } else {
                    console.error('SypnexAPI: Encryption failed:', data.error);
                    return null;
                }
            } else {
                console.error('SypnexAPI: Encryption request failed:', response.status);
                return null;
            }
        } catch (error) {
            console.error('SypnexAPI: Error encrypting value:', error);
            return null;
        }
    },
    
    /**
     * Decrypt a value that was previously encrypted with the encrypt() method
     * @param {string} encryptedValue - The encrypted value to decrypt
     * @returns {Promise<string|null>} The decrypted value, or null if decryption failed
     * @example
     * // Decrypt a previously encrypted value
     * const decrypted = await sypnexAPI.decrypt(encryptedValue);
     * 
     * // Handle decryption failure
     * if (decrypted === null) {
     *     console.error("Failed to decrypt value");
     * }
     */
    async decrypt(encryptedValue) {
        try {
            const response = await fetch(`${this.baseUrl}/crypto/decrypt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ encrypted: encryptedValue })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.value;
                } else {
                    console.error('SypnexAPI: Decryption failed:', data.error);
                    return null;
                }
            } else {
                console.error('SypnexAPI: Decryption request failed:', response.status);
                return null;
            }
        } catch (error) {
            console.error('SypnexAPI: Error decrypting value:', error);
            return null;
        }
    }
});

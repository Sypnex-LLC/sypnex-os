// SypnexAPI Crypto - Simple encryption/decryption for user applications
// Extends SypnexAPI with basic crypto methods

Object.assign(SypnexAPI.prototype, {
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

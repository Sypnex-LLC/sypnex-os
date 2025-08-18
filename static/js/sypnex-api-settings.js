// SypnexAPI Settings - App settings and user preferences
// This file extends the SypnexAPI class with settings management functionality

// Extend SypnexAPI with settings methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Get an application setting
     * @async
     * @param {string} key - Setting key to retrieve
     * @param {*} [defaultValue=null] - Default value if setting not found
     * @memberof SypnexAPI.prototype
     * @returns {Promise<*>} The setting value or default value
     */
    async getSetting(key, defaultValue = null) {
        try {
            return await this.getAppSetting(key, defaultValue);
        } catch (error) {
            console.error(`SypnexAPI: Error getting setting ${key}:`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set an application setting
     * @async
     * @param {string} key - Setting key to set
     * @param {*} value - Value to store
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} True if saved successfully, false otherwise
     */
    async setSetting(key, value) {
        try {
            const response = await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });
            
            if (response.ok) {
                return true;
            } else {
                console.error(`SypnexAPI: Failed to save setting ${key}`);
                return false;
            }
        } catch (error) {
            console.error(`SypnexAPI: Error setting ${key}:`, error);
            return false;
        }
    },
    
    /**
     * Get all application settings
     * @async
     * @memberof SypnexAPI.prototype
     * @returns {Promise<object>} Object containing all app settings
     */
    async getAllSettings() {
        try {
            return await this.getAllAppSettings();
        } catch (error) {
            console.error('SypnexAPI: Error getting all settings:', error);
            return {};
        }
    },
    
    /**
     * Delete an application setting
     * @async
     * @param {string} key - Setting key to delete
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} True if deleted successfully, false otherwise
     */
    async deleteSetting(key) {
        try {
            const response = await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                return true;
            } else {
                console.error(`SypnexAPI: Failed to delete setting ${key}`);
                return false;
            }
        } catch (error) {
            console.error(`SypnexAPI: Error deleting setting ${key}:`, error);
            return false;
        }
    },
    
    /**
     * Get a user preference value
     * @async
     * @param {string} category - Preference category
     * @param {string} key - Preference key
     * @param {*} [defaultValue=null] - Default value if preference not found
     * @memberof SypnexAPI.prototype
     * @returns {Promise<*>} The preference value or default value
     */
    async getPreference(category, key, defaultValue = null) {
        try {
            const response = await fetch(`${this.baseUrl}/preferences/${category}/${key}`);
            if (response.ok) {
                const data = await response.json();
                return data.value !== undefined ? data.value : defaultValue;
            }
            return defaultValue;
        } catch (error) {
            console.error(`SypnexAPI: Error getting preference ${category}.${key}:`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set a user preference value
     * @async
     * @param {string} category - Preference category
     * @param {string} key - Preference key
     * @param {*} value - Value to store
     * @memberof SypnexAPI.prototype
     * @returns {Promise<boolean>} True if saved successfully, false otherwise
     */
    async setPreference(category, key, value) {
        try {
            const response = await fetch(`${this.baseUrl}/preferences/${category}/${key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value })
            });
            
            if (response.ok) {
                return true;
            } else {
                console.error(`SypnexAPI: Failed to save preference ${category}.${key}`);
                return false;
            }
        } catch (error) {
            console.error(`SypnexAPI: Error setting preference ${category}.${key}:`, error);
            return false;
        }
    }
    
}); 
// SypnexAPI Settings - App settings and user preferences
// This file extends the SypnexAPI class with settings management functionality

// Extend SypnexAPI with settings methods
Object.assign(SypnexAPI.prototype, {
    
    async getSetting(key, defaultValue = null) {
        try {
            return await this.getAppSetting(key, defaultValue);
        } catch (error) {
            console.error(`SypnexAPI: Error getting setting ${key}:`, error);
            return defaultValue;
        }
    },
    
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
                console.log(`SypnexAPI: Setting ${key} saved successfully`);
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
    
    async getAllSettings() {
        try {
            return await this.getAllAppSettings();
        } catch (error) {
            console.error('SypnexAPI: Error getting all settings:', error);
            return {};
        }
    },
    
    async deleteSetting(key) {
        try {
            const response = await fetch(`${this.baseUrl}/app-settings/${this.appId}/${key}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                console.log(`SypnexAPI: Setting ${key} deleted successfully`);
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
                console.log(`SypnexAPI: Preference ${category}.${key} saved successfully`);
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
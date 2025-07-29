// SypnexAPI VFS - Virtual File System operations
// This file extends the SypnexAPI class with virtual file system functionality

// Extend SypnexAPI with VFS methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Get virtual file system statistics
     * @returns {Promise<object>} - System statistics
     */
    async getVirtualFileStats() {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/stats`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to get stats: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error getting virtual file stats:`, error);
            throw error;
        }
    },
    
    /**
     * List files and directories in a path
     * @param {string} path - Directory path (defaults to '/')
     * @returns {Promise<object>} - Directory contents
     */
    async listVirtualFiles(path = '/') {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/list?path=${encodeURIComponent(path)}`);
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error(`Failed to list files: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error listing virtual files:`, error);
            throw error;
        }
    },
    
    /**
     * Create a new folder
     * @param {string} name - Folder name
     * @param {string} parentPath - Parent directory path (defaults to '/')
     * @returns {Promise<object>} - Creation result
     */
    async createVirtualFolder(name, parentPath = '/') {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/create-folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, parent_path: parentPath })
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to create folder: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error creating virtual folder:`, error);
            throw error;
        }
    },
    
    /**
     * Create a new file
     * @param {string} name - File name
     * @param {string} content - File content
     * @param {string} parentPath - Parent directory path (defaults to '/')
     * @returns {Promise<object>} - Creation result
     */
    async createVirtualFile(name, content = '', parentPath = '/') {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/create-file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, content, parent_path: parentPath })
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to create file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error creating virtual file:`, error);
            throw error;
        }
    },
    
    /**
     * Upload a file from the host system
     * @param {File} file - File object from input element
     * @param {string} parentPath - Parent directory path (defaults to '/')
     * @returns {Promise<object>} - Upload result
     */
    async uploadVirtualFile(file, parentPath = '/') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parent_path', parentPath);
            
            const response = await fetch(`${this.baseUrl}/virtual-files/upload-file-streaming`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to upload file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error uploading virtual file:`, error);
            throw error;
        }
    },

    /**
     * Upload a file with chunked upload and progress tracking
     * @param {File} file - File object from input element
     * @param {string} parentPath - Parent directory path (defaults to '/')
     * @param {Function} progressCallback - Callback for progress updates (percent)
     * @returns {Promise<object>} - Upload result
     */
    async uploadVirtualFileChunked(file, parentPath = '/', progressCallback = null) {
        try {
            // For now, use the regular upload but simulate chunked progress
            // This gives us progress feedback without the complexity of server-side reassembly
            
            if (progressCallback) progressCallback(0);
            
            // Simulate chunked progress for better UX
            const simulateProgress = async () => {
                for (let i = 0; i < 90; i += 10) {
                    if (progressCallback) progressCallback(i);
                    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for visual effect
                }
            };
            
            // Start progress simulation
            const progressPromise = simulateProgress();
            
            // Perform the actual upload
            const uploadPromise = this.uploadVirtualFile(file, parentPath);
            
            // Wait for both to complete
            await Promise.all([progressPromise, uploadPromise]);
            
            // Complete progress
            if (progressCallback) progressCallback(100);
            
            // Return the upload result
            const result = await uploadPromise;
            return result;
            
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error uploading chunked file:`, error);
            throw error;
        }
    },

    /**
     * Read a file's content
     * @param {string} filePath - Path to the file
     * @returns {Promise<object>} - File data
     */
    async readVirtualFile(filePath) {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/read/${encodeURIComponent(filePath.substring(1))}`);
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to read file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading virtual file:`, error);
            throw error;
        }
    },
    
    /**
     * Get a file's content as text
     * @param {string} filePath - Path to the file
     * @returns {Promise<string>} - File content as text
     */
    async readVirtualFileText(filePath) {
        try {
            const fileData = await this.readVirtualFile(filePath);
            return fileData.content || '';
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading virtual file text:`, error);
            throw error;
        }
    },
    
    /**
     * Get a file's content as JSON
     * @param {string} filePath - Path to the file
     * @returns {Promise<object>} - Parsed JSON content
     */
    async readVirtualFileJSON(filePath) {
        try {
            const content = await this.readVirtualFileText(filePath);
            return JSON.parse(content);
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading virtual file JSON:`, error);
            throw error;
        }
    },

    /**
     * Get a file's content as Blob (for binary files, images, etc.)
     * @param {string} filePath - Path to the file
     * @returns {Promise<Blob>} - File content as Blob
     */
    async readVirtualFileBlob(filePath) {
        try {
            const fileUrl = this.getVirtualFileUrl(filePath);
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch binary file: ${response.status} ${response.statusText}`);
            }
            return await response.blob();
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error reading virtual file blob:`, error);
            throw error;
        }
    },

    /**
     * Serve a file directly (for binary files, images, etc.)
     * @param {string} filePath - Path to the file
     * @returns {string} - Direct URL to serve the file
     */
    getVirtualFileUrl(filePath) {
        return `${this.baseUrl}/virtual-files/serve/${encodeURIComponent(filePath.substring(1))}`;
    },    /**
     * Delete a file or directory
     * @param {string} itemPath - Path to the item to delete
     * @returns {Promise<object>} - Deletion result
     */
    async deleteVirtualItem(itemPath) {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/delete/${encodeURIComponent(itemPath.substring(1))}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to delete item: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error deleting virtual item:`, error);
            throw error;
        }
    },
    
    /**
     * Get information about a file or directory
     * @param {string} itemPath - Path to the item
     * @returns {Promise<object>} - Item information
     */
    async getVirtualItemInfo(itemPath) {
        try {
            const response = await fetch(`${this.baseUrl}/virtual-files/info/${encodeURIComponent(itemPath.substring(1))}`);
            if (response.ok) {
                return await response.json();
            } else {
                // For 404 errors, create a specific error type that won't be logged
                if (response.status === 404) {
                    const notFoundError = new Error('Item not found');
                    notFoundError.isNotFound = true;
                    notFoundError.status = 404;
                    throw notFoundError;
                }
                
                const errorData = await response.json();
                const error = new Error(errorData.error || `Failed to get item info: ${response.status}`);
                error.status = response.status;
                throw error;
            }
        } catch (error) {
            // Only log errors that aren't expected 404s
            if (!error.isNotFound && error.status !== 404) {
                console.error(`SypnexAPI [${this.appId}]: Error getting virtual item info:`, error);
            }
            throw error;
        }
    },
    
    /**
     * Check if a file or directory exists
     * @param {string} itemPath - Path to the item
     * @returns {Promise<boolean>} - Whether the item exists
     */
    async virtualItemExists(itemPath) {
        try {
            await this.getVirtualItemInfo(itemPath);
            return true;
        } catch (error) {
            // Return false for any 404 or not found errors
            if (error.isNotFound || error.status === 404) {
                return false;
            }
            throw error;
        }
    },
    
    /**
     * Write content to a file (creates or overwrites)
     * @param {string} filePath - Path to the file
     * @param {string} content - File content
     * @returns {Promise<object>} - Write result
     */
    async writeVirtualFile(filePath, content) {
        try {
            // First check if file exists
            const exists = await this.virtualItemExists(filePath);
            
            if (exists) {
                // For now, we'll delete and recreate since we don't have a direct write endpoint
                await this.deleteVirtualItem(filePath);
            }
            
            // Extract name and parent path
            const pathParts = filePath.split('/');
            const name = pathParts.pop();
            const parentPath = pathParts.length > 0 ? pathParts.join('/') || '/' : '/';
            
            return await this.createVirtualFile(name, content, parentPath);
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error writing virtual file:`, error);
            throw error;
        }
    },
    
    /**
     * Write JSON content to a file
     * @param {string} filePath - Path to the file
     * @param {object} data - JSON data to write
     * @returns {Promise<object>} - Write result
     */
    async writeVirtualFileJSON(filePath, data) {
        try {
            const content = JSON.stringify(data, null, 2);
            return await this.writeVirtualFile(filePath, content);
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error writing virtual file JSON:`, error);
            throw error;
        }
    },
    
    /**
     * Write binary content to a file using the upload endpoint
     * @param {string} filePath - Path to the file
     * @param {Uint8Array|Blob} binaryData - Binary data to write
     * @returns {Promise<object>} - Write result
     */
    async writeVirtualFileBinary(filePath, binaryData) {
        try {
            // First check if file exists and delete it
            const exists = await this.virtualItemExists(filePath);
            if (exists) {
                await this.deleteVirtualItem(filePath);
            }
            
            // Extract name and parent path
            const pathParts = filePath.split('/');
            const fileName = pathParts.pop();
            const parentPath = pathParts.length > 0 ? pathParts.join('/') || '/' : '/';
            
            // Create FormData for the upload
            const formData = new FormData();
            
            // Convert Uint8Array to Blob if needed
            let blob;
            if (binaryData instanceof Uint8Array) {
                blob = new Blob([binaryData], { type: 'application/octet-stream' });
            } else if (binaryData instanceof Blob) {
                blob = binaryData;
            } else {
                throw new Error('Binary data must be Uint8Array or Blob');
            }
            
            formData.append('file', blob, fileName);
            formData.append('parent_path', parentPath);
            
            const response = await fetch(`${this.baseUrl}/virtual-files/upload-file`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to upload binary file: ${response.status}`);
            }
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error writing virtual file binary:`, error);
            throw error;
        }
    },
    
    /**
     * Create a directory structure (creates parent directories if needed)
     * @param {string} dirPath - Directory path to create
     * @returns {Promise<object>} - Creation result
     */
    async createVirtualDirectoryStructure(dirPath) {
        try {
            const pathParts = dirPath.split('/').filter(part => part.length > 0);
            let currentPath = '/';
            
            for (const part of pathParts) {
                const fullPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;
                
                // Check if directory exists
                const exists = await this.virtualItemExists(fullPath);
                
                if (!exists) {
                    // Create the directory
                    const parentPath = currentPath;
                    await this.createVirtualFolder(part, parentPath);
                }
                
                currentPath = fullPath;
            }
            
            return { success: true, path: dirPath };
        } catch (error) {
            console.error(`SypnexAPI [${this.appId}]: Error creating directory structure:`, error);
            throw error;
        }
    }
    
}); 
// Sypnex OS - Virtual File System Module
// Contains VFS functionality

// Extend SypnexOS class with VFS methods
Object.assign(SypnexOS.prototype, {
    setupVirtualFileSystem(windowElement) {
        const fileList = windowElement.querySelector('.file-list');
        const refreshBtn = windowElement.querySelector('.refresh-files');
        const statusSummary = windowElement.querySelector('.status-summary');
        const breadcrumb = windowElement.querySelector('.breadcrumb');
        const createFolderBtn = windowElement.querySelector('.create-folder');
        const uploadFileBtn = windowElement.querySelector('.upload-file');
        
        // Check if required elements exist
        if (!fileList) {
            console.error('File list element not found');
            return;
        }
        
        let currentPath = '/';
        
        // Helper function to format file size
        const formatFileSize = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        // Helper function to format date
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        };
        
        // Load system statistics
        const loadStats = async () => {
            try {
                const response = await fetch('/api/virtual-files/stats');
                const stats = await response.json();
                
                if (statusSummary) {
                    statusSummary.innerHTML = `
                        <div class="status-item">
                            <span class="status-label">Total Items:</span>
                            <span class="status-value">${stats.total_items}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Files:</span>
                            <span class="status-value">${stats.total_files}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Folders:</span>
                            <span class="status-value">${stats.total_directories}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">Total Size:</span>
                            <span class="status-value">${formatFileSize(stats.total_size)}</span>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading stats:', error);
            }
        };
        
        // Update breadcrumb
        const updateBreadcrumb = () => {
            if (!breadcrumb) return;
            
            const parts = currentPath.split('/').filter(part => part);
            breadcrumb.innerHTML = '<span class="breadcrumb-item" data-path="/">Root</span>';
            
            let path = '';
            parts.forEach((part, index) => {
                path += '/' + part;
                const separator = index < parts.length - 1 ? ' / ' : '';
                breadcrumb.innerHTML += `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-item" data-path="${path}">${part}</span>
                `;
            });
            
            // Add click handlers to breadcrumb items
            breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
                item.addEventListener('click', () => {
                    const path = item.dataset.path;
                    navigateToPath(path);
                });
            });
        };
        
        // Navigate to a specific path
        const navigateToPath = async (path) => {
            currentPath = path;
            updateBreadcrumb();
            await loadFiles();
        };
        
        // Load files for current path
        const loadFiles = async () => {
            try {
                const response = await fetch(`/api/virtual-files/list?path=${encodeURIComponent(currentPath)}`);
                const data = await response.json();
                
                if (fileList) {
                    fileList.innerHTML = '';
                    
                    if (data.items.length === 0) {
                        fileList.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-folder-open"></i>
                                <div>This folder is empty</div>
                                <small>Create a folder or upload a file to get started</small>
                            </div>
                        `;
                        return;
                    }
                    
                    data.items.forEach(item => {
                        const fileElement = document.createElement('div');
                        fileElement.className = 'file-item';
                        fileElement.dataset.path = item.path;
                        
                        const icon = item.is_directory ? 'fas fa-folder' : 'fas fa-file';
                        const iconClass = item.is_directory ? 'folder' : 'file';
                        const size = item.is_directory ? '--' : formatFileSize(item.size);
                        const modified = formatDate(item.updated_at);
                        
                        fileElement.innerHTML = `
                            <div class="file-info">
                                <div class="file-icon ${iconClass}">
                                    <i class="${icon}"></i>
                                </div>
                                <div class="file-details">
                                    <div class="file-name">${item.name}</div>
                                    <div class="file-meta">${size} • Modified ${modified}</div>
                                </div>
                            </div>
                            <div class="file-actions">
                                ${item.is_directory ? 
                                    '<button class="file-action-btn open">Open</button><button class="file-action-btn rename">Rename</button>' : 
                                    '<button class="file-action-btn rename">Rename</button>'
                                }
                                ${!item.is_directory ? '<button class="file-action-btn download">Download</button>' : ''}
                                <button class="file-action-btn delete">Delete</button>
                            </div>
                        `;
                        
                        // Add click handlers
                        const openBtn = fileElement.querySelector('.open');
                        const renameBtn = fileElement.querySelector('.rename');
                        const downloadBtn = fileElement.querySelector('.download');
                        const deleteBtn = fileElement.querySelector('.delete');
                        
                        if (openBtn) {
                            openBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                navigateToPath(item.path);
                            });
                        }
                        
                        if (renameBtn) {
                            renameBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                renameItem(item.path, item.name);
                            });
                        }
                        
                        if (downloadBtn) {
                            downloadBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                downloadFile(item.path, item.name);
                            });
                        }
                        
                        if (deleteBtn) {
                            deleteBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                deleteItem(item.path, item.name);
                            });
                        }
                        
                        // Double click to open folders or view files
                        if (item.is_directory) {
                            fileElement.addEventListener('dblclick', () => {
                                navigateToPath(item.path);
                            });
                        } else {
                            // Double click to view files (same as View button)
                            fileElement.addEventListener('dblclick', () => {
                                viewFile(item.path);
                            });
                        }
                        
                        fileList.appendChild(fileElement);
                    });
                }
            } catch (error) {
                console.error('Error loading files:', error);
                if (fileList) {
                    fileList.innerHTML = '<div class="error-message">Error loading files</div>';
                }
            }
        };
        
        // View file content with default text editor
        const viewFile = async (filePath) => {
            try {
                // Get default text editor preference directly via API
                const defaultEditorResponse = await fetch('/api/preferences/system/default_text_editor');
                
                if (!defaultEditorResponse.ok) {
                    this.showNotification('Could not retrieve default text editor preference.', 'error');
                    return;
                }
                
                const defaultEditorData = await defaultEditorResponse.json();
                const defaultEditor = defaultEditorData.value;
                
                if (!defaultEditor) {
                    this.showNotification('No default text editor set. Please configure in System Settings.', 'warning');
                    return;
                }
                
                // Set intent using preferences API (simple fetch)
                const intentData = {
                    action: 'open_file',
                    data: { filePath: filePath },
                    timestamp: new Date().toISOString()
                };
                
                const intentResponse = await fetch(`/api/preferences/${defaultEditor}/_pending_intent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value: intentData })
                });
                
                if (!intentResponse.ok) {
                    this.showNotification('Error setting file intent', 'error');
                    return;
                }
                
                // Launch the default text editor
                window.sypnexOS.openApp(defaultEditor);
                
                this.showNotification(`Opening ${filePath.split('/').pop()} with ${defaultEditor}`, 'success');
                
            } catch (error) {
                console.error('Error opening file with default editor:', error);
                this.showNotification('Error opening file with default editor', 'error');
            }
        };

        // Download file
        const downloadFile = async (filePath, fileName) => {
            try {
                // Create a temporary link element to trigger download
                const link = document.createElement('a');
                
                // Create authenticated URL with token template (will be replaced during bundling)
                const baseUrl = `/api/virtual-files/serve/${encodeURIComponent(filePath.substring(1))}?token={{ACCESS_TOKEN}}`;
                link.href = `${baseUrl}&download=true`;
                
                link.download = fileName;
                link.style.display = 'none';
                
                // Append to body, click, and remove
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification(`${fileName} download started`, 'success');
            } catch (error) {
                console.error('Error downloading file:', error);
                this.showNotification('Error downloading file', 'error');
            }
        };
        
        // Delete item
        const deleteItem = async (itemPath, itemName) => {
            try {
                // Create a temporary SypnexAPI instance to use the confirmation dialog
                const tempAPI = new window.SypnexAPI('virtual-file-system');
                
                const confirmed = await tempAPI.showConfirmation(
                    'Delete Item',
                    `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
                    {
                        type: 'danger',
                        confirmText: 'Delete',
                        cancelText: 'Cancel',
                        icon: 'fas fa-trash'
                    }
                );

                if (confirmed) {
                    const response = await fetch(`/api/virtual-files/delete/${encodeURIComponent(itemPath.substring(1))}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        this.showNotification(`${itemName} deleted successfully`, 'success');
                        loadFiles();
                        loadStats();
                    } else {
                        const error = await response.json();
                        this.showNotification(`Error deleting ${itemName}: ${error.error}`, 'error');
                    }
                }
            } catch (error) {
                console.error('Error deleting item:', error);
                this.showNotification(`Error deleting ${itemName}`, 'error');
            }
        };
        
        // Rename item
        const renameItem = async (itemPath, currentName) => {
            try {
                // Create a temporary SypnexAPI instance to use the input modal
                const tempAPI = new window.SypnexAPI('virtual-file-system');
                
                const newName = await tempAPI.showInputModal(
                    'Rename Item',
                    'New name:',
                    {
                        placeholder: 'Enter new name',
                        confirmText: 'Rename',
                        cancelText: 'Cancel',
                        icon: 'fas fa-edit',
                        defaultValue: currentName
                    }
                );

                if (newName && newName !== currentName) {
                    // Construct new path using the item's actual parent directory
                    // Not the current browsing directory
                    const pathParts = itemPath.split('/').filter(part => part !== '');
                    const itemParentPath = pathParts.length > 1 ? '/' + pathParts.slice(0, -1).join('/') : '/';
                    const newPath = itemParentPath === '/' ? `/${newName}` : `${itemParentPath}/${newName}`;
                    
                    console.log(`Current browsing path: ${currentPath}`);
                    console.log(`Item path: ${itemPath}`);
                    console.log(`Item parent: ${itemParentPath}`);
                    console.log(`Renaming: ${itemPath} -> ${newPath}`);
                    
                    const response = await fetch('/api/virtual-files/rename', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            old_path: itemPath,
                            new_path: newPath
                        })
                    });
                    
                    if (response.ok) {
                        this.showNotification(`${currentName} renamed to ${newName} successfully`, 'success');
                        loadFiles();
                        loadStats();
                    } else {
                        const error = await response.json();
                        this.showNotification(`Error renaming ${currentName}: ${error.error}`, 'error');
                    }
                }
            } catch (error) {
                console.error('Error renaming item:', error);
                this.showNotification(`Error renaming ${currentName}`, 'error');
            }
        };
        
        // Setup modal handlers
        const setupModals = () => {
            // Create folder functionality with SypnexAPI modal
            if (createFolderBtn) {
                createFolderBtn.addEventListener('click', async () => {
                    const tempAPI = new SypnexAPI();
                    const folderName = await tempAPI.showInputModal(
                        'Create New Folder',
                        'Folder Name:',
                        {
                            placeholder: 'Enter folder name',
                            confirmText: 'Create Folder',
                            icon: 'fas fa-folder-plus'
                        }
                    );
                    
                    if (folderName) {
                        try {
                            const response = await fetch('/api/virtual-files/create-folder', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name: folderName,
                                    parent_path: currentPath
                                })
                            });
                            
                            if (response.ok) {
                                this.showNotification(`Folder ${folderName} created successfully`, 'success');
                                loadFiles();
                                loadStats();
                            } else {
                                const error = await response.json();
                                this.showNotification(`Error creating folder: ${error.error}`, 'error');
                            }
                        } catch (error) {
                            console.error('Error creating folder:', error);
                            this.showNotification('Error creating folder', 'error');
                        }
                    }
                });
            }
            
            // Upload file functionality with SypnexAPI modal
            if (uploadFileBtn) {
                uploadFileBtn.addEventListener('click', async () => {
                    const tempAPI = new SypnexAPI();
                    const selectedFile = await tempAPI.showFileUploadModal(
                        'Upload File',
                        'Select File:',
                        {
                            confirmText: 'Upload File',
                            icon: 'fas fa-upload'
                        }
                    );
                    
                    if (selectedFile) {
                        try {
                            const formData = new FormData();
                            formData.append('file', selectedFile);
                            formData.append('parent_path', currentPath);
                            
                            const response = await fetch('/api/virtual-files/upload-file', {
                                method: 'POST',
                                body: formData
                            });
                            
                            if (response.ok) {
                                this.showNotification(`File ${selectedFile.name} uploaded successfully`, 'success');
                                loadFiles();
                                loadStats();
                            } else {
                                const error = await response.json();
                                this.showNotification(`Error uploading file: ${error.error}`, 'error');
                            }
                        } catch (error) {
                            console.error('Error uploading file:', error);
                            this.showNotification('Error uploading file', 'error');
                        }
                    }
                });
            }
        };
        
        // Initialize
        loadStats();
        loadFiles();
        updateBreadcrumb();
        setupModals();
        
        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadStats();
                loadFiles();
            });
        }
    }
}); 
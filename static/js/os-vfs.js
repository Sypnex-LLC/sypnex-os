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
        const createFileBtn = windowElement.querySelector('.create-file');
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
                                    '<button class="file-action-btn open">Open</button>' : 
                                    '<button class="file-action-btn view">View</button>'
                                }
                                ${!item.is_directory ? '<button class="file-action-btn download">Download</button>' : ''}
                                <button class="file-action-btn delete">Delete</button>
                            </div>
                        `;
                        
                        // Add click handlers
                        const openBtn = fileElement.querySelector('.open');
                        const viewBtn = fileElement.querySelector('.view');
                        const downloadBtn = fileElement.querySelector('.download');
                        const deleteBtn = fileElement.querySelector('.delete');
                        
                        if (openBtn) {
                            openBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                navigateToPath(item.path);
                            });
                        }
                        
                        if (viewBtn) {
                            viewBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                viewFile(item.path);
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
                        
                        // Double click to open folders
                        if (item.is_directory) {
                            fileElement.addEventListener('dblclick', () => {
                                navigateToPath(item.path);
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
        
        // View file content
        const viewFile = async (filePath) => {
            try {
                const response = await fetch(`/api/virtual-files/read/${encodeURIComponent(filePath.substring(1))}`);
                const fileData = await response.json();
                
                // Create a simple modal to display file content
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.style.display = 'block';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-file"></i> ${fileData.name}</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div style="margin-bottom: 15px; color: var(--text-secondary);">
                                Size: ${formatFileSize(fileData.size)} • Modified: ${formatDate(fileData.updated_at)}
                            </div>
                            <pre style="background: rgba(0,0,0,0.1); padding: 15px; border-radius: 6px; overflow-x: auto; max-height: 400px;">${fileData.content}</pre>
                        </div>
                        <div class="modal-footer">
                            <button class="app-btn secondary modal-close">Close</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Add close handlers
                modal.querySelectorAll('.modal-close').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.body.removeChild(modal);
                    });
                });
                
                // Close on outside click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                    }
                });
                
            } catch (error) {
                console.error('Error viewing file:', error);
                this.showNotification('Error viewing file', 'error');
            }
        };
        
        // Download file
        const downloadFile = async (filePath, fileName) => {
            try {
                // Create a temporary link element to trigger download
                const link = document.createElement('a');
                link.href = `/api/virtual-files/serve/${encodeURIComponent(filePath.substring(1))}?download=true`;
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
            const deleteModal = document.getElementById('deleteModal');
            const deleteItemName = document.getElementById('deleteItemName');
            const deleteConfirm = document.querySelector('.delete-confirm');
            
            if (!deleteModal || !deleteConfirm) {
                console.error('Delete modal elements not found');
                return;
            }
            
            if (deleteItemName) {
                deleteItemName.textContent = itemName;
            }
            
            deleteModal.style.display = 'block';
            
            // Handle delete confirmation
            const handleDelete = async () => {
                try {
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
                } catch (error) {
                    console.error('Error deleting item:', error);
                    this.showNotification(`Error deleting ${itemName}`, 'error');
                }
                
                // Clean up event listeners
                deleteConfirm.removeEventListener('click', handleDelete);
                deleteModal.style.display = 'none';
            };
            
            deleteConfirm.addEventListener('click', handleDelete);
            
            // Close modal handlers
            deleteModal.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
                btn.addEventListener('click', () => {
                    deleteModal.style.display = 'none';
                    deleteConfirm.removeEventListener('click', handleDelete);
                });
            });
        };
        
        // Setup modal handlers
        const setupModals = () => {
            // Create folder modal
            const createFolderModal = document.getElementById('createFolderModal');
            const createFolderForm = document.getElementById('createFolderForm');
            const folderPathInput = document.getElementById('folderPath');
            const createFolderSubmit = document.querySelector('.create-folder-submit');
            
            if (createFolderBtn && createFolderModal && createFolderForm && folderPathInput && createFolderSubmit) {
                createFolderBtn.addEventListener('click', () => {
                    folderPathInput.value = currentPath;
                    createFolderModal.style.display = 'block';
                });
                
                createFolderSubmit.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(createFolderForm);
                    const folderName = formData.get('folderName');
                    
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
                            createFolderModal.style.display = 'none';
                            createFolderForm.reset();
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
                });
            }
            
            // Create file modal
            const createFileModal = document.getElementById('createFileModal');
            const createFileForm = document.getElementById('createFileForm');
            const createFilePathInput = document.getElementById('createFilePath');
            const createFileSubmit = document.querySelector('.create-file-submit');
            
            if (createFileBtn && createFileModal && createFileForm && createFilePathInput && createFileSubmit) {
                createFileBtn.addEventListener('click', () => {
                    createFilePathInput.value = currentPath;
                    createFileModal.style.display = 'block';
                });
                
                createFileSubmit.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(createFileForm);
                    const fileName = formData.get('createFileName');
                    const fileContent = formData.get('createFileContent');
                    
                    try {
                        const response = await fetch('/api/virtual-files/create-file', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                name: fileName,
                                parent_path: currentPath,
                                content: fileContent
                            })
                        });
                        
                        if (response.ok) {
                            this.showNotification(`File ${fileName} created successfully`, 'success');
                            createFileModal.style.display = 'none';
                            createFileForm.reset();
                            loadFiles();
                            loadStats();
                        } else {
                            const error = await response.json();
                            this.showNotification(`Error creating file: ${error.error}`, 'error');
                        }
                    } catch (error) {
                        console.error('Error creating file:', error);
                        this.showNotification('Error creating file', 'error');
                    }
                });
            }
            
            // Upload file modal
            const uploadFileModal = document.getElementById('uploadFileModal');
            const uploadFileForm = document.getElementById('uploadFileForm');
            const uploadFilePathInput = document.getElementById('uploadFilePath');
            const fileInput = document.getElementById('fileInput');
            const fileInfo = document.getElementById('fileInfo');
            const selectedFileName = document.getElementById('selectedFileName');
            const selectedFileSize = document.getElementById('selectedFileSize');
            const uploadFileSubmit = document.querySelector('.upload-file-submit');
            
            if (uploadFileBtn && uploadFileModal && uploadFileForm && uploadFilePathInput && uploadFileSubmit) {
                uploadFileBtn.addEventListener('click', () => {
                    uploadFilePathInput.value = currentPath;
                    uploadFileModal.style.display = 'block';
                    fileInfo.style.display = 'none';
                    fileInput.value = '';
                });
                
                // Handle file selection
                if (fileInput) {
                    fileInput.addEventListener('change', (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            selectedFileName.textContent = file.name;
                            selectedFileSize.textContent = formatFileSize(file.size);
                            fileInfo.style.display = 'block';
                        } else {
                            fileInfo.style.display = 'none';
                        }
                    });
                }
                
                uploadFileSubmit.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const file = fileInput.files[0];
                    
                    if (!file) {
                        this.showNotification('Please select a file to upload', 'error');
                        return;
                    }
                    
                    try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('parent_path', currentPath);
                        
                        const response = await fetch('/api/virtual-files/upload-file', {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (response.ok) {
                            this.showNotification(`File ${file.name} uploaded successfully`, 'success');
                            uploadFileModal.style.display = 'none';
                            uploadFileForm.reset();
                            fileInfo.style.display = 'none';
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
                });
            }
            
            // Close modal handlers
            document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modal = btn.closest('.modal');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                });
            });
        };
        
        // Initialize
        loadStats();
        loadFiles();
        updateBreadcrumb();
        
        // Setup modals after a small delay to ensure DOM is ready
        setTimeout(() => {
            setupModals();
        }, 100);
        
        // Refresh button
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadStats();
                loadFiles();
            });
        }
    }
}); 
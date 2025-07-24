// SypnexAPI File Explorer - File explorer UI component
// This file extends the SypnexAPI class with file explorer functionality

// Scale compensation utilities for file explorer
const fileExplorerUtils = {
    /**
     * Detect the current app scale from CSS transform
     * @returns {number} Scale factor (1.0 = 100%, 0.8 = 80%, etc.)
     */
    // Detect the current app scale from CSS transform
    detectAppScale() {
        try {
            // Find the app window container
            const appWindow = document.querySelector('.app-window');
            if (!appWindow) {
                return 1.0;
            }
            
            // Check for scale classes
            const scaleClasses = ['scale-75', 'scale-80', 'scale-85', 'scale-90', 'scale-95', 
                                 'scale-100', 'scale-105', 'scale-110', 'scale-115', 'scale-120',
                                 'scale-125', 'scale-130', 'scale-135', 'scale-140', 'scale-145', 'scale-150'];
            
            for (const scaleClass of scaleClasses) {
                if (appWindow.classList.contains(scaleClass)) {
                    const scaleValue = parseInt(scaleClass.replace('scale-', ''));
                    return scaleValue / 100;
                }
            }
            
            // Fallback: check computed transform
            const computedStyle = window.getComputedStyle(appWindow);
            const transform = computedStyle.transform;
            if (transform && transform !== 'none') {
                // Parse transform matrix to extract scale
                const matrix = transform.match(/matrix\(([^)]+)\)/);
                if (matrix) {
                    const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
                    if (values.length >= 4) {
                        // Matrix format: matrix(a, b, c, d, tx, ty) where a and d are scale factors
                        const scaleX = values[0];
                        const scaleY = values[3];
                        return (scaleX + scaleY) / 2; // Average of X and Y scale
                    }
                }
            }
            
            return 1.0;
        } catch (error) {
            console.error('Error detecting app scale:', error);
            return 1.0;
        }
    },

    /**
     * Convert screen coordinates to app coordinates accounting for scale
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {object} Object with x and y properties in app coordinates
     */
    // Convert screen coordinates to app coordinates
    screenToAppCoords(screenX, screenY) {
        const scale = this.detectAppScale();
        return {
            x: screenX / scale,
            y: screenY / scale
        };
    },

    /**
     * Get scaled element bounding rectangle (compensates for app scaling)
     * @param {Element} element - DOM element to get bounds for
     * @returns {object} DOMRect-like object with scaled coordinates
     */
    // Get scaled element rect (compensates for app scaling)
    getScaledBoundingClientRect(element) {
        const rect = element.getBoundingClientRect();
        const scale = this.detectAppScale();
        
        return {
            left: rect.left / scale,
            top: rect.top / scale,
            right: rect.right / scale,
            bottom: rect.bottom / scale,
            width: rect.width / scale,
            height: rect.height / scale,
            x: rect.x / scale,
            y: rect.y / scale
        };
    }
};

// Extend SypnexAPI with file explorer methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Show a file explorer modal for selecting files or directories
     * @param {object} options - Configuration options
     * @param {string} options.mode - 'open' for loading files, 'save' for saving files
     * @param {string} options.title - Modal title
     * @param {string} options.initialPath - Starting directory path
     * @param {string} options.fileName - Default filename for save mode
     * @param {string} options.fileExtension - Required file extension (e.g., '.txt')
     * @param {function} options.onSelect - Callback when file is selected
     * @param {function} options.onCancel - Callback when modal is cancelled
     * @returns {Promise<string>} - Selected file path or null if cancelled
     */
    async showFileExplorer(options = {}) {
        const {
            mode = 'open',
            title = mode === 'open' ? 'Open File' : 'Save File',
            initialPath = '/',
            fileName = '',
            fileExtension = '',
            onSelect = null,
            onCancel = null
        } = options;

        return new Promise((resolve) => {
            // Create modal container
            const modal = document.createElement('div');
            modal.className = 'sypnex-file-explorer-modal';
            modal.innerHTML = `
                <div class="sypnex-file-explorer-container">
                    <div class="sypnex-file-explorer-header">
                        <h3><i class="fas fa-folder-open" style="color: var(--accent-color);"></i> ${title}</h3>
                        <button class="sypnex-file-explorer-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                        
                        <div class="sypnex-file-explorer-toolbar">
                            <div class="sypnex-file-explorer-path">
                                <i class="fas fa-folder"></i>
                                <span class="sypnex-file-explorer-path-text">${initialPath}</span>
                            </div>
                            <div class="sypnex-file-explorer-hint">
                                <i class="fas fa-info-circle"></i> Click folders to navigate, click files to select
                            </div>
                            <div class="sypnex-file-explorer-actions">
                                <button class="sypnex-file-explorer-btn sypnex-file-explorer-new-folder">
                                    <i class="fas fa-folder-plus"></i> New Folder
                                </button>
                                <button class="sypnex-file-explorer-btn sypnex-file-explorer-refresh">
                                    <i class="fas fa-sync-alt"></i> Refresh
                                </button>
                            </div>
                        </div>
                        
                        <div class="sypnex-file-explorer-content">
                            <div class="sypnex-file-explorer-main">
                                <div class="sypnex-file-explorer-breadcrumb">
                                    <span class="sypnex-file-explorer-breadcrumb-item" data-path="/">Root</span>
                                </div>
                                
                                <div class="sypnex-file-explorer-list">
                                    <div class="sypnex-file-explorer-loading">
                                        <i class="fas fa-spinner fa-spin"></i> Loading...
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        ${mode === 'save' ? `
                        <div class="sypnex-file-explorer-save-section">
                            <label for="sypnex-file-explorer-filename">File Name:</label>
                            <input type="text" id="sypnex-file-explorer-filename" class="sypnex-file-explorer-input" 
                                   value="${fileName}" placeholder="Enter filename${fileExtension ? ' (required: ' + fileExtension + ')' : ''}">
                        </div>
                        ` : ''}
                        
                        <div class="sypnex-file-explorer-footer">
                            <button class="sypnex-file-explorer-btn sypnex-file-explorer-btn-secondary sypnex-file-explorer-cancel">
                                Cancel
                            </button>
                            <button class="sypnex-file-explorer-btn sypnex-file-explorer-btn-primary sypnex-file-explorer-select" disabled>
                                ${mode === 'open' ? 'Open' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to DOM
            document.body.appendChild(modal);

            // Add styles if not already added
            if (!document.getElementById('sypnex-file-explorer-styles')) {
                const style = document.createElement('style');
                style.id = 'sypnex-file-explorer-styles';
                style.textContent = `
                    .sypnex-file-explorer-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100vw;
                        height: 100vh;
                        z-index: 1000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        box-sizing: border-box;
                        background: rgba(0, 0, 0, 0.5);
                        backdrop-filter: blur(4px);
                    }
                    
                    .sypnex-file-explorer-overlay {
                        display: none;
                    }
                    
                    .sypnex-file-explorer-container {
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        border-radius: 12px;
                        width: 100%;
                        max-width: 800px;
                        max-height: 90vh;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                        backdrop-filter: blur(10px);
                        margin: 5% auto;
                        position: relative;
                    }
                    
                    .sypnex-file-explorer-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        border-radius: 12px 12px 0 0;
                    }
                    
                    .sypnex-file-explorer-header h3 {
                        margin: 0;
                        color: var(--text-primary);
                        font-size: 1.1em;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .sypnex-file-explorer-close {
                        background: none;
                        border: none;
                        color: var(--text-secondary);
                        font-size: 20px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                    }
                    
                    .sypnex-file-explorer-close:hover {
                        background: rgba(255, 71, 87, 0.1);
                        color: #ff4757;
                    }
                    
                    .sypnex-file-explorer-toolbar {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        min-height: 60px;
                    }
                    
                    .sypnex-file-explorer-hint {
                        color: var(--text-secondary);
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                        flex: 1;
                        justify-content: center;
                        white-space: nowrap;
                    }
                    
                    .sypnex-file-explorer-path {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        color: var(--text-secondary);
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                        font-size: 14px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-actions {
                        display: flex;
                        gap: 10px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-btn {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        color: var(--text-primary);
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                        font-weight: 500;
                        min-width: 120px;
                        justify-content: center;
                    }
                    
                    .sypnex-file-explorer-btn:hover {
                        background: rgba(0, 212, 255, 0.1);
                        border-color: var(--accent-color);
                        box-shadow: 0 2px 8px rgba(0, 212, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-btn:active {
                        background: rgba(0, 212, 255, 0.15);
                        box-shadow: 0 1px 4px rgba(0, 212, 255, 0.3);
                    }
                    
                    .sypnex-file-explorer-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        box-shadow: none;
                    }
                    
                    .sypnex-file-explorer-btn-primary {
                        background: var(--accent-color);
                        color: var(--primary-bg);
                        font-weight: 600;
                    }
                    
                    .sypnex-file-explorer-btn-primary:hover:not(:disabled) {
                        background: var(--accent-hover);
                    }
                    
                    .sypnex-file-explorer-btn-secondary {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(255, 255, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-btn-secondary:hover:not(:disabled) {
                        background: rgba(255, 255, 255, 0.2);
                    }
                    
                    .sypnex-file-explorer-content {
                        display: flex;
                        flex: 1;
                        min-height: 300px;
                        max-height: calc(90vh - 200px);
                        overflow: hidden;
                    }
                    
                    .sypnex-file-explorer-main {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .sypnex-file-explorer-breadcrumb {
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                    }
                    
                    .sypnex-file-explorer-breadcrumb-item {
                        color: var(--accent-color);
                        cursor: pointer;
                        transition: color 0.2s ease;
                    }
                    
                    .sypnex-file-explorer-breadcrumb-item:hover {
                        color: var(--accent-hover);
                    }
                    
                    .sypnex-file-explorer-list {
                        flex: 1;
                        overflow-y: auto;
                        padding: 20px;
                        max-height: 100%;
                    }
                    
                    .sypnex-file-explorer-loading {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        color: var(--text-secondary);
                        padding: 40px;
                    }
                    
                    .sypnex-file-explorer-item {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        padding: 12px;
                        cursor: pointer;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        margin-bottom: 5px;
                    }
                    
                    .sypnex-file-explorer-item:hover {
                        background: rgba(0, 212, 255, 0.1);
                    }
                    
                    .sypnex-file-explorer-item.selected {
                        background: rgba(0, 212, 255, 0.2);
                        border: 1px solid var(--accent-color);
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"] .sypnex-file-explorer-item-icon {
                        color: #ffd700;
                    }
                    
                    .sypnex-file-explorer-item-icon {
                        width: 20px;
                        text-align: center;
                        color: var(--accent-color);
                    }
                    
                    .sypnex-file-explorer-item-arrow {
                        color: var(--text-secondary);
                        font-size: 12px;
                        opacity: 0.7;
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"]:hover .sypnex-file-explorer-item-arrow {
                        color: #ffd700;
                        opacity: 1;
                    }
                    
                    .sypnex-file-explorer-item-name {
                        flex: 1;
                        color: var(--text-primary);
                        font-size: 14px;
                    }
                    
                    .sypnex-file-explorer-item-size {
                        color: var(--text-secondary);
                        font-size: 12px;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                    }
                    
                    .sypnex-file-explorer-save-section {
                        padding: 20px;
                        border-top: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-save-section label {
                        display: block;
                        margin-bottom: 10px;
                        color: var(--text-primary);
                        font-weight: 500;
                    }
                    
                    .sypnex-file-explorer-input {
                        width: 100%;
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        color: var(--text-primary);
                        padding: 10px 15px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                        transition: all 0.2s ease;
                        outline: none;
                    }
                    
                    .sypnex-file-explorer-input:focus {
                        border-color: var(--accent-color);
                        background: rgba(0, 212, 255, 0.05);
                    }
                    
                    .sypnex-file-explorer-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        padding: 20px;
                        border-top: 1px solid var(--glass-border);
                        background: var(--glass-bg);
                        border-radius: 0 0 12px 12px;
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-empty {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--text-secondary);
                        padding: 40px;
                        font-style: italic;
                    }
                    
                    /* Responsive Design */
                    @media (max-width: 768px) {
                        .sypnex-file-explorer-modal {
                            padding: 10px;
                            align-items: flex-start;
                            padding-top: 20px;
                        }
                        
                        .sypnex-file-explorer-container {
                            max-width: 100%;
                            max-height: calc(100vh - 40px);
                            margin: 0;
                        }
                        
                        .sypnex-file-explorer-header {
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-header h3 {
                            font-size: 1em;
                        }
                        
                        .sypnex-file-explorer-toolbar {
                            flex-direction: column;
                            gap: 10px;
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-hint {
                            order: -1;
                            font-size: 11px;
                        }
                        
                        .sypnex-file-explorer-actions {
                            justify-content: center;
                        }
                        
                        .sypnex-file-explorer-btn {
                            padding: 6px 12px;
                            font-size: 13px;
                        }
                        
                        .sypnex-file-explorer-breadcrumb,
                        .sypnex-file-explorer-save-section {
                            padding: 12px 15px;
                        }
                        
                        .sypnex-file-explorer-footer {
                            padding: 15px;
                            flex-direction: column;
                            gap: 8px;
                        }
                        
                        .sypnex-file-explorer-footer button {
                            width: 100%;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            // Add modal to DOM
            document.body.appendChild(modal);

            // Get references to elements
            const pathText = modal.querySelector('.sypnex-file-explorer-path-text');
            const breadcrumb = modal.querySelector('.sypnex-file-explorer-breadcrumb');
            const fileList = modal.querySelector('.sypnex-file-explorer-list');
            const selectBtn = modal.querySelector('.sypnex-file-explorer-select');
            const cancelBtn = modal.querySelector('.sypnex-file-explorer-cancel');
            const filenameInput = modal.querySelector('#sypnex-file-explorer-filename');
            const refreshBtn = modal.querySelector('.sypnex-file-explorer-refresh');
            const newFolderBtn = modal.querySelector('.sypnex-file-explorer-new-folder');

            let currentPath = initialPath;
            let selectedItem = null;

            // Load directory contents
            async function loadDirectory(path, isRefresh = false) {
                try {
                    // For refresh operations, add a subtle loading indicator instead of clearing content
                    if (isRefresh) {
                        // Add a subtle loading overlay to existing content
                        const existingContent = fileList.innerHTML;
                        if (!fileList.querySelector('.sypnex-file-explorer-refresh-overlay')) {
                            const overlay = document.createElement('div');
                            overlay.className = 'sypnex-file-explorer-refresh-overlay';
                            overlay.style.cssText = `
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: rgba(0, 0, 0, 0.1);
                                backdrop-filter: blur(1px);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                z-index: 10;
                                opacity: 0;
                                transition: opacity 0.2s ease;
                            `;
                            overlay.innerHTML = '<div style="color: var(--text-secondary); font-size: 12px;"><i class="fas fa-sync-alt fa-spin"></i> Updating...</div>';
                            fileList.style.position = 'relative';
                            fileList.appendChild(overlay);
                            
                            // Fade in the overlay
                            setTimeout(() => overlay.style.opacity = '1', 10);
                        }
                    } else {
                        // For initial loads, show the loading spinner
                        fileList.innerHTML = '<div class="sypnex-file-explorer-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
                    }
                    
                    const response = await this.listVirtualFiles(path);
                    
                    // Handle different response formats
                    let items = [];
                    if (Array.isArray(response)) {
                        items = response;
                    } else if (response && Array.isArray(response.items)) {
                        items = response.items;
                    } else if (response && typeof response === 'object') {
                        // Convert object to array if needed
                        items = Object.values(response);
                    }
                    
                    
                    if (!items || items.length === 0) {
                        fileList.innerHTML = '<div class="sypnex-file-explorer-empty">This directory is empty</div>';
                        fileList.style.position = '';
                        return;
                    }

                    // Ensure items is an array before sorting
                    if (!Array.isArray(items)) {
                        console.error('Items is not an array:', items);
                        fileList.innerHTML = '<div class="sypnex-file-explorer-empty">Error: Invalid response format</div>';
                        fileList.style.position = '';
                        return;
                    }

                    // Sort items: folders first, then files
                    const sortedItems = items.sort((a, b) => {
                        // Handle both 'type' and 'is_directory' fields for compatibility
                        const aIsDir = a.type === 'directory' || a.is_directory;
                        const bIsDir = b.type === 'directory' || b.is_directory;
                        
                        if (aIsDir && !bIsDir) return -1;
                        if (!aIsDir && bIsDir) return 1;
                        return a.name.localeCompare(b.name);
                    });

                    fileList.innerHTML = sortedItems.map(item => {
                        // Handle both 'type' and 'is_directory' fields for compatibility
                        const isDirectory = item.type === 'directory' || item.is_directory;
                        const icon = isDirectory ? 'fa-folder' : 'fa-file';
                        const size = isDirectory ? '' : this._formatFileSize(item.size || 0);
                        const itemPath = path === '/' ? `/${item.name}` : `${path}/${item.name}`;
                        
                        return `
                            <div class="sypnex-file-explorer-item" data-path="${itemPath}" data-type="${isDirectory ? 'directory' : 'file'}" data-name="${item.name}">
                                <div class="sypnex-file-explorer-item-icon">
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div class="sypnex-file-explorer-item-name">${item.name}</div>
                                <div class="sypnex-file-explorer-item-size">${size}</div>
                                ${isDirectory ? '<div class="sypnex-file-explorer-item-arrow"><i class="fas fa-chevron-right"></i></div>' : ''}
                            </div>
                        `;
                    }).join('');

                    // Reset fileList position in case it was modified for overlay
                    fileList.style.position = '';

                    // Update breadcrumb
                    updateBreadcrumb(path);
                    
                } catch (error) {
                    console.error('Error loading directory:', error);
                    fileList.innerHTML = '<div class="sypnex-file-explorer-empty">Error loading directory</div>';
                    fileList.style.position = '';
                }
            }

            // Update breadcrumb navigation
            function updateBreadcrumb(path) {
                const parts = path.split('/').filter(part => part.length > 0);
                let breadcrumbHTML = '<span class="sypnex-file-explorer-breadcrumb-item" data-path="/">Root</span>';
                
                let currentPath = '';
                parts.forEach((part, index) => {
                    currentPath += `/${part}`;
                    const isLast = index === parts.length - 1;
                    breadcrumbHTML += ` / <span class="sypnex-file-explorer-breadcrumb-item" data-path="${currentPath}" ${isLast ? 'style="color: var(--text-primary, #ffffff);"' : ''}>${part}</span>`;
                });
                
                breadcrumb.innerHTML = breadcrumbHTML;
            }

            // Format file size
            this._formatFileSize = function(bytes) {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            };

            // Event listeners
            if (fileList) {
                fileList.addEventListener('click', async (e) => {
                    const item = e.target.closest('.sypnex-file-explorer-item');
                    if (!item) return;

                    const itemPath = item.dataset.path;
                    const itemType = item.dataset.type;
                    const itemName = item.dataset.name;

                    if (itemType === 'directory') {
                        // Navigate to directory
                        currentPath = itemPath;
                        if (pathText) pathText.textContent = currentPath;
                        await loadDirectory.call(this, currentPath);
                    } else {
                        // Select file
                        document.querySelectorAll('.sypnex-file-explorer-item').forEach(el => el.classList.remove('selected'));
                        item.classList.add('selected');
                        selectedItem = { path: itemPath, name: itemName, type: itemType };
                        
                        if (mode === 'save' && filenameInput) {
                            filenameInput.value = itemName;
                        }
                        
                        if (selectBtn) selectBtn.disabled = false;
                    }
                });
            }

            if (breadcrumb) {
                breadcrumb.addEventListener('click', async (e) => {
                    const breadcrumbItem = e.target.closest('.sypnex-file-explorer-breadcrumb-item');
                    if (!breadcrumbItem) return;

                    const path = breadcrumbItem.dataset.path;
                    currentPath = path;
                    if (pathText) pathText.textContent = currentPath;
                    await loadDirectory.call(this, currentPath);
                });
            }

            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    // Add visual loading state without changing button content
                    const icon = refreshBtn.querySelector('i');
                    const originalClasses = icon.className;
                    
                    // Just change the icon class, don't touch innerHTML
                    icon.className = 'fas fa-sync-alt fa-spin';
                    refreshBtn.disabled = true;
                    refreshBtn.style.opacity = '0.7';
                    
                    try {
                        await loadDirectory.call(this, currentPath, true); // true = isRefresh
                    } finally {
                        // Restore button state
                        icon.className = originalClasses;
                        refreshBtn.disabled = false;
                        refreshBtn.style.opacity = '';
                    }
                });
            }

            if (newFolderBtn) {
                newFolderBtn.addEventListener('click', async () => {
                    const folderName = await this.showInputModal(
                        'Create New Folder',
                        'Enter folder name:',
                        {
                            placeholder: 'e.g., My Documents',
                            confirmText: 'Create',
                            icon: 'fas fa-folder-plus'
                        }
                    );
                    
                    if (!folderName) return;

                    try {
                        await this.createVirtualFolder(folderName, currentPath);
                        await loadDirectory.call(this, currentPath);
                        this.showNotification(`Folder "${folderName}" created successfully`, 'success');
                    } catch (error) {
                        this.showNotification(`Failed to create folder: ${error.message}`, 'error');
                    }
                });
            }

            if (selectBtn) {
                selectBtn.addEventListener('click', () => {
                    let selectedPath = null;
                    
                    if (mode === 'open') {
                        if (selectedItem) {
                            selectedPath = selectedItem.path;
                        }
                    } else {
                        // Save mode
                        const filename = filenameInput ? filenameInput.value.trim() : '';
                        if (!filename) {
                            this.showNotification('Please enter a filename', 'warning');
                            return;
                        }
                        
                        if (fileExtension && !filename.endsWith(fileExtension)) {
                            this.showNotification(`Filename must end with ${fileExtension}`, 'warning');
                            return;
                        }
                        
                        selectedPath = currentPath === '/' ? `/${filename}` : `${currentPath}/${filename}`;
                    }

                    if (selectedPath) {
                        if (onSelect) onSelect(selectedPath);
                        resolve(selectedPath);
                    } else {
                        this.showNotification('Please select a file', 'warning');
                        return;
                    }

                    modal.remove();
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    if (onCancel) onCancel();
                    resolve(null);
                    modal.remove();
                });
            }

            const closeBtn = modal.querySelector('.sypnex-file-explorer-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    if (onCancel) onCancel();
                    resolve(null);
                    modal.remove();
                });
            }

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (onCancel) onCancel();
                    resolve(null);
                    modal.remove();
                }
            });

            // Handle filename input for save mode
            if (filenameInput && selectBtn) {
                filenameInput.addEventListener('input', () => {
                    const filename = filenameInput.value.trim();
                    selectBtn.disabled = !filename;
                });
            }

            // Load initial directory
            loadDirectory.call(this, currentPath);
        });
    }
    
}); 
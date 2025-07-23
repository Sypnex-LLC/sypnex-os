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
                <div class="sypnex-file-explorer-overlay">
                    <div class="sypnex-file-explorer-container">
                        <div class="sypnex-file-explorer-header">
                            <h3>${title}</h3>
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
                            <div class="sypnex-file-explorer-sidebar">
                                <div class="sypnex-file-explorer-quick-access">
                                    <h4>Quick Access</h4>
                                    <div class="sypnex-file-explorer-quick-item" data-path="/">
                                        <i class="fas fa-home"></i> Root
                                    </div>
                                    <div class="sypnex-file-explorer-quick-item" data-path="/documents">
                                        <i class="fas fa-file-alt"></i> Documents
                                    </div>
                                    <div class="sypnex-file-explorer-quick-item" data-path="/downloads">
                                        <i class="fas fa-download"></i> Downloads
                                    </div>
                                </div>
                            </div>
                            
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

            // Add dragging functionality to the modal
            const makeModalDraggable = (modalElement) => {
                const header = modalElement.querySelector('.sypnex-file-explorer-header');
                const container = modalElement.querySelector('.sypnex-file-explorer-container');
                let isDragging = false;
                let dragOffset = { x: 0, y: 0 };

                header.addEventListener('mousedown', (e) => {
                    // Don't start dragging if clicking on the close button
                    if (e.target.closest('.sypnex-file-explorer-close')) return;
                    
                    isDragging = true;
                    // Use scaled coordinates for accurate positioning
                    const rect = fileExplorerUtils.getScaledBoundingClientRect(container);
                    const mouseCoords = fileExplorerUtils.screenToAppCoords(e.clientX, e.clientY);
                    dragOffset.x = mouseCoords.x - rect.left;
                    dragOffset.y = mouseCoords.y - rect.top;
                    e.preventDefault();
                });

                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    
                    // Use scaled coordinates for accurate positioning
                    const mouseCoords = fileExplorerUtils.screenToAppCoords(e.clientX, e.clientY);
                    const x = mouseCoords.x - dragOffset.x;
                    const y = mouseCoords.y - dragOffset.y;
                    
                    // Keep modal within viewport bounds (use scaled viewport dimensions)
                    const scale = fileExplorerUtils.detectAppScale();
                    const scaledViewportWidth = window.innerWidth / scale;
                    const scaledViewportHeight = window.innerHeight / scale;
                    const scaledContainerWidth = container.offsetWidth / scale;
                    const scaledContainerHeight = container.offsetHeight / scale;
                    
                    const maxX = scaledViewportWidth - scaledContainerWidth;
                    const maxY = scaledViewportHeight - scaledContainerHeight;
                    const boundedX = Math.max(0, Math.min(x, maxX));
                    const boundedY = Math.max(0, Math.min(y, maxY));
                    
                    // Convert back to screen coordinates for CSS positioning
                    const screenX = boundedX * scale;
                    const screenY = boundedY * scale;
                    
                    container.style.left = `${screenX}px`;
                    container.style.top = `${screenY}px`;
                    container.style.transform = 'none';
                });

                document.addEventListener('mouseup', () => {
                    isDragging = false;
                });
            };

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
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        box-sizing: border-box;
                    }
                    
                    .sypnex-file-explorer-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.8);
                        backdrop-filter: blur(10px);
                    }
                    
                    .sypnex-file-explorer-container {
                        background: var(--primary-bg, #0a0a0a);
                        border: 1px solid var(--border-color, #333333);
                        border-radius: 12px;
                        width: 800px;
                        max-width: 90vw;
                        max-height: 85vh;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                        position: relative;
                        transform: translate(-50%, -50%);
                        left: 50%;
                        top: 50%;
                        overflow: hidden;
                    }
                    
                    .sypnex-file-explorer-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 20px;
                        border-bottom: 1px solid var(--border-color, #333333);
                        cursor: move;
                        user-select: none;
                    }
                    
                    .sypnex-file-explorer-header h3 {
                        margin: 0;
                        color: var(--accent-color, #00d4ff);
                        font-size: 1.2em;
                    }
                    
                    .sypnex-file-explorer-close {
                        background: none;
                        border: none;
                        color: var(--text-secondary, #b0b0b0);
                        font-size: 18px;
                        cursor: pointer;
                        padding: 5px;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                    }
                    
                    .sypnex-file-explorer-close:hover {
                        background: rgba(255, 255, 255, 0.1);
                        color: var(--text-primary, #ffffff);
                    }
                    
                    .sypnex-file-explorer-toolbar {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--border-color, #333333);
                        background: var(--glass-bg, rgba(26, 26, 26, 0.8));
                    }
                    
                    .sypnex-file-explorer-hint {
                        color: var(--text-secondary, #b0b0b0);
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    }
                    
                    .sypnex-file-explorer-path {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        color: var(--text-secondary, #b0b0b0);
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                        font-size: 14px;
                    }
                    
                    .sypnex-file-explorer-actions {
                        display: flex;
                        gap: 10px;
                    }
                    
                    .sypnex-file-explorer-btn {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: var(--glass-bg, rgba(26, 26, 26, 0.8));
                        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
                        color: var(--text-primary, #ffffff);
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-size: 14px;
                    }
                    
                    .sypnex-file-explorer-btn:hover {
                        background: rgba(0, 212, 255, 0.1);
                        border-color: var(--accent-color, #00d4ff);
                    }
                    
                    .sypnex-file-explorer-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    
                    .sypnex-file-explorer-btn-primary {
                        background: var(--accent-color, #00d4ff);
                        color: var(--primary-bg, #0a0a0a);
                        font-weight: 600;
                    }
                    
                    .sypnex-file-explorer-btn-primary:hover:not(:disabled) {
                        background: var(--accent-hover, #00b8e6);
                    }
                    
                    .sypnex-file-explorer-content {
                        display: flex;
                        flex: 1;
                        min-height: 300px;
                        max-height: calc(85vh - 200px);
                        overflow: hidden;
                    }
                    
                    .sypnex-file-explorer-sidebar {
                        width: 200px;
                        border-right: 1px solid var(--border-color, #333333);
                        background: var(--glass-bg, rgba(26, 26, 26, 0.8));
                    }
                    
                    .sypnex-file-explorer-quick-access {
                        padding: 20px;
                    }
                    
                    .sypnex-file-explorer-quick-access h4 {
                        margin: 0 0 15px 0;
                        color: var(--accent-color, #00d4ff);
                        font-size: 1em;
                    }
                    
                    .sypnex-file-explorer-quick-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px;
                        cursor: pointer;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        color: var(--text-secondary, #b0b0b0);
                    }
                    
                    .sypnex-file-explorer-quick-item:hover {
                        background: rgba(0, 212, 255, 0.1);
                        color: var(--text-primary, #ffffff);
                    }
                    
                    .sypnex-file-explorer-main {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .sypnex-file-explorer-breadcrumb {
                        padding: 15px 20px;
                        border-bottom: 1px solid var(--border-color, #333333);
                        background: var(--glass-bg, rgba(26, 26, 26, 0.8));
                    }
                    
                    .sypnex-file-explorer-breadcrumb-item {
                        color: var(--accent-color, #00d4ff);
                        cursor: pointer;
                        transition: color 0.2s ease;
                    }
                    
                    .sypnex-file-explorer-breadcrumb-item:hover {
                        color: var(--accent-hover, #00b8e6);
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
                        color: var(--text-secondary, #b0b0b0);
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
                        border: 1px solid var(--accent-color, #00d4ff);
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"] {
                        background: rgba(255, 215, 0, 0.05);
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"]:hover {
                        background: rgba(255, 215, 0, 0.15);
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"] .sypnex-file-explorer-item-icon {
                        color: #ffd700;
                    }
                    
                    .sypnex-file-explorer-item-icon {
                        width: 20px;
                        text-align: center;
                        color: var(--accent-color, #00d4ff);
                    }
                    
                    .sypnex-file-explorer-item-arrow {
                        color: var(--text-secondary, #b0b0b0);
                        font-size: 12px;
                        opacity: 0.7;
                    }
                    
                    .sypnex-file-explorer-item[data-type="directory"]:hover .sypnex-file-explorer-item-arrow {
                        color: #ffd700;
                        opacity: 1;
                    }
                    
                    .sypnex-file-explorer-item-name {
                        flex: 1;
                        color: var(--text-primary, #ffffff);
                        font-size: 14px;
                    }
                    
                    .sypnex-file-explorer-item-size {
                        color: var(--text-secondary, #b0b0b0);
                        font-size: 12px;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                    }
                    
                    .sypnex-file-explorer-save-section {
                        padding: 20px;
                        border-top: 1px solid var(--border-color, #333333);
                        background: var(--glass-bg, rgba(26, 26, 26, 0.8));
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-save-section label {
                        display: block;
                        margin-bottom: 10px;
                        color: var(--text-primary, #ffffff);
                        font-weight: 500;
                    }
                    
                    .sypnex-file-explorer-input {
                        width: 100%;
                        background: var(--glass-bg, rgba(26, 26, 26, 0.8));
                        border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
                        color: var(--text-primary, #ffffff);
                        padding: 10px 15px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                    }
                    
                    .sypnex-file-explorer-input:focus {
                        border-color: var(--accent-color, #00d4ff);
                        outline: none;
                    }
                    
                    .sypnex-file-explorer-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        padding: 20px;
                        border-top: 1px solid var(--border-color, #333333);
                        background: var(--glass-bg, rgba(26, 26, 26, 0.8));
                        flex-shrink: 0;
                    }
                    
                    .sypnex-file-explorer-empty {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--text-secondary, #b0b0b0);
                        padding: 40px;
                        font-style: italic;
                    }
                `;
                document.head.appendChild(style);
            }

            // Add modal to DOM
            document.body.appendChild(modal);

            // Make modal draggable
            makeModalDraggable(modal);

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
            async function loadDirectory(path) {
                try {
                    fileList.innerHTML = '<div class="sypnex-file-explorer-loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
                    
                    const response = await this.listVirtualFiles(path);
                    console.log('VFS response:', response);
                    
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
                    
                    console.log('Processed items:', items);
                    
                    if (!items || items.length === 0) {
                        fileList.innerHTML = '<div class="sypnex-file-explorer-empty">This directory is empty</div>';
                        return;
                    }

                    // Ensure items is an array before sorting
                    if (!Array.isArray(items)) {
                        console.error('Items is not an array:', items);
                        fileList.innerHTML = '<div class="sypnex-file-explorer-empty">Error: Invalid response format</div>';
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

                    // Update breadcrumb
                    updateBreadcrumb(path);
                    
                } catch (error) {
                    console.error('Error loading directory:', error);
                    fileList.innerHTML = '<div class="sypnex-file-explorer-empty">Error loading directory</div>';
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

            modal.querySelectorAll('.sypnex-file-explorer-quick-item').forEach(item => {
                item.addEventListener('click', async () => {
                    const path = item.dataset.path;
                    currentPath = path;
                    if (pathText) pathText.textContent = currentPath;
                    await loadDirectory.call(this, currentPath);
                });
            });

            if (refreshBtn) {
                refreshBtn.addEventListener('click', async () => {
                    await loadDirectory.call(this, currentPath);
                });
            }

            if (newFolderBtn) {
                newFolderBtn.addEventListener('click', async () => {
                    const folderName = prompt('Enter folder name:');
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
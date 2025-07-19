// main.js - Entry point for Flow Editor
console.log('Flow Editor app loading...');

// Global variables (scoped to avoid global pollution)
let flowEditor = {
    nodes: new Map(),
    connections: new Map(),
    selectedNode: null,
    draggingNode: null,
    connectingFrom: null,
    canvas: null,
    nodeCounter: 0,
    isRunning: false,
    currentFilePath: null,
    isActive: true,
    // Canvas panning state
    isPanning: false,
    panStart: { x: 0, y: 0 },
    panOffset: { x: -5000, y: -5000 }, // Center the large canvas initially
    lastPanOffset: { x: -5000, y: -5000 },
    // Tag system
    tags: new Map(),
    tagCounter: 0,
    draggingTag: null,
    tagDragOffset: null,
    tagUpdateTimeout: null
};

// Initialize when DOM is ready
async function initFlowEditor() {
    console.log('Flow Editor initializing...');
    
    // Check if SypnexAPI is available (local variable in sandboxed environment)
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }

    console.log('SypnexAPI available:', sypnexAPI);
    console.log('App ID:', sypnexAPI.getAppId());
    console.log('Initialized:', sypnexAPI.isInitialized());
    
    // Initialize scale detection for app scaling compensation
    if (window.flowEditorUtils) {
        window.flowEditorUtils.initScaleDetection();
        console.log('Scale detection initialized');
    }
    
    // Test VFS API
    try {
        console.log('Testing VFS API...');
        const testResult = await sypnexAPI.listVirtualFiles('/');
        console.log('VFS test result:', testResult);
    } catch (error) {
        console.error('VFS API test failed:', error);
    }
    
    // Initialize canvas
    flowEditor.canvas = document.getElementById('flow-canvas');
    if (!flowEditor.canvas) {
        console.error('Flow canvas not found');
        return;
    }
    
    // Initialize canvas transform for panning
    window.canvasManager.updateCanvasTransform();
    
    // Load nodes from VFS
    console.log('About to load nodes from VFS...');
    await nodeRegistry.loadNodesFromVFS();
    console.log('Finished loading nodes from VFS');
    
    // Populate toolbox with loaded nodes
    console.log('About to populate toolbox...');
    populateToolbox();
    console.log('Finished populating toolbox');
    
    // Set up event handlers
    setupEventHandlers();
    
    // Connect to WebSocket for real-time updates
    connectWebSocket();
    
    // Handle window resize to update connections
    window.addEventListener('resize', () => {
        setTimeout(redrawAllConnections, 100);
    });
    
    // Handle app cleanup when window is unloaded
    window.addEventListener('beforeunload', cleanupFlowEditor);
    window.addEventListener('pagehide', cleanupFlowEditor);
    window.addEventListener('unload', cleanupFlowEditor);
    
    // Flow Editor loaded successfully (no notification needed)
    
    // Update filename display
    updateFilenameDisplay();
    
    console.log('Flow Editor initialization complete');
}

// Cleanup function to remove tooltips and event listeners
function cleanupFlowEditor() {
    // Mark app as inactive to prevent new tooltips
    flowEditor.isActive = false;
    
    // Remove any lingering tooltips (check multiple possible locations)
    const tooltips = document.querySelectorAll('.connection-tooltip, #connection-tooltip');
    tooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    });
    
    // Remove global event listeners
    if (window.flowEditorTooltipHandler) {
        document.removeEventListener('mousemove', window.flowEditorTooltipHandler);
        window.flowEditorTooltipHandler = null;
    }
    
    // Clear any other global references
    if (window.flowEditorTooltipHandler) {
        delete window.flowEditorTooltipHandler;
    }
    
    // Also remove any tooltips that might be in the body
    const bodyTooltips = document.body.querySelectorAll('.connection-tooltip');
    bodyTooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    });
    
    console.log('Flow Editor cleanup completed');
}

// Update filename display
function updateFilenameDisplay() {
    const filenameElement = document.getElementById('current-filename');
    if (filenameElement) {
        const filename = flowEditor.currentFilePath ? flowEditor.currentFilePath.split('/').pop() : 'untitled.flow';
        filenameElement.textContent = filename;
    }
}

// Populate toolbox with loaded nodes
function populateToolbox() {
    console.log('populateToolbox called');
    const toolbox = document.querySelector('.flow-toolbox');
    console.log('Toolbox element:', toolbox);
    if (!toolbox) {
        console.error('Toolbox not found');
        return;
    }
    
    // Clear existing toolbox content
    const toolboxContent = toolbox.querySelector('.toolbox-content');
    if (toolboxContent) {
        toolboxContent.innerHTML = '';
    }
    
    // Group nodes by category
    const categories = {};
    const allNodes = nodeRegistry.getAllNodeTypes();
    
    console.log('All loaded nodes:', allNodes);
    
    allNodes.forEach(nodeDef => {
        const category = nodeDef.category || 'other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(nodeDef);
    });
    
    console.log('Node categories:', categories);
    
    // Create toolbox sections for each category
    Object.entries(categories).forEach(([category, nodes]) => {
        const categorySection = document.createElement('div');
        categorySection.className = 'node-category';
        categorySection.innerHTML = `
            <h5>${category.charAt(0).toUpperCase() + category.slice(1)}</h5>
            ${nodes.map(nodeDef => `
                <button class="toolbox-node-btn" data-node-type="${nodeDef.id}" title="${nodeDef.description}">
                    <i class="${nodeDef.icon}"></i>
                    <span>${nodeDef.name}</span>
                </button>
            `).join('')}
        `;
        
        if (toolboxContent) {
            toolboxContent.appendChild(categorySection);
        }
    });
    
    // Re-attach event listeners
    document.querySelectorAll('.toolbox-node-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const nodeType = btn.getAttribute('data-node-type');
            if (nodeType) {
                addNode(nodeType);
            }
        });
    });
    
    console.log('Toolbox populated with', allNodes.length, 'nodes');
}

// Set up event handlers
function setupEventHandlers() {
    // Note: Toolbox node button event listeners are set up in populateToolbox()
    // to avoid duplicates when the toolbox is repopulated
    
    // Workflow actions
    document.getElementById('run-workflow')?.addEventListener('click', runWorkflow);
    document.getElementById('stop-workflow')?.addEventListener('click', stopWorkflow);
    document.getElementById('delete-selected')?.addEventListener('click', deleteSelectedNode);
    document.getElementById('clear-canvas')?.addEventListener('click', clearCanvas);
    document.getElementById('add-tag')?.addEventListener('click', window.tagManager.addTag);
    document.getElementById('reset-pan')?.addEventListener('click', window.canvasManager.resetCanvasPan);
    document.getElementById('save-flow')?.addEventListener('click', saveFlow);
    document.getElementById('save-flow-as')?.addEventListener('click', saveFlowAs);
    document.getElementById('load-flow')?.addEventListener('click', loadFlow);
    document.getElementById('clear-output')?.addEventListener('click', clearOutput);
    
    // Config panel toggle
    document.getElementById('toggle-config')?.addEventListener('click', toggleConfigPanel);
    
    // Initialize config panel state (without overriding icons)
    const configPanel = document.getElementById('flow-config-panel');
    if (configPanel) {
        // Default expanded (not collapsed)
        configPanel.classList.remove('collapsed');
    }
    
    // Toolbox toggle
    const toolbox = document.getElementById('flow-toolbox');
    const toolboxContent = document.getElementById('toolbox-content');
    const toggleToolboxBtn = document.getElementById('toggle-toolbox');
    if (toolbox && toolboxContent && toggleToolboxBtn) {
        // Default expanded (not collapsed)
        toolbox.classList.remove('collapsed');
        toolboxContent.style.display = '';

        toggleToolboxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleToolbox();
        });
    }
    
    // Output panel toggle
    const outputPanel = document.getElementById('flow-output-panel');
    const outputContent = document.getElementById('output-content');
    const toggleOutputBtn = document.getElementById('toggle-output');
    if (outputPanel && outputContent && toggleOutputBtn) {
        // Default collapsed
        outputPanel.classList.add('collapsed');
        outputContent.style.display = 'none';
        toggleOutputBtn.querySelector('i').className = 'fas fa-chevron-down';

        toggleOutputBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = outputPanel.classList.contains('collapsed');
            if (isCollapsed) {
                outputPanel.classList.remove('collapsed');
                outputContent.style.display = '';
                toggleOutputBtn.querySelector('i').className = 'fas fa-chevron-up';
            } else {
                outputPanel.classList.add('collapsed');
                outputContent.style.display = 'none';
                toggleOutputBtn.querySelector('i').className = 'fas fa-chevron-down';
            }
        });
    }
    
    // Canvas events
    flowEditor.canvas.addEventListener('click', window.canvasManager.handleCanvasClick);
    flowEditor.canvas.addEventListener('mousedown', window.canvasManager.startCanvasPan);
    
    // Document-level mouse events for smooth dragging and panning
    document.addEventListener('mousedown', window.canvasManager.handleDocumentMouseDown);
    document.addEventListener('mousemove', window.canvasManager.handleDocumentMouseMove);
    document.addEventListener('mouseup', window.canvasManager.handleDocumentMouseUp);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
}

// Connect to WebSocket server
async function connectWebSocket() {
    try {
        const connected = await sypnexAPI.connectSocket();
        if (connected) {
            console.log('Connected to WebSocket server');
            
            // Join flow editor room
            sypnexAPI.joinRoom('flow-editor');
            
            // Listen for messages
            sypnexAPI.on('flow_update', (data) => {
                console.log('Received flow update:', data);
                handleFlowUpdate(data);
            });
            
            // Send initial connection message
            sypnexAPI.sendMessage('flow_connected', {
                appId: sypnexAPI.getAppId(),
                timestamp: Date.now()
            }, 'flow-editor');
            
        } else {
            console.error('Failed to connect to WebSocket server');
        }
    } catch (error) {
        console.error('WebSocket connection error:', error);
    }
}

// Add a new node to the canvas (dynamic version)
function addNode(type) {
    const nodeDef = nodeRegistry.getNodeType(type);
    if (!nodeDef) {
        console.error('Unknown node type:', type);
        return;
    }
    
    const nodeId = `node_${++flowEditor.nodeCounter}`;
    
    // Calculate position relative to current viewport center
    const container = flowEditor.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    // Center of the viewport
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;
    
    // Convert viewport center to canvas coordinates (accounting for pan)
    const canvasCenterX = viewportCenterX - flowEditor.panOffset.x;
    const canvasCenterY = viewportCenterY - flowEditor.panOffset.y;
    
    // Add some random offset around the center
    const offsetX = (Math.random() - 0.5) * 200; // -100 to +100
    const offsetY = (Math.random() - 0.5) * 200; // -100 to +100
    
    const node = {
        id: nodeId,
        type: type,
        x: canvasCenterX + offsetX,
        y: canvasCenterY + offsetY,
        config: JSON.parse(JSON.stringify(nodeDef.config)), // Deep copy
        data: {}
    };
    
    // Initialize special node states
    if (type === 'repeater') {
        node.repeaterState = {
            count: 0,
            interval: null,
            isRunning: false
        };
    }
    
    flowEditor.nodes.set(nodeId, node);
    
    // Create node element using the renderer
    const nodeElement = nodeRenderer.createNodeElement(node);
    flowEditor.canvas.appendChild(nodeElement);
    
    // Send update via WebSocket
    if (sypnexAPI && sypnexAPI.sendMessage) {
        sypnexAPI.sendMessage('node_added', {
            nodeId: nodeId,
            type: type,
            position: { x: node.x, y: node.y }
        }, 'flow-editor');
    }
    
    console.log('Added node:', nodeId, type);
}

// Handle flow updates from WebSocket
function handleFlowUpdate(data) {
    console.log('Handling flow update:', data);
    // Handle real-time updates from other instances
}

// Save flow to virtual file system
async function saveFlow() {
    const flowData = {
        nodes: Array.from(flowEditor.nodes.values()).map(node => ({
            id: node.id,
            type: node.type,
            x: node.x,
            y: node.y,
            config: node.config
        })),
        connections: Array.from(flowEditor.connections.values()).map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to
        })),
        tags: Array.from(flowEditor.tags.values()),
        metadata: {
            savedAt: new Date().toISOString(),
            nodeCount: flowEditor.nodes.size,
            connectionCount: flowEditor.connections.size,
            tagCount: flowEditor.tags.size
        }
    };

    try {
        let filePath = flowEditor.currentFilePath;
        
        // If no current file path, show file explorer
        if (!filePath) {
            filePath = await sypnexAPI.showFileExplorer({
                mode: 'save',
                title: 'Save Flow File',
                initialPath: '/',
                fileName: 'flow_workflow.json',
                fileExtension: '.json',
                onSelect: (selectedPath) => {
                    console.log('File selected for saving:', selectedPath);
                },
                onCancel: () => {
                    console.log('File selection cancelled');
                }
            });

            if (!filePath) {
                return; // User cancelled
            }
        }

        // Save to virtual file system
        if (sypnexAPI && sypnexAPI.writeVirtualFileJSON) {
            await sypnexAPI.writeVirtualFileJSON(filePath, flowData);
            flowEditor.currentFilePath = filePath;
            updateFilenameDisplay();
            sypnexAPI.showNotification(`Flow saved to: ${filePath}`, 'success');
        } else {
            // Fallback to localStorage
            localStorage.setItem('flow_editor_saved_flow', JSON.stringify(flowData));
            console.log('Flow saved to localStorage:', flowData);
            if (sypnexAPI && sypnexAPI.showNotification) {
                sypnexAPI.showNotification('Flow saved to local storage!', 'success');
            }
        }
        console.log('Flow saved:', flowData);
    } catch (error) {
        console.error('Failed to save flow:', error);
        if (sypnexAPI && sypnexAPI.showNotification) {
            sypnexAPI.showNotification('Failed to save flow: ' + error.message, 'error');
        }
    }
}

// Save flow as (always show file explorer)
async function saveFlowAs() {
    const flowData = {
        nodes: Array.from(flowEditor.nodes.values()).map(node => ({
            id: node.id,
            type: node.type,
            x: node.x,
            y: node.y,
            config: node.config
        })),
        connections: Array.from(flowEditor.connections.values()).map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to
        })),
        tags: Array.from(flowEditor.tags.values()),
        metadata: {
            savedAt: new Date().toISOString(),
            nodeCount: flowEditor.nodes.size,
            connectionCount: flowEditor.connections.size,
            tagCount: flowEditor.tags.size
        }
    };

    try {
        // Show file explorer for saving
        const filePath = await sypnexAPI.showFileExplorer({
            mode: 'save',
            title: 'Save Flow File As',
            initialPath: '/',
            fileName: 'flow_workflow.json',
            fileExtension: '.json',
            onSelect: (selectedPath) => {
                console.log('File selected for saving as:', selectedPath);
            },
            onCancel: () => {
                console.log('File selection cancelled');
            }
        });

        if (!filePath) {
            return; // User cancelled
        }

        // Save to virtual file system
        if (sypnexAPI && sypnexAPI.writeVirtualFileJSON) {
            await sypnexAPI.writeVirtualFileJSON(filePath, flowData);
            flowEditor.currentFilePath = filePath;
            updateFilenameDisplay();
            sypnexAPI.showNotification(`Flow saved as: ${filePath}`, 'success');
        } else {
            // Fallback to localStorage
            localStorage.setItem('flow_editor_saved_flow', JSON.stringify(flowData));
            console.log('Flow saved to localStorage:', flowData);
            if (sypnexAPI && sypnexAPI.showNotification) {
                sypnexAPI.showNotification('Flow saved to local storage!', 'success');
            }
        }
        console.log('Flow saved as:', flowData);
    } catch (error) {
        console.error('Failed to save flow as:', error);
        if (sypnexAPI && sypnexAPI.showNotification) {
            sypnexAPI.showNotification('Failed to save flow as: ' + error.message, 'error');
        }
    }
}

// Load flow from virtual file system
async function loadFlow() {
    try {
        // Show file explorer for loading
        const filePath = await sypnexAPI.showFileExplorer({
            mode: 'open',
            title: 'Load Flow File',
            initialPath: '/',
            onSelect: (selectedPath) => {
                console.log('File selected for loading:', selectedPath);
            },
            onCancel: () => {
                console.log('File selection cancelled');
            }
        });

        if (!filePath) {
            return; // User cancelled
        }

        let flowData = null;
        
        // Try virtual file system first
        if (sypnexAPI && sypnexAPI.readVirtualFileJSON) {
            try {
                flowData = await sypnexAPI.readVirtualFileJSON(filePath);
            } catch (vfsError) {
                console.log('Failed to load from virtual file system, trying localStorage...');
                throw vfsError;
            }
        }
        
        // Fallback to localStorage (for backward compatibility)
        if (!flowData) {
            const localData = localStorage.getItem('flow_editor_saved_flow');
            if (localData) {
                flowData = JSON.parse(localData);
                console.log('Flow loaded from localStorage');
            }
        }
        
        if (flowData) {
            console.log('Flow loaded:', flowData);
            
            // Clear current canvas
            clearCanvas();
            
            // Reset pan offset to center of large canvas for new workflow
            flowEditor.panOffset = { x: -5000, y: -5000 };
            window.canvasManager.updateCanvasTransform();
            
            // Reset node counter to avoid ID conflicts
            flowEditor.nodeCounter = 0;
            
            // Load nodes
            if (flowData.nodes) {
                flowData.nodes.forEach(nodeData => {
                    // Create node with proper ID
                    const nodeId = nodeData.id;
                    const node = {
                        id: nodeId,
                        type: nodeData.type,
                        x: nodeData.x,
                        y: nodeData.y,
                        config: nodeData.config,
                        data: {}
                    };
                    
                    // Update node counter
                    const nodeNum = parseInt(nodeId.replace('node_', ''));
                    if (nodeNum > flowEditor.nodeCounter) {
                        flowEditor.nodeCounter = nodeNum;
                    }
                    
                    flowEditor.nodes.set(nodeId, node);
                    
                    // Create node element using the renderer and add to canvas
                    const nodeElement = nodeRenderer.createNodeElement(node);
                    flowEditor.canvas.appendChild(nodeElement);
                });
            }
            
            // Load connections
            if (flowData.connections) {
                flowData.connections.forEach(connData => {
                    createConnection(connData.from.nodeId, connData.from.portName, connData.to.nodeId, connData.to.portName);
                });
            }
            
            // Load tags
            if (flowData.tags) {
                flowData.tags.forEach(tagData => {
                    const tag = {
                        id: tagData.id,
                        name: tagData.name,
                        description: tagData.description || '',
                        x: tagData.x,
                        y: tagData.y,
                        color: tagData.color || '#4CAF50'
                    };
                    
                    // Update tag counter
                    const tagNum = parseInt(tagData.id.replace('tag_', ''));
                    if (tagNum > flowEditor.tagCounter) {
                        flowEditor.tagCounter = tagNum;
                    }
                    
                    flowEditor.tags.set(tagData.id, tag);
                    window.tagManager.createTagElement(tag);
                });
            }
            
            // Calculate center of loaded nodes and adjust pan to center them
            if (flowData.nodes && flowData.nodes.length > 0) {
                const minX = Math.min(...flowData.nodes.map(n => n.x));
                const maxX = Math.max(...flowData.nodes.map(n => n.x));
                const minY = Math.min(...flowData.nodes.map(n => n.y));
                const maxY = Math.max(...flowData.nodes.map(n => n.y));
                
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                // Get canvas container dimensions
                const container = flowEditor.canvas.parentElement;
                const containerRect = container.getBoundingClientRect();
                
                // Calculate pan offset to center the nodes in the viewport
                flowEditor.panOffset.x = -centerX + containerRect.width / 2;
                flowEditor.panOffset.y = -centerY + containerRect.height / 2;
                
                window.canvasManager.updateCanvasTransform();
            }
            
            // Redraw all connections after a small delay to ensure nodes are positioned
            setTimeout(() => {
                redrawAllConnections();
            }, 50);
            
            // Update tag panel
            window.tagManager.updateTagPanel();
            
            // Update current file path
            flowEditor.currentFilePath = filePath;
            updateFilenameDisplay();
            
            if (sypnexAPI && sypnexAPI.showNotification) {
                sypnexAPI.showNotification(`Flow loaded from: ${filePath}`, 'success');
            }
        } else {
            if (sypnexAPI && sypnexAPI.showNotification) {
                sypnexAPI.showNotification('No valid flow data found in the selected file.', 'warning');
            }
        }
    } catch (error) {
        console.error('Failed to load flow:', error);
        if (sypnexAPI && sypnexAPI.showNotification) {
            sypnexAPI.showNotification('Failed to load flow: ' + error.message, 'error');
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlowEditor);
} else {
    // DOM is already loaded
    initFlowEditor();
}

// Toggle config panel
function toggleConfigPanel() {
    const configPanel = document.getElementById('flow-config-panel');
    const toggleBtn = document.getElementById('toggle-config');
    const icon = toggleBtn.querySelector('i');
    
    if (configPanel.classList.contains('collapsed')) {
        // Expand
        configPanel.classList.remove('collapsed');
        icon.className = 'fas fa-chevron-right';
        toggleBtn.title = 'Collapse Configuration Panel';
    } else {
        // Collapse
        configPanel.classList.add('collapsed');
        icon.className = 'fas fa-chevron-left';
        toggleBtn.title = 'Expand Configuration Panel';
    }
}

// Toggle toolbox
function toggleToolbox() {
    const toolbox = document.getElementById('flow-toolbox');
    const toolboxContent = document.getElementById('toolbox-content');
    const toggleBtn = document.getElementById('toggle-toolbox');
    const icon = toggleBtn.querySelector('i');
    
    if (toolbox.classList.contains('collapsed')) {
        // Expand
        toolbox.classList.remove('collapsed');
        toolboxContent.style.display = '';
        icon.className = 'fas fa-chevron-left';
        toggleBtn.title = 'Collapse Toolbox';
    } else {
        // Collapse
        toolbox.classList.add('collapsed');
        toolboxContent.style.display = 'none';
        icon.className = 'fas fa-chevron-right';
        toggleBtn.title = 'Expand Toolbox';
    }
}

console.log('Flow Editor script loaded'); 
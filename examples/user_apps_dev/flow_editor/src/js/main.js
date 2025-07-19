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
    // Zoom state
    zoomLevel: 1.0,
    minZoom: 0.1,
    maxZoom: 3.0,
    zoomStep: 0.1,
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
    
    // Create SVG marker definitions for connection arrows
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#4CAF50');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    
    // Create a temporary SVG container for the marker definition
    const markerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    markerSvg.style.position = 'absolute';
    markerSvg.style.width = '0';
    markerSvg.style.height = '0';
    markerSvg.appendChild(defs);
    flowEditor.canvas.appendChild(markerSvg);
    
    // Initialize canvas transform for panning
    window.canvasManager.updateCanvasTransform();
    
    // Load nodes from VFS
    console.log('About to load nodes from VFS...');
    await nodeRegistry.loadNodesFromVFS();
    console.log('Finished loading nodes from VFS');
    
    // Populate toolbox with loaded nodes
    console.log('About to populate toolbox...');
    window.uiManager.populateToolbox();
    console.log('Finished populating toolbox');
    
    // Set up event handlers
    window.uiManager.setupEventHandlers();
    
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
    window.fileManager.updateFilenameDisplay();
    
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
    const center = window.flowEditorUtils ? 
        window.flowEditorUtils.getViewportCenterInCanvas() :
        { x: 5000, y: 5000 }; // Fallback to canvas center
    
    // Add some random offset around the center
    const offsetX = (Math.random() - 0.5) * 200; // -100 to +100
    const offsetY = (Math.random() - 0.5) * 200; // -100 to +100
    
    const node = {
        id: nodeId,
        type: type,
        x: center.x + offsetX,
        y: center.y + offsetY,
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlowEditor);
} else {
    // DOM is already loaded
    initFlowEditor();
}


console.log('Flow Editor script loaded'); 
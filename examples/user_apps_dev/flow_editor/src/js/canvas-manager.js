// Update canvas transform for panning and zooming
function updateCanvasTransform() {
    if (flowEditor.canvas) {
        const transform = `translate(${flowEditor.panOffset.x}px, ${flowEditor.panOffset.y}px) scale(${flowEditor.zoomLevel})`;
        flowEditor.canvas.style.transform = transform;
        
        // Update zoom level display
        const zoomDisplay = document.getElementById('zoom-level');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(flowEditor.zoomLevel * 100) + '%';
        }
    }
}

// Start canvas panning
function startCanvasPan(e) {
    // Only start panning if clicking directly on canvas (not on nodes or other elements)
    // and not already dragging a node
    if (e.target === flowEditor.canvas && !flowEditor.draggingNode) {
        flowEditor.isPanning = true;
        const mouseCoords = window.flowEditorUtils ?
            window.flowEditorUtils.getScaledMouseCoords(e) :
            { x: e.clientX, y: e.clientY };
        flowEditor.panStart = { x: mouseCoords.x, y: mouseCoords.y };
        flowEditor.lastPanOffset = { ...flowEditor.panOffset };
        flowEditor.canvas.style.cursor = 'grabbing';
        flowEditor.canvas.classList.add('panning');
        e.preventDefault();
        e.stopPropagation();
    }
}

// Update canvas panning
function updateCanvasPan(e) {
    if (flowEditor.isPanning) {
        const mouseCoords = window.flowEditorUtils ?
            window.flowEditorUtils.getScaledMouseCoords(e) :
            { x: e.clientX, y: e.clientY };
        const deltaX = mouseCoords.x - flowEditor.panStart.x;
        const deltaY = mouseCoords.y - flowEditor.panStart.y;

        flowEditor.panOffset.x = flowEditor.lastPanOffset.x + deltaX;
        flowEditor.panOffset.y = flowEditor.lastPanOffset.y + deltaY;

        updateCanvasTransform();
        e.preventDefault();
    }
}

// Stop canvas panning
function stopCanvasPan() {
    if (flowEditor.isPanning) {
        flowEditor.isPanning = false;
        flowEditor.canvas.style.cursor = 'grab';
        flowEditor.canvas.classList.remove('panning');
    }
}

// Reset canvas pan to center
function resetCanvasPan() {
    // Add smooth transition for reset
    flowEditor.canvas.style.transition = 'transform 0.3s ease-out';

    // Calculate center of all nodes if any exist
    if (flowEditor.nodes.size > 0) {
        const nodes = Array.from(flowEditor.nodes.values());
        const minX = Math.min(...nodes.map(n => n.x));
        const maxX = Math.max(...nodes.map(n => n.x));
        const minY = Math.min(...nodes.map(n => n.y));
        const maxY = Math.max(...nodes.map(n => n.y));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Get canvas container dimensions (scaled)
        const container = flowEditor.canvas.parentElement;
        const containerRect = window.flowEditorUtils ?
            window.flowEditorUtils.getScaledBoundingClientRect(container) :
            container.getBoundingClientRect();

        // Calculate pan offset to center the nodes in the viewport
        flowEditor.panOffset.x = -centerX + containerRect.width / 2;
        flowEditor.panOffset.y = -centerY + containerRect.height / 2;
    } else {
        // If no nodes, reset to center of the large canvas
        flowEditor.panOffset = { x: -5000, y: -5000 };
    }

    // Reset zoom to 100%
    flowEditor.zoomLevel = 1.0;

    updateCanvasTransform();

    // Remove transition after animation completes
    setTimeout(() => {
        flowEditor.canvas.style.transition = '';
    }, 300);
}

// Zoom functions
function zoomIn() {
    const newZoom = Math.min(flowEditor.zoomLevel + flowEditor.zoomStep, flowEditor.maxZoom);
    setZoomLevel(newZoom);
}

function zoomOut() {
    const newZoom = Math.max(flowEditor.zoomLevel - flowEditor.zoomStep, flowEditor.minZoom);
    setZoomLevel(newZoom);
}

function setZoomLevel(zoomLevel) {
    // Get the center of the canvas container for zoom origin
    const container = flowEditor.canvas.parentElement;
    const containerRect = window.flowEditorUtils ?
        window.flowEditorUtils.getScaledBoundingClientRect(container) :
        container.getBoundingClientRect();
    
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // Calculate the point in canvas coordinates that should remain fixed
    const canvasX = (centerX - flowEditor.panOffset.x) / flowEditor.zoomLevel;
    const canvasY = (centerY - flowEditor.panOffset.y) / flowEditor.zoomLevel;
    
    // Update zoom level
    flowEditor.zoomLevel = Math.max(flowEditor.minZoom, Math.min(flowEditor.maxZoom, zoomLevel));
    
    // Adjust pan offset to keep the center point fixed
    flowEditor.panOffset.x = centerX - canvasX * flowEditor.zoomLevel;
    flowEditor.panOffset.y = centerY - canvasY * flowEditor.zoomLevel;
    
    updateCanvasTransform();
    
    // Redraw connections after zoom
    setTimeout(() => {
        redrawAllConnections();
    }, 16);
}

function zoomToFit() {
    if (flowEditor.nodes.size === 0) {
        // If no nodes, reset to 100% zoom and center
        flowEditor.zoomLevel = 1.0;
        flowEditor.panOffset = { x: -5000, y: -5000 };
        updateCanvasTransform();
        return;
    }
    
    // Find bounds of all nodes
    const nodes = Array.from(flowEditor.nodes.values());
    const padding = 100; // Extra padding around nodes
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    nodes.forEach(node => {
        const nodeElement = document.getElementById(node.id);
        if (nodeElement) {
            const rect = nodeElement.getBoundingClientRect();
            minX = Math.min(minX, node.x);
            maxX = Math.max(maxX, node.x + rect.width);
            minY = Math.min(minY, node.y);
            maxY = Math.max(maxY, node.y + rect.height);
        }
    });
    
    // Add padding
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Get container dimensions
    const container = flowEditor.canvas.parentElement;
    const containerRect = window.flowEditorUtils ?
        window.flowEditorUtils.getScaledBoundingClientRect(container) :
        container.getBoundingClientRect();
    
    // Calculate zoom to fit
    const zoomX = containerRect.width / contentWidth;
    const zoomY = containerRect.height / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, flowEditor.maxZoom);
    
    // Set zoom level
    flowEditor.zoomLevel = Math.max(flowEditor.minZoom, newZoom);
    
    // Center the content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    flowEditor.panOffset.x = containerRect.width / 2 - centerX * flowEditor.zoomLevel;
    flowEditor.panOffset.y = containerRect.height / 2 - centerY * flowEditor.zoomLevel;
    
    // Add smooth transition
    flowEditor.canvas.style.transition = 'transform 0.3s ease-out';
    updateCanvasTransform();
    
    // Remove transition after animation
    setTimeout(() => {
        flowEditor.canvas.style.transition = '';
        redrawAllConnections();
    }, 300);
}

// Handle mouse wheel zoom
function handleMouseWheel(e) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        // Get mouse position relative to container
        const container = flowEditor.canvas.parentElement;
        const containerRect = window.flowEditorUtils ?
            window.flowEditorUtils.getScaledBoundingClientRect(container) :
            container.getBoundingClientRect();
        
        const mouseCoords = window.flowEditorUtils ?
            window.flowEditorUtils.getScaledMouseCoords(e) :
            { x: e.clientX, y: e.clientY };
        
        const mouseX = mouseCoords.x - containerRect.left;
        const mouseY = mouseCoords.y - containerRect.top;
        
        // Calculate zoom delta
        const zoomDelta = e.deltaY > 0 ? -flowEditor.zoomStep : flowEditor.zoomStep;
        const newZoom = Math.max(flowEditor.minZoom, Math.min(flowEditor.maxZoom, flowEditor.zoomLevel + zoomDelta));
        
        if (newZoom !== flowEditor.zoomLevel) {
            // Calculate the point in canvas coordinates that should remain fixed (under mouse)
            const canvasX = (mouseX - flowEditor.panOffset.x) / flowEditor.zoomLevel;
            const canvasY = (mouseY - flowEditor.panOffset.y) / flowEditor.zoomLevel;
            
            // Update zoom level
            flowEditor.zoomLevel = newZoom;
            
            // Adjust pan offset to keep the mouse point fixed
            flowEditor.panOffset.x = mouseX - canvasX * flowEditor.zoomLevel;
            flowEditor.panOffset.y = mouseY - canvasY * flowEditor.zoomLevel;
            
            updateCanvasTransform();
            
            // Redraw connections after zoom
            clearTimeout(flowEditor.zoomRedrawTimeout);
            flowEditor.zoomRedrawTimeout = setTimeout(() => {
                redrawAllConnections();
            }, 50);
        }
    }
}

// Handle canvas click events
function handleCanvasClick(e) {
    if (e.target === flowEditor.canvas) {
        // Deselect node
        if (flowEditor.selectedNode) {
            const nodeElement = document.getElementById(flowEditor.selectedNode);
            if (nodeElement) nodeElement.classList.remove('selected');
            flowEditor.selectedNode = null;
            document.getElementById('node-config').innerHTML = '<p class="text-muted">Select a node to configure it</p>';
        }
    }
}

// Handle document mouse events for smooth dragging
function handleDocumentMouseDown(e) {
    // Don't start dragging if clicking on UI elements
    if (e.target.closest('.flow-toolbar') || 
        e.target.closest('.flow-config-panel') || 
        e.target.closest('.flow-output-panel') ||
        e.target.closest('.node-delete-btn')) {
        return;
    }
    
    // Don't start dragging if we're panning
    if (flowEditor.isPanning) {
        return;
    }
    
    // Only allow dragging from the node header
    const headerElement = e.target.closest('.flow-node-header');
    if (!headerElement) return;
    const nodeElement = headerElement.closest('.flow-node');
    if (!nodeElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    const nodeId = nodeElement.id;
    const node = flowEditor.nodes.get(nodeId);
    
    if (node) {
        flowEditor.draggingNode = nodeId;
        
        // Calculate offset from mouse to node corner, accounting for zoom
        const container = flowEditor.canvas.parentElement;
        const containerRect = window.flowEditorUtils ? 
            window.flowEditorUtils.getScaledBoundingClientRect(container) : 
            container.getBoundingClientRect();
        
        const mouseCoords = window.flowEditorUtils ? 
            window.flowEditorUtils.getScaledMouseCoords(e) : 
            { x: e.clientX, y: e.clientY };
        
        // Convert mouse position to canvas coordinates
        const canvasMouseX = (mouseCoords.x - containerRect.left - flowEditor.panOffset.x) / flowEditor.zoomLevel;
        const canvasMouseY = (mouseCoords.y - containerRect.top - flowEditor.panOffset.y) / flowEditor.zoomLevel;
        
        // Calculate offset in canvas coordinates
        flowEditor.dragOffset = {
            x: (canvasMouseX - node.x) * flowEditor.zoomLevel,
            y: (canvasMouseY - node.y) * flowEditor.zoomLevel
        };
        
        nodeElement.style.cursor = 'grabbing';
        nodeElement.style.zIndex = '1000'; // Bring to front while dragging
        
        // Cache container rect for performance
        flowEditor.canvasRect = containerRect;
    }
}

function handleDocumentMouseMove(e) {
    // Handle canvas panning
    if (flowEditor.isPanning) {
        updateCanvasPan(e);
        return;
    }
    
    // Get scaled coordinates
    const mouseCoords = window.flowEditorUtils ? 
        window.flowEditorUtils.getScaledMouseCoords(e) : 
        { x: e.clientX, y: e.clientY };
    
    // Handle tag dragging
    if (flowEditor.draggingTag && flowEditor.tagDragOffset) {
        const tag = flowEditor.tags.get(flowEditor.draggingTag);
        if (tag) {
            // Get container dimensions for coordinate conversion
            const container = flowEditor.canvas.parentElement;
            const containerRect = window.flowEditorUtils ? 
                window.flowEditorUtils.getScaledBoundingClientRect(container) : 
                container.getBoundingClientRect();
            
            // Convert mouse coordinates to canvas coordinates, accounting for pan and zoom
            const canvasMouseX = (mouseCoords.x - containerRect.left - flowEditor.panOffset.x) / flowEditor.zoomLevel;
            const canvasMouseY = (mouseCoords.y - containerRect.top - flowEditor.panOffset.y) / flowEditor.zoomLevel;
            
            // Calculate new position with offset (drag offset is also in screen coordinates, so convert it)
            const dragOffsetX = flowEditor.tagDragOffset.x / flowEditor.zoomLevel;
            const dragOffsetY = flowEditor.tagDragOffset.y / flowEditor.zoomLevel;
            
            tag.x = canvasMouseX - dragOffsetX;
            tag.y = canvasMouseY - dragOffsetY;
            
            const tagElement = document.getElementById(flowEditor.draggingTag);
            if (tagElement) {
                // Use left/top for positioning
                tagElement.style.left = tag.x + 'px';
                tagElement.style.top = tag.y + 'px';
            }
            
            // Throttle updates for better performance
            if (!flowEditor.tagUpdateTimeout) {
                flowEditor.tagUpdateTimeout = setTimeout(() => {
                    flowEditor.tagUpdateTimeout = null;
                }, 16); // ~60fps
            }
        }
        return;
    }
    
    if (flowEditor.draggingNode && flowEditor.dragOffset) {
        const node = flowEditor.nodes.get(flowEditor.draggingNode);
        if (node) {
            // Get container dimensions for coordinate conversion
            const container = flowEditor.canvas.parentElement;
            const containerRect = window.flowEditorUtils ? 
                window.flowEditorUtils.getScaledBoundingClientRect(container) : 
                container.getBoundingClientRect();
            
            // Convert mouse coordinates to canvas coordinates, accounting for pan and zoom
            const canvasMouseX = (mouseCoords.x - containerRect.left - flowEditor.panOffset.x) / flowEditor.zoomLevel;
            const canvasMouseY = (mouseCoords.y - containerRect.top - flowEditor.panOffset.y) / flowEditor.zoomLevel;
            
            // Calculate new position with offset (drag offset is also in screen coordinates, so convert it)
            const dragOffsetX = flowEditor.dragOffset.x / flowEditor.zoomLevel;
            const dragOffsetY = flowEditor.dragOffset.y / flowEditor.zoomLevel;
            
            node.x = canvasMouseX - dragOffsetX;
            node.y = canvasMouseY - dragOffsetY;
            
            const nodeElement = document.getElementById(flowEditor.draggingNode);
            if (nodeElement) {
                nodeElement.style.left = node.x + 'px';
                nodeElement.style.top = node.y + 'px';
                
                // Update all connections for this node (throttled for performance)
                if (!flowEditor.updateTimeout) {
                    flowEditor.updateTimeout = setTimeout(() => {
                        updateConnectionsForNode(node.id);
                        flowEditor.updateTimeout = null;
                    }, 16); // ~60fps
                }
            }
        }
    }
}

function handleDocumentMouseUp(e) {
    // Handle canvas panning stop
    if (flowEditor.isPanning) {
        stopCanvasPan();
        return;
    }
    
    // Handle tag dragging stop
    if (flowEditor.draggingTag) {
        const tagElement = document.getElementById(flowEditor.draggingTag);
        if (tagElement) {
            tagElement.style.cursor = 'pointer';
            tagElement.style.zIndex = '100';
            tagElement.style.transition = 'box-shadow 0.2s ease, transform 0.2s ease'; // Restore transitions
        }
        
        flowEditor.draggingTag = null;
        flowEditor.tagDragOffset = null;
        return;
    }
    
    if (flowEditor.draggingNode) {
        const nodeElement = document.getElementById(flowEditor.draggingNode);
        if (nodeElement) {
            nodeElement.style.cursor = 'grab';
            nodeElement.style.zIndex = ''; // Reset z-index
        }
        
        // Clear any pending connection updates
        if (flowEditor.updateTimeout) {
            clearTimeout(flowEditor.updateTimeout);
            flowEditor.updateTimeout = null;
        }
        
        // Final connection update
        updateConnectionsForNode(flowEditor.draggingNode);
        
        flowEditor.draggingNode = null;
        flowEditor.dragOffset = null;
        flowEditor.canvasRect = null;
    }
}


// Example: canvas-manager.js
window.canvasManager = {
    updateCanvasTransform,
    startCanvasPan,
    updateCanvasPan,
    stopCanvasPan,
    resetCanvasPan,
    handleCanvasClick,
    handleDocumentMouseDown,
    handleDocumentMouseMove,
    handleDocumentMouseUp,
    zoomIn,
    zoomOut,
    setZoomLevel,
    zoomToFit,
    handleMouseWheel
};
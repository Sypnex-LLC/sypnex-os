// Update canvas transform for panning
function updateCanvasTransform() {
    if (flowEditor.canvas) {
        flowEditor.canvas.style.transform = `translate(${flowEditor.panOffset.x}px, ${flowEditor.panOffset.y}px)`;
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

    updateCanvasTransform();

    // Remove transition after animation completes
    setTimeout(() => {
        flowEditor.canvas.style.transition = '';
    }, 300);
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
        
        // Calculate offset from mouse to node corner
        const rect = nodeElement.getBoundingClientRect();
        flowEditor.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        nodeElement.style.cursor = 'grabbing';
        nodeElement.style.zIndex = '1000'; // Bring to front while dragging
        
        // Cache canvas rect for performance
        flowEditor.canvasRect = flowEditor.canvas.getBoundingClientRect();
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
            // Use cached canvas rect for better performance (scaled)
            const canvasRect = flowEditor.canvasRect || 
                (window.flowEditorUtils ? 
                    window.flowEditorUtils.getScaledBoundingClientRect(flowEditor.canvas) : 
                    flowEditor.canvas.getBoundingClientRect());
            
            // Calculate new position with offset
            tag.x = mouseCoords.x - canvasRect.left - flowEditor.tagDragOffset.x;
            tag.y = mouseCoords.y - canvasRect.top - flowEditor.tagDragOffset.y;
            
            const tagElement = document.getElementById(flowEditor.draggingTag);
            if (tagElement) {
                // Use left/top for positioning (revert to original method)
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
            // Use cached canvas rect for better performance (scaled)
            const canvasRect = flowEditor.canvasRect || 
                (window.flowEditorUtils ? 
                    window.flowEditorUtils.getScaledBoundingClientRect(flowEditor.canvas) : 
                    flowEditor.canvas.getBoundingClientRect());
            
            // Calculate new position with offset
            node.x = mouseCoords.x - canvasRect.left - flowEditor.dragOffset.x;
            node.y = mouseCoords.y - canvasRect.top - flowEditor.dragOffset.y;
            
            // Allow nodes to be placed anywhere in the workspace (no bounds restriction)
            // This enables using the full panned canvas area
            
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
    handleDocumentMouseUp
};
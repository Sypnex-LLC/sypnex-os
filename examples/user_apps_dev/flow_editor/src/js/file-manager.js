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
            
            // Load connections after nodes are fully created and positioned
            if (flowData.connections) {
                flowData.connections.forEach(connData => {
                    createConnection(connData.from.nodeId, connData.from.portName, connData.to.nodeId, connData.to.portName);
                });
                
                // Immediately redraw connections now that all SVG elements exist
                redrawAllConnections();
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
            
            // Final connection redraw after all positioning is complete
            redrawAllConnections();
            
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

// Update filename display
function updateFilenameDisplay() {
    const filenameElement = document.getElementById('current-filename');
    if (filenameElement) {
        const filename = flowEditor.currentFilePath ? flowEditor.currentFilePath.split('/').pop() : 'untitled.flow';
        filenameElement.textContent = filename;
    }
}


// Export to global scope
window.fileManager = {
    saveFlow,
    saveFlowAs,
    loadFlow,
    updateFilenameDisplay
};
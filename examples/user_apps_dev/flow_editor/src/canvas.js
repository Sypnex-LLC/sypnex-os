// canvas.js - Canvas event handlers and drawing logic for Flow Editor

// Start dragging a node
function startDraggingNode(nodeId, e) {
    e.preventDefault();
    e.stopPropagation();
    
    const node = flowEditor.nodes.get(nodeId);
    if (!node) return;
    
    flowEditor.draggingNode = nodeId;
    
    // Calculate offset from mouse to node corner using scaled coordinates
    const nodeElement = document.getElementById(nodeId);
    const rect = window.flowEditorUtils ? 
        window.flowEditorUtils.getScaledBoundingClientRect(nodeElement) : 
        nodeElement.getBoundingClientRect();
    const mouseCoords = window.flowEditorUtils ? 
        window.flowEditorUtils.getScaledMouseCoords(e) : 
        { x: e.clientX, y: e.clientY };
    
    flowEditor.dragOffset = {
        x: mouseCoords.x - rect.left,
        y: mouseCoords.y - rect.top
    };
    
    nodeElement.style.cursor = 'grabbing';
    nodeElement.style.zIndex = '1000'; // Bring to front while dragging
    
    // Cache canvas rect for performance (scaled)
    flowEditor.canvasRect = window.flowEditorUtils ? 
        window.flowEditorUtils.getScaledBoundingClientRect(flowEditor.canvas) : 
        flowEditor.canvas.getBoundingClientRect();
}

// Select a node
function selectNode(nodeId) {
    // Remove previous selection
    document.querySelectorAll('.flow-node.selected').forEach(node => {
        node.classList.remove('selected');
    });
    
    // Select new node
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
        nodeElement.classList.add('selected');
        flowEditor.selectedNode = nodeId;
        showNodeConfig(nodeId);
    }
}

// Show node configuration
function showNodeConfig(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node) return;
    
    const nodeDef = nodeRegistry.getNodeType(node.type);
    if (!nodeDef) return;
    
    // Show config panel with node configuration
    const configPanel = document.getElementById('node-config');
    if (configPanel) {
        let configHtml = `<h4>${nodeDef.name} Configuration</h4>`;
        
        // Add special content display for different node types
        if (node.type === 'display' && node.lastContent) {
            configHtml += `
                <div class="config-group">
                    <label>Last Content</label>
                    <div class="content-display">
                        <pre class="content-text">${escapeHtml(node.lastContent)}</pre>
                        <div class="content-info">
                            <small>Format: ${node.lastFormat} • Length: ${node.lastContent.length} chars</small>
                        </div>
                    </div>
                </div>
            `;
        } else if (node.type === 'image' && node.lastImageData) {
            configHtml += `
                <div class="config-group">
                    <label>Image Preview</label>
                    <div class="image-display">
                        <img src="${node.lastImageUrl}" alt="Image preview" style="max-width: 200px; max-height: 150px; border: 1px solid #ccc; border-radius: 4px;">
                        <div class="image-info">
                            <small>Size: ${node.lastImageInfo?.width || '?'}x${node.lastImageInfo?.height || '?'} • Format: ${node.lastImageInfo?.format || '?'}</small>
                        </div>
                        <button class="btn btn-sm btn-primary mt-2 view-full-image-btn" data-node-id="${nodeId}">View Full Image</button>
                    </div>
                </div>
            `;
        } else if (node.type === 'audio' && node.lastAudioData) {
            configHtml += `
                <div class="config-group">
                    <label>Audio Controls</label>
                    <div class="audio-display">
                        <div class="audio-info">
                            <small>Audio loaded successfully</small>
                        </div>
                        <div class="audio-controls mt-2">
                            <button class="btn btn-sm btn-success play-audio-btn" data-node-id="${nodeId}">
                                <i class="fas fa-play"></i> Play
                            </button>
                            <button class="btn btn-sm btn-danger stop-audio-btn" data-node-id="${nodeId}">
                                <i class="fas fa-stop"></i> Stop
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (node.type === 'vfs_load') {
            configHtml += `
                <div class="config-group">
                    <label>VFS Load Status</label>
                    <div class="vfs-load-info">
                        <small>Last loaded: ${node.lastLoadedFile || 'None'}</small>
                    </div>
                </div>
            `;
        } else if (node.type === 'llm_chat' && node.lastResponse) {
            configHtml += `
                <div class="config-group">
                    <label>Last Response</label>
                    <div class="content-display">
                        <pre class="content-text">${escapeHtml(node.lastResponse)}</pre>
                        <div class="content-info">
                            <small>Tokens: ${node.lastUsage?.total_tokens || 0} • Model: ${node.lastModel || 'Unknown'}</small>
                        </div>
                    </div>
                </div>
            `;
        } else if (node.type === 'repeater') {
            const isRunning = node.repeaterState && node.repeaterState.isRunning;
            const count = node.repeaterState ? node.repeaterState.count : 0;
            configHtml += `
                <div class="config-group">
                    <label>Repeater Controls</label>
                    <div class="repeater-display">
                        <div class="repeater-info">
                            <small>Status: ${isRunning ? 'Running' : 'Stopped'} • Count: ${count}</small>
                        </div>
                        <div class="repeater-controls mt-2">
                            <button class="btn btn-sm btn-success start-repeater-btn" data-node-id="${nodeId}" ${isRunning ? 'disabled' : ''}>
                                <i class="fas fa-play"></i> Start
                            </button>
                            <button class="btn btn-sm btn-danger stop-repeater-btn" data-node-id="${nodeId}" ${!isRunning ? 'disabled' : ''}>
                                <i class="fas fa-stop"></i> Stop
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Show input mappings configuration (what this node receives from other nodes)
        const inputConnections = Array.from(flowEditor.connections.values())
            .filter(conn => conn.to.nodeId === nodeId);
        
        if (inputConnections.length > 0) {
            configHtml += `
                <div class="config-group">
                    <label>Receiving From</label>
                    <div class="input-mappings-config">
            `;
            
            for (const conn of inputConnections) {
                const sourceNode = flowEditor.nodes.get(conn.from.nodeId);
                const sourceNodeDef = nodeRegistry.getNodeType(sourceNode?.type || 'unknown');
                const sourceNodeName = sourceNodeDef?.name || sourceNode?.type || 'unknown';
                const selectedOutput = sourceNodeDef?.outputs?.find(output => output.id === conn.from.portName);
                const outputName = selectedOutput ? selectedOutput.name : conn.from.portName;
                
                // Simple: Show what I'm receiving and let me choose my input port
                configHtml += `
                    <div class="input-mapping-config">
                        <div class="connection-header">From ${sourceNodeName} (${outputName})</div>
                        <div class="connection-controls">
                            <div class="control-row">
                                <label>To my input:</label>
                                <select id="input_target_${nodeId}|${conn.to.portName}" class="input-target-select">
                                    <option value="">Select...</option>
                                    ${nodeDef.inputs.map(input => 
                                        `<option value="${input.id}" ${conn.to.portName === input.id ? 'selected' : ''}>${input.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            configHtml += `
                    </div>
                </div>
            `;
        }
        
        // Show output mappings configuration (what other nodes receive from this node)
        const outputConnections = Array.from(flowEditor.connections.values())
            .filter(conn => conn.from.nodeId === nodeId);
        
        if (outputConnections.length > 0) {
            configHtml += `
                <div class="config-group">
                    <label>Sending To</label>
                    <div class="output-mappings-config">
            `;
            
            for (const conn of outputConnections) {
                const targetNode = flowEditor.nodes.get(conn.to.nodeId);
                const targetNodeDef = nodeRegistry.getNodeType(targetNode?.type || 'unknown');
                const targetNodeName = targetNodeDef?.name || targetNode?.type || 'unknown';
                
                // Get available outputs from THIS node (source node)
                const sourceNodeDef = nodeRegistry.getNodeType(node.type);
                const availableOutputs = sourceNodeDef?.outputs || [];
                
                configHtml += `
                    <div class="output-mapping-config">
                        <div class="connection-header">To ${targetNodeName}</div>
                        <div class="connection-controls">
                            <div class="control-row">
                                <label>Send output:</label>
                                <select id="output_mapping_${nodeId}|${conn.from.portName}|${conn.to.nodeId}" class="output-mapping-select">
                                    <option value="">Select...</option>
                                    ${availableOutputs.map(output => 
                                        `<option value="${output.id}" ${conn.from.portName === output.id ? 'selected' : ''}>${output.name}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            configHtml += `
                    </div>
                </div>
            `;
        }
        
        // Generate configuration fields
        for (const [key, config] of Object.entries(nodeDef.config)) {
            configHtml += `
                <div class="config-group">
                    <label for="config_${nodeId}_${key}">${config.label}</label>
            `;
            
            if (config.type === 'select') {
                configHtml += `<select id="config_${nodeId}_${key}">`;
                config.options.forEach(option => {
                    const selected = node.config[key].value === option ? 'selected' : '';
                    configHtml += `<option value="${option}" ${selected}>${option}</option>`;
                });
                configHtml += `</select>`;
            } else if (config.type === 'textarea') {
                configHtml += `<textarea id="config_${nodeId}_${key}">${node.config[key].value}</textarea>`;
            } else if (config.type === 'number') {
                const min = config.min ? ` min="${config.min}"` : '';
                const max = config.max ? ` max="${config.max}"` : '';
                const step = config.step ? ` step="${config.step}"` : '';
                configHtml += `<input type="number" id="config_${nodeId}_${key}" value="${node.config[key].value}"${min}${max}${step}>`;
            } else {
                configHtml += `<input type="${config.type}" id="config_${nodeId}_${key}" value="${node.config[key].value}">`;
            }
            
            configHtml += `</div>`;
        }
        
        configPanel.innerHTML = configHtml;
        
        // Add event listeners for mapping selects
        // No input mapping selects anymore - nodes can't control what they receive
        
        const inputTargetSelects = configPanel.querySelectorAll('.input-target-select');
        inputTargetSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const [nodeId, currentInputPort] = e.target.id.replace('input_target_', '').split('|');
                const selectedInputPort = e.target.value;
                console.log('Changing input target:', nodeId, currentInputPort, '→', selectedInputPort);
                // Find the connection
                const connection = Array.from(flowEditor.connections.values()).find(conn =>
                    conn.to.nodeId === nodeId && conn.to.portName === currentInputPort
                );
                if (connection && selectedInputPort) {
                    // Remove all connections from the same fromNode to this node (regardless of port)
                    const connectionsToRemove = Array.from(flowEditor.connections.values()).filter(conn =>
                        conn.from.nodeId === connection.from.nodeId && conn.to.nodeId === nodeId
                    );
                    connectionsToRemove.forEach(conn => {
                        flowEditor.connections.delete(conn.id);
                        if (conn.svg) conn.svg.remove();
                    });
                    // Add the new connection
                    const newConnectionId = `conn_${connection.from.nodeId}_${connection.from.portName}_${nodeId}_${selectedInputPort}`;
                    const newConnection = {
                        id: newConnectionId,
                        from: { nodeId: connection.from.nodeId, portName: connection.from.portName },
                        to: { nodeId: nodeId, portName: selectedInputPort }
                    };
                    flowEditor.connections.set(newConnectionId, newConnection);
                    drawConnection(newConnection);
                    // Auto-save
                    if (window.saveFlow) window.saveFlow();
                }
            });
        });
        
        const outputMappingSelects = configPanel.querySelectorAll('.output-mapping-select');
        outputMappingSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const parts = e.target.id.replace('output_mapping_', '').split('|');
                const nodeId = parts[0];
                const outputPort = parts[1];
                const targetNodeId = parts[2];
                const selectedOutputPort = e.target.value;
                console.log('Output mapping change:', nodeId, outputPort, '→', selectedOutputPort, 'to', targetNodeId);
                updateOutputMapping(nodeId, outputPort, targetNodeId, selectedOutputPort);
            });
        });
        
        // Add event listeners for special buttons
        const viewFullImageBtn = configPanel.querySelector('.view-full-image-btn');
        if (viewFullImageBtn) {
            viewFullImageBtn.addEventListener('click', (e) => {
                const nodeId = e.target.getAttribute('data-node-id');
                showFullImage(nodeId);
            });
        }
        
        const playAudioBtn = configPanel.querySelector('.play-audio-btn');
        if (playAudioBtn) {
            playAudioBtn.addEventListener('click', (e) => {
                const nodeId = e.target.getAttribute('data-node-id');
                playAudio(nodeId);
            });
        }
        
        const stopAudioBtn = configPanel.querySelector('.stop-audio-btn');
        if (stopAudioBtn) {
            stopAudioBtn.addEventListener('click', (e) => {
                const nodeId = e.target.getAttribute('data-node-id');
                stopAudio(nodeId);
            });
        }
        
        const startRepeaterBtn = configPanel.querySelector('.start-repeater-btn');
        if (startRepeaterBtn) {
            startRepeaterBtn.addEventListener('click', (e) => {
                const nodeId = e.target.getAttribute('data-node-id');
                startRepeater(nodeId);
            });
        }
        
        const stopRepeaterBtn = configPanel.querySelector('.stop-repeater-btn');
        if (stopRepeaterBtn) {
            stopRepeaterBtn.addEventListener('click', (e) => {
                const nodeId = e.target.getAttribute('data-node-id');
                stopRepeater(nodeId);
            });
        }
        
        // Add change listeners
        for (const [key, config] of Object.entries(nodeDef.config)) {
            const element = document.getElementById(`config_${nodeId}_${key}`);
            if (element) {
                element.addEventListener('change', (e) => {
                    node.config[key].value = e.target.value;
                    console.log('Updated config:', nodeId, key, e.target.value);
                    
                    // Special handling for display node format changes
                    if (node.type === 'display' && key === 'format') {
                        const formatElement = document.getElementById(`display-format-${nodeId}`);
                        if (formatElement) {
                            formatElement.textContent = e.target.value;
                        }
                    }
                });
            }
        }
    }
}

// Start a connection from a port
function startConnection(nodeId, portName, isOutput) {
    if (isOutput) {
        // Starting from output port
        flowEditor.connectingFrom = {
            nodeId: nodeId,
            portName: portName,
            isOutput: true
        };
        console.log('Started connection from output:', nodeId, portName);
    } else {
        // Starting from input port - check if we have a pending connection
        if (flowEditor.connectingFrom && flowEditor.connectingFrom.isOutput) {
            // Complete the connection
            const fromNodeId = flowEditor.connectingFrom.nodeId;
            const fromPort = flowEditor.connectingFrom.portName;
            
            createConnection(fromNodeId, fromPort, nodeId, portName);
            flowEditor.connectingFrom = null;
            console.log('Completed connection:', fromNodeId, fromPort, '->', nodeId, portName);
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

// Update connections for a specific node
function updateConnectionsForNode(nodeId) {
    for (const connection of flowEditor.connections.values()) {
        if (connection.from.nodeId === nodeId || connection.to.nodeId === nodeId) {
            updateConnection(connection);
        }
    }
}

// Update a single connection
function updateConnection(connection) {
    const fromNode = document.getElementById(connection.from.nodeId);
    const toNode = document.getElementById(connection.to.nodeId);
    
    if (!fromNode || !toNode || !connection.svg) return;
    
    // Use scaled rects for accurate positioning
    const fromRect = window.flowEditorUtils ? 
        window.flowEditorUtils.getScaledBoundingClientRect(fromNode) : 
        fromNode.getBoundingClientRect();
    const toRect = window.flowEditorUtils ? 
        window.flowEditorUtils.getScaledBoundingClientRect(toNode) : 
        toNode.getBoundingClientRect();
    const canvasRect = window.flowEditorUtils ? 
        window.flowEditorUtils.getScaledBoundingClientRect(flowEditor.canvas) : 
        flowEditor.canvas.getBoundingClientRect();
    
    // Calculate connection positions
    const fromX = fromRect.right - canvasRect.left;
    const fromY = fromRect.top + fromRect.height / 2 - canvasRect.top;
    const toX = toRect.left - canvasRect.left;
    const toY = toRect.top + toRect.height / 2 - canvasRect.top;
    
    // Update the path
    const path = connection.svg.querySelector('path');
    if (path) {
        const controlPoint1X = fromX + (toX - fromX) * 0.5;
        const controlPoint2X = fromX + (toX - fromX) * 0.5;
        path.setAttribute('d', `M ${fromX} ${fromY} C ${controlPoint1X} ${fromY} ${controlPoint2X} ${toY} ${toX} ${toY}`);
    }
}

// Redraw all connections (for window resize, etc.)
function redrawAllConnections() {
    for (const connection of flowEditor.connections.values()) {
        updateConnection(connection);
    }
}

// Delete a node and all its connections
function deleteNode(nodeId) {
    if (confirm(`Are you sure you want to delete this node?`)) {
        const node = flowEditor.nodes.get(nodeId);
        
        // Clean up audio elements if this is an audio node
        if (node && node.type === 'audio' && node.audioElement) {
            // Pause and stop the audio
            node.audioElement.pause();
            node.audioElement.currentTime = 0;
            
            // Remove event listeners properly
            if (node.audioEventListeners) {
                node.audioElement.removeEventListener('ended', node.audioEventListeners.ended);
                node.audioElement.removeEventListener('error', node.audioEventListeners.error);
                node.audioEventListeners = null;
            }
            
            // Store the src before clearing it for cleanup
            const audioSrc = node.audioElement.src;
            node.audioElement.src = '';
            
            // Revoke blob URL if it exists
            if (audioSrc && audioSrc.startsWith('blob:')) {
                URL.revokeObjectURL(audioSrc);
            }
            
            // Clear the audio element reference
            node.audioElement = null;
        }
        
        // Remove all connections involving this node
        const connectionsToDelete = [];
        for (const [connectionId, connection] of flowEditor.connections.entries()) {
            if (connection.from.nodeId === nodeId || connection.to.nodeId === nodeId) {
                connectionsToDelete.push(connectionId);
            }
        }
        
        // Delete connections
        for (const connectionId of connectionsToDelete) {
            deleteConnection(connectionId);
        }
        
        // Remove node from data structure
        flowEditor.nodes.delete(nodeId);
        
        // Remove node element from DOM
        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) {
            nodeElement.remove();
        }
        
        // Deselect if this was the selected node
        if (flowEditor.selectedNode === nodeId) {
            flowEditor.selectedNode = null;
            document.getElementById('node-config').innerHTML = '<p class="text-muted">Select a node to configure it</p>';
        }
        
        console.log(`Deleted node: ${nodeId}`);
    }
}

// Delete a connection
function deleteConnection(connectionId) {
    const connection = flowEditor.connections.get(connectionId);
    if (connection && connection.svg) {
        connection.svg.remove();
    }
    flowEditor.connections.delete(connectionId);
    console.log(`Deleted connection: ${connectionId}`);
}

// Delete selected node
function deleteSelectedNode() {
    if (flowEditor.selectedNode) {
        deleteNode(flowEditor.selectedNode);
    }
}

// Handle keyboard shortcuts
function handleKeyDown(e) {
    if (e.key === 'Delete' || (e.key === 'Backspace' && e.ctrlKey)) {
        if (flowEditor.selectedNode) {
            deleteSelectedNode();
        }
    } else if (e.key === 'Escape') {
        // Deselect node
        if (flowEditor.selectedNode) {
            const nodeElement = document.getElementById(flowEditor.selectedNode);
            if (nodeElement) nodeElement.classList.remove('selected');
            flowEditor.selectedNode = null;
            document.getElementById('node-config').innerHTML = '<p class="text-muted">Select a node to configure it</p>';
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        // Ctrl/Cmd + S: Save
        e.preventDefault();
        saveFlow();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        // Ctrl/Cmd + Shift + S: Save As
        e.preventDefault();
        saveFlowAs();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        // Ctrl/Cmd + O: Load
        e.preventDefault();
        loadFlow();
    }
}

// Handle port mouse events for connections
function handlePortMouseDown(e, nodeId, portName, isOutput) {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutput) {
        flowEditor.connectingFrom = { nodeId, portName };
        e.target.classList.add('connecting');
    } else {
        if (flowEditor.connectingFrom) {
            createConnection(flowEditor.connectingFrom.nodeId, flowEditor.connectingFrom.portName, nodeId, portName);
            flowEditor.connectingFrom = null;
            document.querySelectorAll('.flow-node-port').forEach(port => port.classList.remove('connecting'));
        }
    }
}

// Create a connection between nodes
function createConnection(fromNodeId, fromPort, toNodeId, toPort) {
    // Check if connection already exists
    for (const connection of flowEditor.connections.values()) {
        if (connection.from.nodeId === fromNodeId && 
            connection.from.portName === fromPort &&
            connection.to.nodeId === toNodeId && 
            connection.to.portName === toPort) {
            console.log('Connection already exists');
            return;
        }
    }
    
    const connectionId = `conn_${fromNodeId}_${fromPort}_${toNodeId}_${toPort}`;
    const connection = {
        id: connectionId,
        from: { nodeId: fromNodeId, portName: fromPort },
        to: { nodeId: toNodeId, portName: toPort }
    };
    
    flowEditor.connections.set(connectionId, connection);
    drawConnection(connection);
    
    console.log(`Created connection: ${connectionId}`);
}

// Draw a connection on the canvas
function drawConnection(connection) {
    const fromNode = document.getElementById(connection.from.nodeId);
    const toNode = document.getElementById(connection.to.nodeId);
    
    if (!fromNode || !toNode) return;
    
    // Create SVG element for the connection
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none'; // Don't capture events by default
    svg.style.zIndex = '1';
    svg.dataset.connectionId = connection.id;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', '#4CAF50');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    path.style.cursor = 'pointer';
    path.style.pointerEvents = 'auto'; // Only the path captures events
    
    // Add hover effects
    path.addEventListener('mouseenter', () => {
        path.setAttribute('stroke-width', '4');
        path.setAttribute('stroke', '#ff6b6b');
        // Show delete tooltip
        showConnectionTooltip(connection.id, 'Click to delete connection');
    });
    
    path.addEventListener('mouseleave', () => {
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke', '#4CAF50');
        hideConnectionTooltip();
    });
    
    // Add click to delete
    path.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this connection?')) {
            deleteConnection(connection.id);
        }
    });
    
    svg.appendChild(path);
    flowEditor.canvas.appendChild(svg);
    
    // Store SVG reference
    connection.svg = svg;
    
    // Update connection position
    updateConnection(connection);
}

// Show connection tooltip
function showConnectionTooltip(connectionId, message) {
    // Check if app is still active
    if (!flowEditor.isActive) {
        return;
    }
    
    // Remove existing tooltip
    hideConnectionTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'connection-tooltip';
    tooltip.textContent = message;
    tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
        white-space: nowrap;
        display: none;
    `;
    
    tooltip.id = 'connection-tooltip';
    
    // Try to append to app container first, fallback to body
    const appContainer = document.querySelector('.app-container');
    const container = appContainer || document.body;
    container.appendChild(tooltip);
    
    // Position tooltip near mouse (will be updated on mousemove)
    const tooltipMouseMoveHandler = (e) => updateTooltipPosition(e);
    document.addEventListener('mousemove', tooltipMouseMoveHandler);
    
    // Store the handler reference for cleanup
    window.flowEditorTooltipHandler = tooltipMouseMoveHandler;
    
    // Show the tooltip after a small delay to prevent flickering
    setTimeout(() => {
        if (tooltip.parentNode && flowEditor.isActive) {
            tooltip.style.display = 'block';
        }
    }, 10);
}

// Update tooltip position
function updateTooltipPosition(e) {
    const tooltip = document.getElementById('connection-tooltip');
    if (tooltip) {
        // Use scaled coordinates for tooltip positioning
        const mouseCoords = window.flowEditorUtils ? 
            window.flowEditorUtils.getScaledMouseCoords(e) : 
            { x: e.clientX, y: e.clientY };
        tooltip.style.left = (mouseCoords.x + 10) + 'px';
        tooltip.style.top = (mouseCoords.y - 10) + 'px';
    }
}

// Hide connection tooltip
function hideConnectionTooltip() {
    const tooltip = document.getElementById('connection-tooltip');
    if (tooltip) {
        // Remove the specific event listener we added
        if (window.flowEditorTooltipHandler) {
            document.removeEventListener('mousemove', window.flowEditorTooltipHandler);
            window.flowEditorTooltipHandler = null;
        }
        
        // Hide and remove the tooltip
        tooltip.style.display = 'none';
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    }
}

// Clear the canvas
function clearCanvas() {
    if (confirm('Are you sure you want to clear the canvas? This will delete all nodes and connections.')) {
        // Hide any active tooltips
        hideConnectionTooltip();
        
        // Clear all connections
        for (const connection of flowEditor.connections.values()) {
            if (connection.svg) {
                connection.svg.remove();
            }
        }
        flowEditor.connections.clear();
        
        // Clear all nodes
        for (const nodeId of flowEditor.nodes.keys()) {
            const nodeElement = document.getElementById(nodeId);
            if (nodeElement) {
                nodeElement.remove();
            }
        }
        flowEditor.nodes.clear();
        
        // Clear all tags
        for (const tagId of flowEditor.tags.keys()) {
            const tagElement = document.getElementById(tagId);
            if (tagElement) {
                tagElement.remove();
            }
        }
        flowEditor.tags.clear();
        
        // Reset counters
        flowEditor.nodeCounter = 0;
        flowEditor.tagCounter = 0;
        flowEditor.selectedNode = null;
        
        // Clear current file path
        flowEditor.currentFilePath = null;
        
        // Reset pan offset to center of large canvas
        flowEditor.panOffset = { x: -5000, y: -5000 };
        if (typeof updateCanvasTransform === 'function') {
            updateCanvasTransform();
        }
        
        // Update filename display
        if (typeof updateFilenameDisplay === 'function') {
            updateFilenameDisplay();
        }
        
        // Clear config panel
        document.getElementById('node-config').innerHTML = '<p class="text-muted">Select a node to configure it</p>';
        
        console.log('Canvas cleared');
    }
} 

// Interactive helper functions for special node types

// Audio control functions
function playAudio(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || !node.lastAudioUrl) {
        console.error('No audio data available for node:', nodeId);
        return;
    }
    
    // Create or reuse audio element
    if (!node.audioElement) {
        node.audioElement = new Audio(node.lastAudioUrl);
        node.audioElement.volume = parseFloat(node.config.volume.value);
    }
    
    node.audioElement.play().catch(error => {
        console.error('Failed to play audio:', error);
    });
    
    console.log('Playing audio for node:', nodeId);
}

function stopAudio(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || !node.audioElement) {
        console.error('No audio element found for node:', nodeId);
        return;
    }
    
    node.audioElement.pause();
    node.audioElement.currentTime = 0;
    
    console.log('Stopped audio for node:', nodeId);
}

// Image display functions
function showFullImage(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || !node.lastImageUrl) {
        console.error('No image data available for node:', nodeId);
        return;
    }
    
    // Create a modal to show the full image
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = node.lastImageUrl;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    modal.appendChild(img);
    document.body.appendChild(modal);
    
    // Close modal on click
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    console.log('Showing full image for node:', nodeId);
}

// Repeater control functions
function startRepeater(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || node.type !== 'repeater') {
        console.error('Invalid repeater node:', nodeId);
        return;
    }
    
    // Execute the repeater node to start it
    executionEngine.executeNode(node, {}, new Set()).then(() => {
        console.log('Repeater started:', nodeId);
        // Refresh the config panel to update the UI
        showNodeConfig(nodeId);
    }).catch(error => {
        console.error('Failed to start repeater:', error);
    });
}

function stopRepeater(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || node.type !== 'repeater') {
        console.error('Invalid repeater node:', nodeId);
        return;
    }
    
    // Stop the repeater using the execution engine method
    executionEngine.stopRepeater(node);
    console.log('Repeater stopped:', nodeId);
    
    // Refresh the config panel to update the UI
    showNodeConfig(nodeId);
}

// Update input mapping when user selects a different output port
function updateInputMapping(nodeId, inputPort, selectedOutputPort) {
    console.log(`Updating input mapping: ${nodeId}.${inputPort} ← ${selectedOutputPort}`);
    // Find the connection that goes to this input port (ignore from.portName)
    const connection = Array.from(flowEditor.connections.values()).find(conn => 
        conn.to.nodeId === nodeId && conn.to.portName === inputPort
    );
    if (connection) {
        // Remove the old connection
        flowEditor.connections.delete(connection.id);
        if (connection.svg) connection.svg.remove();
        // Create a new connection with the updated port name and new ID
        const newConnectionId = `conn_${connection.from.nodeId}_${selectedOutputPort}_${connection.to.nodeId}_${connection.to.portName}`;
        const newConnection = {
            id: newConnectionId,
            from: { nodeId: connection.from.nodeId, portName: selectedOutputPort },
            to: { nodeId: connection.to.nodeId, portName: connection.to.portName }
        };
        flowEditor.connections.set(newConnectionId, newConnection);
        drawConnection(newConnection);
        // Refresh the node config panel to show updated state
        if (flowEditor.selectedNode === nodeId) {
            showNodeConfig(nodeId);
        }
        // Auto-save the workflow to persist the mapping change
        if (window.saveFlow) {
            window.saveFlow();
        }
    }
}

// Update output mapping when user selects a different output port
function updateOutputMapping(nodeId, outputPort, targetNodeId, selectedOutputPort) {
    console.log(`Updating output mapping: ${nodeId}.${outputPort} → ${targetNodeId} (new output: ${selectedOutputPort})`);
    // Remove all connections from this node to the target node (regardless of port)
    const connectionsToRemove = Array.from(flowEditor.connections.values()).filter(conn =>
        conn.from.nodeId === nodeId && conn.to.nodeId === targetNodeId
    );
    connectionsToRemove.forEach(conn => {
        flowEditor.connections.delete(conn.id);
        if (conn.svg) conn.svg.remove();
    });
    // Add the new connection
    const newConnectionId = `conn_${nodeId}_${selectedOutputPort}_${targetNodeId}`;
    const newConnection = {
        id: newConnectionId,
        from: { nodeId: nodeId, portName: selectedOutputPort },
        to: { nodeId: targetNodeId, portName: connectionsToRemove[0]?.to.portName || 'data' }
    };
    flowEditor.connections.set(newConnectionId, newConnection);
    drawConnection(newConnection);
    // Refresh the target node if selected
    if (flowEditor.selectedNode === targetNodeId) {
        setTimeout(() => {
            showNodeConfig(targetNodeId);
        }, 10);
    }
    // Auto-save
    if (window.saveFlow) window.saveFlow();
} 
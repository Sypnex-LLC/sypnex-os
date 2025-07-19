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
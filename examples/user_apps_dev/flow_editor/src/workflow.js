// workflow.js - Workflow execution logic for Flow Editor

// Run the workflow
async function runWorkflow() {
    if (flowEditor.isRunning) {
        console.log('Workflow already running');
        return;
    }
    
    flowEditor.isRunning = true;
    document.getElementById('run-workflow').style.display = 'none';
    document.getElementById('stop-workflow').style.display = 'inline-flex';
    
    // Clear output
    const output = document.getElementById('execution-output');
    output.innerHTML = '<div class="log-entry info">Starting workflow execution...</div>';
    
    try {
        // Find start nodes (nodes with no inputs that are part of a connected workflow)
        const startNodes = Array.from(flowEditor.nodes.values()).filter(node => {
            const nodeDef = nodeRegistry.getNodeType(node.type);
            if (!nodeDef) {
                console.warn(`No node definition found for type: ${node.type}`);
                return false;
            }
            
            console.log(`Checking node ${node.type} (${node.id}): inputs=${nodeDef.inputs.length}, outputs=${nodeDef.outputs.length}`);
            
            // Timer and Repeater nodes are start nodes (can trigger themselves)
            if (node.type === 'timer' || node.type === 'repeater') {
                if (node.type === 'repeater') {
                    const isRunning = node.repeaterState && node.repeaterState.isRunning;
                    console.log(`Repeater ${node.id}: isRunning=${isRunning}, repeaterState=`, node.repeaterState);
                }
                // Timer/Repeater is a start node if it has connected outputs
                const hasConnectedOutputs = Array.from(flowEditor.connections.values()).some(conn => 
                    conn.from.nodeId === node.id
                );
                console.log(`${node.type} ${node.id}: hasConnectedOutputs=${hasConnectedOutputs}`);
                return hasConnectedOutputs; // Timer/Repeater is a start node if connected
            }
            
            // If node has no inputs, check if it's part of a connected workflow
            if (nodeDef.inputs.length === 0) {
                // Check if this node has any outputs that are connected to other nodes
                const hasConnectedOutputs = Array.from(flowEditor.connections.values()).some(conn => 
                    conn.from.nodeId === node.id
                );
                
                console.log(`Node ${node.type} (${node.id}): no inputs, hasConnectedOutputs=${hasConnectedOutputs}`);
                
                // Only include if it's connected to the workflow
                return hasConnectedOutputs;
            }
            
            // Special handling for nodes with optional inputs
            const optionalInputs = nodeDef.inputs.filter(input => input.optional);
            if (optionalInputs.length > 0) {
                // Check if this node has connected outputs
                const hasConnectedOutputs = Array.from(flowEditor.connections.values()).some(conn => 
                    conn.from.nodeId === node.id
                );
                console.log(`Node ${node.type} (${node.id}): has optional inputs, hasConnectedOutputs=${hasConnectedOutputs}`);
                return hasConnectedOutputs;
            }
            
            // Nodes with required inputs are not start nodes - they should be triggered by other nodes
            console.log(`Node ${node.type} (${node.id}): has required inputs, not a start node`);
            return false;
        });
        
        if (startNodes.length === 0) {
            throw new Error('No start nodes found. Add nodes with no inputs (Timer) or nodes with optional inputs that aren\'t connected (HTTP Request)');
        }
        
        // Execute workflow
        const results = await executeWorkflow(startNodes);
        
        // Display results
        output.innerHTML += '<div class="log-entry success">Workflow completed successfully!</div>';
        for (const result of results) {
            output.innerHTML += `<div class="log-entry info">${result.nodeId}: ${result.output}</div>`;
        }
        
        // Send completion via WebSocket
        if (sypnexAPI && sypnexAPI.sendMessage) {
            sypnexAPI.sendMessage('workflow_completed', {
                results: results,
                timestamp: Date.now()
            }, 'flow-editor');
        }
        
    } catch (error) {
        console.error('Workflow execution error:', error);
        output.innerHTML += `<div class="log-entry error">Error: ${error.message}</div>`;
    } finally {
        flowEditor.isRunning = false;
        document.getElementById('run-workflow').style.display = 'inline-flex';
        document.getElementById('stop-workflow').style.display = 'none';
    }
}

// Execute workflow
async function executeWorkflow(startNodes) {
    const results = [];
    const executed = new Set();
    
    for (const startNode of startNodes) {
        const result = await executeNode(startNode, {}, executed);
        if (result) results.push(result);
    }
    
    return results;
}

// Execute a single node (dynamic version)
async function executeNode(node, inputData, executed) {
    if (executed.has(node.id)) {
        console.log(`Node ${node.id} already executed, skipping to prevent cycles`);
        return null;
    }
    executed.add(node.id);
    
    // Mark node as running
    const nodeElement = document.getElementById(node.id);
    if (nodeElement) nodeElement.classList.add('running');
    
    try {
        // Use the dynamic execution engine
        const output = await executionEngine.executeNode(node, inputData, executed);
        
        // Check if output indicates execution should stop (logical gate specific)
        if (output && typeof output === 'object' && output.__stop_execution === true) {
            console.log(`Node ${node.id} returned stop execution signal, stopping workflow`);
            
            // Mark node as completed
            if (nodeElement) {
                nodeElement.classList.remove('running');
                nodeElement.classList.add('completed');
            }
            
            return { nodeId: node.id, output: null };
        }
        
        // Find connected nodes and execute them
        const connectedNodes = findConnectedNodes(node.id);
        console.log(`Node ${node.id} has ${connectedNodes.length} connected nodes`);
        
        for (const connectedNode of connectedNodes) {
            // Check for cycles before executing
            if (executed.has(connectedNode.node.id)) {
                console.log(`Skipping connected node ${connectedNode.node.id} to prevent cycle`);
                continue;
            }
            
            console.log(`=== Processing connection ${node.id} -> ${connectedNode.node.id} ===`);
            console.log(`Connection details: ${connectedNode.outputPort} -> ${connectedNode.inputPort}`);
            
            // Handle output mapping to input ports - DIRECT MAPPING
            let inputValue = output;
            console.log(`Node ${node.id} output:`, output);
            console.log(`Node ${node.id} output type:`, typeof output);
            console.log(`Source output port:`, connectedNode.outputPort);
            console.log(`Target input port:`, connectedNode.inputPort);
            
            if (output instanceof Blob) {
                // Blob output - pass directly to the input port
                inputValue = output;
                console.log(`Node ${node.id} -> ${connectedNode.node.id}: Passing Blob directly =`, inputValue);
            } else if (typeof output === 'object' && output !== null) {
                // Object output - extract the EXACT output port field
                console.log(`Node ${node.id} output object keys:`, Object.keys(output));
                console.log(`Node ${node.id} output object values:`, Object.values(output));
                
                if (connectedNode.outputPort in output) {
                    inputValue = output[connectedNode.outputPort];
                    console.log(`Node ${node.id} -> ${connectedNode.node.id}: DIRECT MAPPING ${connectedNode.outputPort} -> ${connectedNode.inputPort} =`, inputValue);
                    console.log(`Input value type:`, typeof inputValue);
                    console.log(`Input value is null:`, inputValue === null);
                    console.log(`Input value is undefined:`, inputValue === undefined);
                } else {
                    console.error(`Node ${node.id} -> ${connectedNode.node.id}: ERROR - Output port '${connectedNode.outputPort}' not found in output!`);
                    console.error(`Available fields:`, Object.keys(output));
                    // Skip this connection instead of passing null
                    console.log(`Skipping connection ${node.id} -> ${connectedNode.node.id} due to missing output port`);
                    continue;
                }
            } else {
                // Simple value output - pass directly
                console.log(`Node ${node.id} -> ${connectedNode.node.id}: Passing simple value =`, inputValue);
            }
            
            console.log(`Final input value for ${connectedNode.node.id}:`, inputValue);
            console.log(`Input value type:`, typeof inputValue);
            console.log(`Input value instanceof Blob:`, inputValue instanceof Blob);
            
            try {
                await executeNode(connectedNode.node, { [connectedNode.inputPort]: inputValue }, executed);
            } catch (error) {
                console.error(`Error executing connected node ${connectedNode.node.id}:`, error);
                const outputPanel = document.getElementById('execution-output');
                outputPanel.innerHTML += `<div class="log-entry error">Error in connected node ${connectedNode.node.id}: ${error.message}</div>`;
            }
        }
        
        // Mark node as completed
        if (nodeElement) {
            nodeElement.classList.remove('running');
            nodeElement.classList.add('completed');
        }
        
        return { nodeId: node.id, output: output };
        
    } catch (error) {
        console.error(`Error executing node ${node.id}:`, error);
        
        // Mark node as error
        if (nodeElement) {
            nodeElement.classList.remove('running');
            nodeElement.classList.add('error');
    }
    
        throw error;
    } finally {
        // Remove running state
        if (nodeElement) nodeElement.classList.remove('running');
    }
    }
    
// Helper function to update display node content (used by execution engine)
function updateDisplayNodeContent(nodeId, content, format) {
    const nodeElement = document.getElementById(nodeId);
    if (!nodeElement) return;
    
    const displayText = nodeElement.querySelector('.display-text');
    const formatElement = nodeElement.querySelector('.display-format span');
    
    if (displayText) {
        let formattedContent = content;
        
    switch (format) {
        case 'json':
            try {
                    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                    formattedContent = JSON.stringify(parsed, null, 2);
            } catch (e) {
                    formattedContent = content;
            }
            break;
        case 'html':
                formattedContent = content;
            break;
        case 'text':
        default:
                formattedContent = content;
            break;
    }
    
        displayText.innerHTML = `<pre class="content-text">${escapeHtml(formattedContent)}</pre>`;
    }
    
    if (formatElement) {
        formatElement.textContent = format;
    }
    
    // Store for config panel display
    const node = flowEditor.nodes.get(nodeId);
    if (node) {
        node.lastContent = content;
        node.lastFormat = format;
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to replace template placeholders
function replaceTemplatePlaceholders(template, data) {
    if (typeof template !== 'object' || template === null) {
        return template;
    }
    
    if (Array.isArray(template)) {
        return template.map(item => replaceTemplatePlaceholders(item, data));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(template)) {
        if (typeof value === 'string') {
            let replacedValue = value;
    
            // Replace {{VALUE}} with the full data object
            if (value.includes('{{VALUE}}')) {
                replacedValue = value.replace('{{VALUE}}', JSON.stringify(data));
}

            // Replace {{JSON:field}} with specific field
            const jsonMatches = value.match(/\{\{JSON:([^}]+)\}\}/g);
            if (jsonMatches) {
                for (const match of jsonMatches) {
                    const field = match.match(/\{\{JSON:([^}]+)\}\}/)[1];
                    const fieldValue = getNestedValue(data, field);
                    replacedValue = replacedValue.replace(match, JSON.stringify(fieldValue));
                }
    }
    
            // Replace {{field}} with specific field value
            const fieldMatches = value.match(/\{\{([^}]+)\}\}/g);
            if (fieldMatches) {
                for (const match of fieldMatches) {
                    const field = match.match(/\{\{([^}]+)\}\}/)[1];
                    if (field !== 'VALUE' && !field.startsWith('JSON:')) {
                        const fieldValue = getNestedValue(data, field);
                        replacedValue = replacedValue.replace(match, fieldValue);
                    }
                }
            }
            
            result[key] = replacedValue;
        } else if (typeof value === 'object' && value !== null) {
            result[key] = replaceTemplatePlaceholders(value, data);
                    } else {
            result[key] = value;
        }
    }
    
    return result;
}

// Helper function to get nested object values
function getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current === null || current === undefined) {
            return null;
        }
        
        // Handle array access like "items[0].name"
        const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arrayKey = arrayMatch[1];
            const arrayIndex = parseInt(arrayMatch[2]);
            
            if (current[arrayKey] && Array.isArray(current[arrayKey])) {
                current = current[arrayKey][arrayIndex];
        } else {
                return null;
    }
    } else {
            current = current[key];
        }
    }
    
    return current;
}

// Stop workflow execution
function stopWorkflow() {
        flowEditor.isRunning = false;
        document.getElementById('run-workflow').style.display = 'inline-flex';
        document.getElementById('stop-workflow').style.display = 'none';
        
    // Clear running states from all nodes
        document.querySelectorAll('.flow-node.running').forEach(node => {
            node.classList.remove('running');
        });
        
    const output = document.getElementById('execution-output');
    output.innerHTML += '<div class="log-entry warning">Workflow execution stopped by user</div>';
    
    console.log('Workflow execution stopped');
}

// Find nodes connected to a specific node
function findConnectedNodes(nodeId) {
    const connectedNodes = [];
    
    for (const connection of flowEditor.connections.values()) {
        if (connection.from.nodeId === nodeId) {
            const targetNode = flowEditor.nodes.get(connection.to.nodeId);
            if (targetNode) {
                connectedNodes.push({
                    node: targetNode,
                    inputPort: connection.to.portName,
                    outputPort: connection.from.portName
                });
            }
        }
    }
    
    return connectedNodes;
} 
// node-renderer.js - Dynamic node rendering for Flow Editor

class NodeRenderer {
    constructor() {
        this.templates = new Map();
        this.setupStandardTemplate();
    }
    
    setupStandardTemplate() {
        this.templates.set('standard', {
            render: (node, nodeDef) => {
                const inputs = nodeDef.inputs || [];
                const outputs = nodeDef.outputs || [];
                
                return `
                    <div class="flow-node-header">
                        <i class="${nodeDef.icon}"></i>
                        <span>${nodeDef.name}</span>
                        <span class="flow-node-type ${node.type}">${node.type.toUpperCase()}</span>
                        <button class="node-delete-btn" title="Delete node">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="flow-node-content">
                        <div class="node-default-content">
                            <small class="text-muted">${nodeDef.description}</small>
                        </div>
                    </div>
                    <div class="flow-node-ports">
                        ${inputs.map(input => 
                            `<div class="flow-node-port input" data-port="${input.id}"></div>`
                        ).join('')}
                        ${outputs.map(output => 
                            `<div class="flow-node-port output" data-port="${output.id}"></div>`
                        ).join('')}
                    </div>
                `;
            }
        });
    }
    
    registerTemplate(name, template) {
        this.templates.set(name, template);
    }
    
    renderNode(node) {
        const nodeDef = nodeRegistry.getNodeType(node.type);
        if (!nodeDef) {
            console.error(`No node definition found for type: ${node.type}`);
            return '';
        }
        
        const templateName = nodeDef.template || 'standard';
        const template = this.templates.get(templateName);
        
        if (!template) {
            console.error(`No template found: ${templateName}`);
            return '';
        }
        
        return template.render(node, nodeDef);
    }
    
    createNodeElement(node) {
        const nodeElement = document.createElement('div');
        nodeElement.className = `flow-node ${node.type}-node`;
        nodeElement.id = node.id;
        nodeElement.style.left = node.x + 'px';
        nodeElement.style.top = node.y + 'px';
        
        // Render the node content
        nodeElement.innerHTML = this.renderNode(node);
        
        // Add event listeners and get the updated element
        const finalElement = this.addNodeEventListeners(nodeElement, node);
        
        return finalElement;
    }
    
    addNodeEventListeners(nodeElement, node) {
        // Delete button
        const deleteBtn = nodeElement.querySelector('.node-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNode(node.id);
            });
        }
        
        // Node selection
        nodeElement.addEventListener('click', (e) => {
            if (e.target.closest('.node-delete-btn')) return;
            selectNode(node.id);
        });
        
        // Node dragging
        nodeElement.addEventListener('mousedown', (e) => {
            if (e.target.closest('.node-delete-btn')) return;
            startDraggingNode(node.id, e);
        });
        
        // Port connections
        const ports = nodeElement.querySelectorAll('.flow-node-port');
        ports.forEach(port => {
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                startConnection(node.id, port.dataset.port, port.classList.contains('output'));
            });
        });
        
        return nodeElement;
    }
}

// Global node renderer instance
console.log('Creating global nodeRenderer instance...');
const nodeRenderer = new NodeRenderer();
console.log('Global nodeRenderer created:', nodeRenderer); 
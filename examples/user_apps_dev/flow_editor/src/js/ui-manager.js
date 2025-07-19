
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
    
    // Zoom controls
    document.getElementById('zoom-in')?.addEventListener('click', window.canvasManager.zoomIn);
    document.getElementById('zoom-out')?.addEventListener('click', window.canvasManager.zoomOut);
    document.getElementById('zoom-fit')?.addEventListener('click', window.canvasManager.zoomToFit);
    
    // File operations
    document.getElementById('save-flow')?.addEventListener('click', window.fileManager.saveFlow);
    document.getElementById('save-flow-as')?.addEventListener('click', window.fileManager.saveFlowAs);
    document.getElementById('load-flow')?.addEventListener('click', window.fileManager.loadFlow);
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
    flowEditor.canvas.addEventListener('wheel', window.canvasManager.handleMouseWheel, { passive: false });
    
    // Document-level mouse events for smooth dragging and panning
    document.addEventListener('mousedown', window.canvasManager.handleDocumentMouseDown);
    document.addEventListener('mousemove', window.canvasManager.handleDocumentMouseMove);
    document.addEventListener('mouseup', window.canvasManager.handleDocumentMouseUp);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);
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

// Example: ui-manager.js
window.uiManager = {
    populateToolbox,
    setupEventHandlers,
    toggleConfigPanel,
    toggleToolbox
};
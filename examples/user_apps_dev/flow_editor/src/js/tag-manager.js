
// Add a new tag at current viewport center
function addTag() {
    const tagName = prompt('Enter tag name:');
    if (!tagName || tagName.trim() === '') return;

    const tagId = `tag_${++flowEditor.tagCounter}`;

    // Calculate position at current viewport center
    const container = flowEditor.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();

    // Center of the viewport
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;

    // Convert viewport center to canvas coordinates (accounting for pan)
    const canvasCenterX = viewportCenterX - flowEditor.panOffset.x;
    const canvasCenterY = viewportCenterY - flowEditor.panOffset.y;

    const tag = {
        id: tagId,
        name: tagName.trim(),
        description: '',
        x: canvasCenterX,
        y: canvasCenterY,
        color: '#4CAF50' // Green color
    };

    flowEditor.tags.set(tagId, tag);
    createTagElement(tag);
    updateTagPanel();

    console.log('Added tag:', tag);
}

// Create tag element on canvas
function createTagElement(tag) {
    const tagElement = document.createElement('div');
    tagElement.id = tag.id;
    tagElement.className = 'canvas-tag';
    tagElement.style.cssText = `
        position: absolute;
        left: ${tag.x}px;
        top: ${tag.y}px;
        background: ${tag.color};
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        user-select: none;
        z-index: 100;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: box-shadow 0.2s ease, transform 0.2s ease;
    `;
    tagElement.textContent = tag.name;

    // Make tag draggable
    tagElement.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startDraggingTag(tag.id, e);
    });

    // Click to jump to tag
    tagElement.addEventListener('click', (e) => {
        if (!flowEditor.draggingTag) {
            jumpToTag(tag.id);
        }
    });

    // Hover effects
    tagElement.addEventListener('mouseenter', () => {
        tagElement.style.transform = 'scale(1.05)';
        tagElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    });

    tagElement.addEventListener('mouseleave', () => {
        tagElement.style.transform = 'scale(1)';
        tagElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    });

    flowEditor.canvas.appendChild(tagElement);
}

// Start dragging a tag
function startDraggingTag(tagId, e) {
    const tag = flowEditor.tags.get(tagId);
    if (!tag) return;

    flowEditor.draggingTag = tagId;

    // Calculate offset from mouse to tag corner using scaled coordinates
    const tagElement = document.getElementById(tagId);
    const rect = window.flowEditorUtils ?
        window.flowEditorUtils.getScaledBoundingClientRect(tagElement) :
        tagElement.getBoundingClientRect();
    const mouseCoords = window.flowEditorUtils ?
        window.flowEditorUtils.getScaledMouseCoords(e) :
        { x: e.clientX, y: e.clientY };

    flowEditor.tagDragOffset = {
        x: mouseCoords.x - rect.left,
        y: mouseCoords.y - rect.top
    };

    tagElement.style.cursor = 'grabbing';
    tagElement.style.zIndex = '1001';
    tagElement.style.transition = 'none'; // Disable transitions during drag
}

// Jump to tag location
function jumpToTag(tagId) {
    const tag = flowEditor.tags.get(tagId);
    if (!tag) return;

    // Add smooth transition
    flowEditor.canvas.style.transition = 'transform 0.5s ease-out';

    // Get canvas container dimensions (scaled)
    const container = flowEditor.canvas.parentElement;
    const containerRect = window.flowEditorUtils ?
        window.flowEditorUtils.getScaledBoundingClientRect(container) :
        container.getBoundingClientRect();

    // Calculate pan offset to center the tag in the viewport
    flowEditor.panOffset.x = -tag.x + containerRect.width / 2;
    flowEditor.panOffset.y = -tag.y + containerRect.height / 2;

    window.canvasManager.updateCanvasTransform();

    // Remove transition after animation completes
    setTimeout(() => {
        flowEditor.canvas.style.transition = '';
    }, 500);
}

// Update tag panel
function updateTagPanel() {
    const tagPanel = document.getElementById('tag-panel');
    if (!tagPanel) return;

    if (flowEditor.tags.size === 0) {
        tagPanel.innerHTML = '<p class="text-muted">No tags yet</p>';
        return;
    }

    let tagHtml = '';
    flowEditor.tags.forEach(tag => {
        tagHtml += `
            <div class="tag-item" data-tag-id="${tag.id}">
                <div class="tag-color" style="background: ${tag.color}"></div>
                <div class="tag-info">
                    <div class="tag-name">${tag.name}</div>
                    ${tag.description ? `<div class="tag-description">${tag.description}</div>` : ''}
                </div>
                <button class="tag-delete" data-tag-id="${tag.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });

    tagPanel.innerHTML = tagHtml;

    // Add event listeners
    tagPanel.querySelectorAll('.tag-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.tag-delete')) {
                const tagId = item.getAttribute('data-tag-id');
                jumpToTag(tagId);
            }
        });
    });

    tagPanel.querySelectorAll('.tag-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tagId = btn.getAttribute('data-tag-id');
            deleteTag(tagId);
        });
    });
}

// Delete a tag
function deleteTag(tagId) {
    if (confirm('Delete this tag?')) {
        const tagElement = document.getElementById(tagId);
        if (tagElement) {
            tagElement.remove();
        }
        flowEditor.tags.delete(tagId);
        updateTagPanel();
    }
}

// Example: tag-manager.js
window.tagManager = {
    addTag,
    createTagElement,
    startDraggingTag,
    jumpToTag,
    updateTagPanel,
    deleteTag
};
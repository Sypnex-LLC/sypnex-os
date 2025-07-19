// utils.js - Utility functions for Flow Editor

// Scale compensation utilities
let appScale = 1.0;

// Detect the current app scale from CSS transform
function detectAppScale() {
    try {
        // Find the app window container
        const appWindow = document.querySelector('.app-window');
        if (!appWindow) {
            // console.log('No app window found, assuming 100% scale');
            return 1.0;
        }
        
        // Check for scale classes
        const scaleClasses = ['scale-75', 'scale-80', 'scale-85', 'scale-90', 'scale-95', 
                             'scale-100', 'scale-105', 'scale-110', 'scale-115', 'scale-120',
                             'scale-125', 'scale-130', 'scale-135', 'scale-140', 'scale-145', 'scale-150'];
        
                    for (const scaleClass of scaleClasses) {
                if (appWindow.classList.contains(scaleClass)) {
                    const scaleValue = parseInt(scaleClass.replace('scale-', ''));
                    appScale = scaleValue / 100;
                    // console.log(`Detected app scale: ${scaleValue}% (${appScale})`);
                    return appScale;
                }
            }
        
        // Fallback: check computed transform
        const computedStyle = window.getComputedStyle(appWindow);
        const transform = computedStyle.transform;
        if (transform && transform !== 'none') {
            // Parse transform matrix to extract scale
            const matrix = transform.match(/matrix\(([^)]+)\)/);
            if (matrix) {
                const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
                if (values.length >= 4) {
                    // Matrix format: matrix(a, b, c, d, tx, ty) where a and d are scale factors
                    const scaleX = values[0];
                    const scaleY = values[3];
                    appScale = (scaleX + scaleY) / 2; // Average of X and Y scale
                    // console.log(`Detected app scale from transform: ${appScale}`);
                    return appScale;
                }
            }
        }
        
        // console.log('No scale detected, using 100%');
        return 1.0;
    } catch (error) {
        console.error('Error detecting app scale:', error);
        return 1.0;
    }
}

// Convert screen coordinates to app coordinates
function screenToAppCoords(screenX, screenY) {
    const scale = detectAppScale();
    return {
        x: screenX / scale,
        y: screenY / scale
    };
}

// Convert app coordinates to screen coordinates
function appToScreenCoords(appX, appY) {
    const scale = detectAppScale();
    return {
        x: appX * scale,
        y: appY * scale
    };
}

// Get scaled element rect (compensates for app scaling)
function getScaledBoundingClientRect(element) {
    const rect = element.getBoundingClientRect();
    const scale = detectAppScale();
    
    return {
        left: rect.left / scale,
        top: rect.top / scale,
        right: rect.right / scale,
        bottom: rect.bottom / scale,
        width: rect.width / scale,
        height: rect.height / scale,
        x: rect.x / scale,
        y: rect.y / scale
    };
}

// Get scaled mouse coordinates from event
function getScaledMouseCoords(e) {
    return screenToAppCoords(e.clientX, e.clientY);
}

// Initialize scale detection
function initScaleDetection() {
    // Detect scale on initialization
    detectAppScale();
    
    // Listen for scale changes (if the app scale changes dynamically)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const oldScale = appScale;
                const newScale = detectAppScale();
                if (oldScale !== newScale) {
                    console.log(`App scale changed from ${oldScale} to ${newScale}`);
                    // Trigger any necessary updates
                    if (typeof redrawAllConnections === 'function') {
                        redrawAllConnections();
                    }
                }
            }
        });
    });
    
    // Observe the app window for class changes
    const appWindow = document.querySelector('.app-window');
    if (appWindow) {
        observer.observe(appWindow, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    return observer;
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to debounce function calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export utilities for use in other modules
window.flowEditorUtils = {
    detectAppScale,
    screenToAppCoords,
    appToScreenCoords,
    getScaledBoundingClientRect,
    getScaledMouseCoords,
    initScaleDetection,
    escapeHtml,
    formatFileSize,
    debounce
};

// Replace template placeholders in JSON body
function replaceTemplatePlaceholders(body, templateData) {
    console.log('replaceTemplatePlaceholders called with:', { body, templateData, bodyType: typeof body, templateDataType: typeof templateData });
    
    if (!body) {
        console.log('Body is empty, returning as-is');
        return body;
    }
    
    // Handle both string and object inputs
    let bodyString;
    let isJsonString = false;
    
    if (typeof body === 'string') {
        bodyString = body;
        // Check if it's already a JSON string
        try {
            JSON.parse(body);
            isJsonString = true;
        } catch (e) {
            // Not a JSON string, treat as regular string
        }
    } else if (typeof body === 'object') {
        bodyString = JSON.stringify(body);
        isJsonString = true;
    } else {
        console.log('Body is neither string nor object, returning as-is');
        return body;
    }
    
    console.log('Body string before replacement:', bodyString, 'isJsonString:', isJsonString);
    
    // Replace placeholders with template data
    if (templateData !== undefined && templateData !== null) {
        const beforeReplace = bodyString;
        
        console.log('Starting template replacement with templateData:', templateData);
        
        // Simple JSON field replacement - just {{field}} or {{nested.field}}
        if (typeof templateData === 'object') {
            console.log('Processing simple field replacements for object templateData');
            console.log('Template data keys:', Object.keys(templateData));
            console.log('Looking for patterns like {{field}} in body string:', bodyString);
            
            // Use a simpler, more explicit regex
            const placeholderRegex = /\{\{([^}]+)\}\}/g;
            console.log('Using regex:', placeholderRegex);
            
            // Test if the regex finds anything
            const matches = bodyString.match(placeholderRegex);
            console.log('Regex matches found:', matches);
            
            bodyString = bodyString.replace(placeholderRegex, (match, fieldPath) => {
                console.log('Found pattern {{' + fieldPath + '}}, extracting value...');
                const value = getNestedValue(templateData, fieldPath);
                console.log('Extracted value for', fieldPath, ':', value);
                console.log('Value type:', typeof value);
                if (value !== undefined) {
                    let replacement;
                    if (typeof value === 'string') {
                        // Always escape the string properly for JSON context
                        replacement = value.replace(/\\/g, '\\\\')
                                         .replace(/"/g, '\\"')
                                         .replace(/\n/g, '\\n')
                                         .replace(/\r/g, '\\r')
                                         .replace(/\t/g, '\\t');
                    } else {
                        // For non-strings, convert to JSON string
                        replacement = JSON.stringify(value);
                    }
                    console.log('Replacing', match, 'with:', replacement);
                    return replacement;
                } else {
                    console.log('Field not found, keeping original:', match);
                    return match;
                }
            });
        } else if (typeof templateData === 'string') {
            // For strings, just replace {{VALUE}} as a fallback
            console.log('Processing string templateData, replacing {{VALUE}}');
            bodyString = bodyString.replace(/{{VALUE}}/g, JSON.stringify(templateData));
        }
        
        console.log('Template replacement result:', {
            before: beforeReplace,
            after: bodyString,
            replaced: beforeReplace !== bodyString,
            templateData: templateData
        });
    } else {
        console.log('No template data provided, skipping replacement');
    }
    
    if (typeof body === 'object') {
        try {
            return JSON.parse(bodyString);
        } catch (error) {
            console.error('Failed to parse template-replaced body:', error);
            console.error('Body string was:', bodyString);
            return body;
        }
    } else {
        return bodyString;
    }
}

// Get nested value from object using dot notation
function getNestedValue(obj, path) {
    console.log('getNestedValue called with:', { obj, path });
    const result = path.split('.').reduce((current, key) => {
        console.log('Checking key:', key, 'in:', current);
        const value = current && current[key] !== undefined ? current[key] : undefined;
        console.log('Value for key', key, ':', value);
        return value;
    }, obj);
    console.log('getNestedValue result for path', path, ':', result);
    return result;
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update JSON extract node display
function updateJsonExtractDisplay(nodeId, label, value, status = 'normal') {
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
        const contentElement = nodeElement.querySelector('.flow-node-content');
        if (contentElement) {
            const statusClass = status === 'error' ? 'text-danger' : status === 'success' ? 'text-success' : 'text-muted';
            
            // Show just a status on the node, full content will be in config panel
            const truncatedValue = typeof value === 'string' && value.length > 50 ? 
                value.substring(0, 50) + '...' : value;
            
            contentElement.innerHTML = `
                <div class="node-status">
                    <div class="status-text">Value extracted</div>
                    <div class="status-info">
                        <small>${label}: ${escapeHtml(String(truncatedValue))}</small>
                    </div>
                </div>
            `;
        }
    }
}

// Add execution log entry
function addExecutionLog(message, type = 'info') {
    const output = document.getElementById('execution-output');
    if (output) {
        const timestamp = new Date().toLocaleTimeString();
        output.innerHTML += `<div class="log-entry ${type}">[${timestamp}] ${message}</div>`;
        output.scrollTop = output.scrollHeight;
    }
}

// Clear execution output
function clearOutput() {
    const output = document.getElementById('execution-output');
    if (output) {
        output.innerHTML = '<div class="log-entry info">Output cleared</div>';
    }
}
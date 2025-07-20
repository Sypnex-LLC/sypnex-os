// Update line numbers
function updateLineNumbers() {
    if (!textEditor.lineNumbers || !textEditor.lineNumbersEnabled) return;
    
    const lines = textEditor.textarea.value.split('\n');
    const lineCount = lines.length;
    
    // Generate line numbers HTML
    let lineNumbersHTML = '';
    for (let i = 1; i <= lineCount; i++) {
        lineNumbersHTML += `<span class="line-number">${i}</span>\n`;
    }
    
    textEditor.lineNumbers.innerHTML = lineNumbersHTML;
}

// Sync scroll between textarea and line numbers
function syncScroll() {
    if (textEditor.lineNumbers && textEditor.lineNumbersEnabled) {
        textEditor.lineNumbers.scrollTop = textEditor.textarea.scrollTop;
    }
    
    // Also sync the backdrop if it exists
    syncBackdropScroll();
}


// Handle text changes
function handleTextChange() {
    updateLineNumbers();
    updateStatus();
    markAsModified();
    
    // Schedule validation for Python files
    scheduleValidation();
}

// Focus appropriate editor
function focusEditor() {
    if (textEditor.textarea) {
        textEditor.textarea.focus();
    }
}


// Update filename display
function updateFilenameDisplay() {
    if (currentFilenameEl) {
        const filename = textEditor.filePath ? textEditor.filePath.split('/').pop() : 'untitled.txt';
        currentFilenameEl.textContent = filename;
    }
}

// Initialize editor state
function initializeEditor() {
    // Set initial file path
    textEditor.filePath = '/untitled.txt';
    updateFilenameDisplay();
    
    // Update line numbers
    updateLineNumbers();
    
    // Update status
    updateStatus();
    
    // Enable syntax highlighting if needed
    enableSyntaxHighlighting();
    
    // Start auto-save if enabled
    if (textEditor.settings.autoSaveInterval > 0) {
        startAutoSave();
    }
}



// Update status bar
function updateStatus() {
    // Status bar now only shows modified status, which is handled by markAsModified/markAsSaved
    // This function is kept for potential future use
}

// Mark file as modified
function markAsModified() {
    if (!textEditor.isModified) {
        textEditor.isModified = true;
        if (modifiedStatusEl) {
            modifiedStatusEl.textContent = 'Yes';
            modifiedStatusEl.classList.add('modified');
        }
    }
}

// Mark file as saved
function markAsSaved() {
    textEditor.isModified = false;
    textEditor.originalContent = textEditor.textarea.value;
    if (modifiedStatusEl) {
        modifiedStatusEl.textContent = 'No';
        modifiedStatusEl.classList.remove('modified');
    }
}


// Clear editor
function clearEditor() {
    textEditor.textarea.value = '';
    textEditor.filePath = '/untitled.txt';
    updateFilenameDisplay();
    textEditor.originalContent = '';
    markAsSaved();
    updateLineNumbers();
    updateStatus();
    
    // Enable syntax highlighting for new file
    enableSyntaxHighlighting();
    
    // Force update highlighted content if highlighting is enabled
    if (textEditor.syntaxHighlightingEnabled && textEditor.highlightedEditor) {
        updateHighlightedContent();
    }
    
    // Clear any existing errors
    clearErrorMarkers();
    updateErrorCount(0);
    
    // Focus the textarea (not the backdrop)
    focusEditor();
}

// Start auto-save
function startAutoSave() {
    if (textEditor.autoSaveInterval) {
        clearInterval(textEditor.autoSaveInterval);
    }
    
    textEditor.autoSaveInterval = setInterval(() => {
        if (textEditor.isModified && textEditor.filePath && textEditor.filePath !== '/untitled.txt') {
            saveFile();
        }
    }, textEditor.settings.autoSaveInterval * 1000);
    
    console.log(`Auto-save enabled every ${textEditor.settings.autoSaveInterval} seconds`);
}

// Stop auto-save
function stopAutoSave() {
    if (textEditor.autoSaveInterval) {
        clearInterval(textEditor.autoSaveInterval);
        textEditor.autoSaveInterval = null;
    }
}

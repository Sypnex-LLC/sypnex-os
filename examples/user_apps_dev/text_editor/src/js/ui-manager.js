// Set up event handlers
function setupEventHandlers() {
    // Button events
    newFileBtn?.addEventListener('click', createNewFile);
    loadFileBtn?.addEventListener('click', loadFile);
    saveFileBtn?.addEventListener('click', saveFile);
    saveAsFileBtn?.addEventListener('click', saveAsFile);
    wordWrapToggle?.addEventListener('click', toggleWordWrap);
    lineNumbersToggle?.addEventListener('click', toggleLineNumbers);
    syntaxHighlightingToggle?.addEventListener('click', toggleSyntaxHighlighting);
    validationToggle?.addEventListener('click', toggleValidation);
    
    // Textarea events
    textEditor.textarea.addEventListener('input', handleTextChange);
    textEditor.textarea.addEventListener('scroll', syncScroll);
    textEditor.textarea.addEventListener('keydown', handleKeyDown);
    

    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
}



// Handle keyboard shortcuts
function handleKeyDown(e) {
    // Ctrl/Cmd + S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && !e.shiftKey) {
        e.preventDefault();
        saveFile();
    }
    
    // Ctrl/Cmd + Shift + S: Save As
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        saveAsFile();
    }
    
    // Ctrl/Cmd + N: New file
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewFile();
    }
    
    // Ctrl/Cmd + O: Load file
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        loadFile();
    }
    
    // Ctrl/Cmd + Shift + V: Force validation
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        console.log('🔍 Manual validation triggered');
        if (isPythonFile(textEditor.filePath)) {
            scheduleValidation();
            sypnexAPI.showNotification('Validation triggered manually', 'info');
        } else {
            sypnexAPI.showNotification('Not a Python file', 'warning');
        }
    }
    
    // Tab handling
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = textEditor.textarea.selectionStart;
        const end = textEditor.textarea.selectionEnd;
        const spaces = ' '.repeat(textEditor.settings.tabSize);
        
        textEditor.textarea.value = 
            textEditor.textarea.value.substring(0, start) + 
            spaces + 
            textEditor.textarea.value.substring(end);
        
        textEditor.textarea.selectionStart = textEditor.textarea.selectionEnd = start + spaces.length;
        
        // Manually trigger content update since we prevented the default
        updateLineNumbers();
        markAsModified();
        if (textEditor.syntaxHighlightingEnabled) {
            updateHighlightedContent();
        }
        scheduleValidation();
    }
}


// Toggle word wrap
function toggleWordWrap() {
    textEditor.wordWrapEnabled = !textEditor.wordWrapEnabled;
    textEditor.textarea.classList.toggle('word-wrap', textEditor.wordWrapEnabled);
    
    // Update highlighted editor if it exists
    if (textEditor.highlightedEditor) {
        textEditor.highlightedEditor.style.wordWrap = textEditor.wordWrapEnabled ? 'break-word' : 'normal';
    }
    
    if (wordWrapToggle) {
        wordWrapToggle.classList.toggle('active', textEditor.wordWrapEnabled);
    }
    
    sypnexAPI.showNotification(
        `Word wrap ${textEditor.wordWrapEnabled ? 'enabled' : 'disabled'}`,
        'info'
    );
}

// Toggle line numbers
function toggleLineNumbers() {
    textEditor.lineNumbersEnabled = !textEditor.lineNumbersEnabled;
    textEditor.lineNumbers.classList.toggle('hidden', !textEditor.lineNumbersEnabled);
    
    if (lineNumbersToggle) {
        lineNumbersToggle.classList.toggle('active', textEditor.lineNumbersEnabled);
    }
    
    if (textEditor.lineNumbersEnabled) {
        updateLineNumbers();
    }
    
    sypnexAPI.showNotification(
        `Line numbers ${textEditor.lineNumbersEnabled ? 'enabled' : 'disabled'}`,
        'info'
    );
}


// Toggle code validation
async function toggleValidation() {
    textEditor.validationEnabled = !textEditor.validationEnabled;
    
    // Save setting
    try {
        await sypnexAPI.setSetting('CODE_VALIDATION', textEditor.validationEnabled);
    } catch (error) {
        console.error('Failed to save validation setting:', error);
    }
    
    // Update UI
    if (validationToggle) {
        validationToggle.classList.toggle('active', textEditor.validationEnabled);
    }
    
    // Apply validation if enabled, otherwise clear errors
    if (textEditor.validationEnabled) {
        scheduleValidation();
    } else {
        clearErrorMarkers();
        updateErrorCount(0);
    }
    
    sypnexAPI.showNotification(
        `Code validation ${textEditor.validationEnabled ? 'enabled' : 'disabled'}`,
        'info'
    );
}


// Handle before unload
function handleBeforeUnload(e) {
    if (textEditor.isModified) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
}

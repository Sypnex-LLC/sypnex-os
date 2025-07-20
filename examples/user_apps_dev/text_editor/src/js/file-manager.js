// Create new file
function createNewFile() {
    if (textEditor.isModified) {
        if (confirm('You have unsaved changes. Create new file anyway?')) {
            clearEditor();
        }
    } else {
        clearEditor();
    }
}

// Load file from VFS
async function loadFile() {
    try {
        const filePath = await sypnexAPI.showFileExplorer({
            mode: 'open',
            title: 'Open Text File',
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
        
        // Check if file exists and load it
        const content = await sypnexAPI.readVirtualFileText(filePath);
        
        // Load content into editor
        textEditor.textarea.value = content;
        textEditor.filePath = filePath;
        textEditor.originalContent = content;
        
        // Update UI
        updateFilenameDisplay();
        updateLineNumbers();
        updateStatus();
        markAsSaved();
        
        // Enable syntax highlighting for loaded file
        await enableSyntaxHighlighting();
        
        // Force update highlighted content if highlighting is enabled
        if (textEditor.syntaxHighlightingEnabled && textEditor.highlightedEditor) {
            updateHighlightedContent();
        }
        
        // Schedule validation for Python files
        scheduleValidation();
        
        sypnexAPI.showNotification(`File loaded: ${filePath}`, 'success');
        
    } catch (error) {
        console.error('Failed to load file:', error);
        sypnexAPI.showNotification(`Failed to load file: ${error.message}`, 'error');
    }
}


// Save file to VFS
async function saveFile() {
    const content = textEditor.textarea.value;
    
    try {
        let filePath = textEditor.filePath;
        
        // If it's a new file (untitled) or we want to save as, show file explorer
        if (textEditor.filePath === '/untitled.txt') {
            filePath = await sypnexAPI.showFileExplorer({
                mode: 'save',
                title: 'Save Text File',
                initialPath: '/',
                fileName: 'untitled.txt',
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
        
        await sypnexAPI.writeVirtualFile(filePath, content);
        
        textEditor.filePath = filePath;
        updateFilenameDisplay();
        markAsSaved();
        
        // Enable syntax highlighting for saved file
        await enableSyntaxHighlighting();
        
        // Force update highlighted content if highlighting is enabled
        if (textEditor.syntaxHighlightingEnabled && textEditor.highlightedEditor) {
            updateHighlightedContent();
        }
        
        sypnexAPI.showNotification(`File saved: ${filePath}`, 'success');
        
    } catch (error) {
        console.error('Failed to save file:', error);
        sypnexAPI.showNotification(`Failed to save file: ${error.message}`, 'error');
    }
}

// Save file as (always show file explorer)
async function saveAsFile() {
    const content = textEditor.textarea.value;
    
    try {
        const filePath = await sypnexAPI.showFileExplorer({
            mode: 'save',
            title: 'Save Text File As',
            initialPath: '/',
            fileName: textEditor.filePath === '/untitled.txt' ? 'untitled.txt' : textEditor.filePath.split('/').pop(),
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
        
        await sypnexAPI.writeVirtualFile(filePath, content);
        
        textEditor.filePath = filePath;
        updateFilenameDisplay();
        markAsSaved();
        
        // Enable syntax highlighting for saved file
        await enableSyntaxHighlighting();
        
        // Force update highlighted content if highlighting is enabled
        if (textEditor.syntaxHighlightingEnabled && textEditor.highlightedEditor) {
            updateHighlightedContent();
        }
        
        sypnexAPI.showNotification(`File saved as: ${filePath}`, 'success');
        
    } catch (error) {
        console.error('Failed to save file as:', error);
        sypnexAPI.showNotification(`Failed to save file as: ${error.message}`, 'error');
    }
}

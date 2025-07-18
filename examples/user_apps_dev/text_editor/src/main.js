// Text Editor App
console.log('Text Editor app loading...');
console.log('Document ready state:', document.readyState);
console.log('Document body:', document.body);
console.log('Window sypnexAPI:', typeof window.sypnexAPI);

// Global variables
let textEditor = {
    textarea: null,
    lineNumbers: null,
    filePath: null,
    originalContent: '',
    isModified: false,
    autoSaveInterval: null,
    wordWrapEnabled: false,
    lineNumbersEnabled: true,
    settings: {},
    // Syntax highlighting
    prismLoaded: false,
    syntaxHighlightingEnabled: false,
    highlightedEditor: null,
    debounceTimer: null,
    // Cursor position tracking
    cursorPosition: 0
};

// DOM elements
let newFileBtn, loadFileBtn, saveFileBtn, saveAsFileBtn;
let currentFilenameEl, wordWrapToggle, lineNumbersToggle, syntaxHighlightingToggle;
let modifiedStatusEl;

// Initialize when DOM is ready
function initTextEditor() {
    console.log('Text Editor initializing...');
    
    // Check if SypnexAPI is available
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }

    console.log('SypnexAPI available:', sypnexAPI);
    console.log('App ID:', sypnexAPI.getAppId());
    
    // Test if app container exists
    const appContainer = document.querySelector('.app-container');
    console.log('App container found:', !!appContainer);
    if (appContainer) {
        console.log('App container content:', appContainer.innerHTML.substring(0, 200) + '...');
    }
    
    // Get DOM elements
    textEditor.textarea = document.getElementById('text-editor');
    textEditor.lineNumbers = document.getElementById('line-numbers');
    
    newFileBtn = document.getElementById('new-file');
    loadFileBtn = document.getElementById('load-file');
    saveFileBtn = document.getElementById('save-file');
    saveAsFileBtn = document.getElementById('save-as-file');
    currentFilenameEl = document.getElementById('current-filename');
    wordWrapToggle = document.getElementById('word-wrap-toggle');
    lineNumbersToggle = document.getElementById('line-numbers-toggle');
    syntaxHighlightingToggle = document.getElementById('syntax-highlighting-toggle');
    
    modifiedStatusEl = document.getElementById('modified-status');
    
    // Critical element checks
    if (!textEditor.textarea) {
        console.error('Text editor textarea not found');
        return;
    }
    
    if (!textEditor.lineNumbers) {
        console.error('Line numbers element not found');
        return;
    }
    
    console.log('DOM elements found:', {
        textarea: !!textEditor.textarea,
        lineNumbers: !!textEditor.lineNumbers,
        newFileBtn: !!newFileBtn,
        loadFileBtn: !!loadFileBtn,
        saveFileBtn: !!saveFileBtn,
        saveAsFileBtn: !!saveAsFileBtn,
        currentFilenameEl: !!currentFilenameEl,
        syntaxHighlightingToggle: !!syntaxHighlightingToggle,
        modifiedStatusEl: !!modifiedStatusEl
    });
    
    // Load settings
    loadSettings();
    
    // Load terminal state
    loadTerminalState();
    
    // Set up event handlers
    setupEventHandlers();
    
    // Initialize editor state
    initializeEditor();
    
    // Set initial button states
    if (syntaxHighlightingToggle) {
        syntaxHighlightingToggle.classList.toggle('active', textEditor.settings.syntaxHighlighting);
    }
    
    // Text Editor loaded successfully (no notification needed)
    
    console.log('Text Editor initialization complete');
}

// Load app settings
async function loadSettings() {
    try {
        textEditor.settings = {
            autoSaveInterval: await sypnexAPI.getSetting('AUTO_SAVE_INTERVAL', 30),
            fontSize: await sypnexAPI.getSetting('FONT_SIZE', 14),
            tabSize: await sypnexAPI.getSetting('TAB_SIZE', 4),
            syntaxHighlighting: await sypnexAPI.getSetting('SYNTAX_HIGHLIGHTING', true)
        };
        
        // Apply settings
        textEditor.textarea.style.fontSize = textEditor.settings.fontSize + 'px';
        textEditor.textarea.style.tabSize = textEditor.settings.tabSize;
        
        console.log('Settings loaded:', textEditor.settings);
    } catch (error) {
        console.error('Failed to load settings:', error);
        // Use defaults
        textEditor.settings = {
            autoSaveInterval: 30,
            fontSize: 14,
            tabSize: 4,
            syntaxHighlighting: true
        };
    }
}

// Load terminal state
async function loadTerminalState() {
    try {
        const terminalEnabled = await sypnexAPI.getSetting('TERMINAL_ENABLED', false);
        if (terminalEnabled && integratedTerminal) {
            integratedTerminal.classList.remove('hidden');
            if (terminalToggle) {
                terminalToggle.classList.add('active');
            }
        }
    } catch (error) {
        console.error('Failed to load terminal state:', error);
    }
}

// Check if file is supported for syntax highlighting
function getFileLanguage(filePath) {
    if (!filePath) return null;
    
    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    
    const languageMap = {
        '.py': 'python',
        '.pyw': 'python', 
        '.pyx': 'python',
        '.pyi': 'python',
        '.pyd': 'python',
        '.js': 'javascript',
        '.json': 'json',
        '.html': 'html',
        '.htm': 'html',
        '.css': 'css'
    };
    
    return languageMap[extension] || null;
}

// Check if file is Python (for backward compatibility)
function isPythonFile(filePath) {
    return getFileLanguage(filePath) === 'python';
}

// Load Prism.js for syntax highlighting
async function loadPrismJS() {
    if (textEditor.prismLoaded) return;
    
    try {
        console.log('Loading Prism.js for syntax highlighting...');
        
        // Load Prism.js library
        await sypnexAPI.loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js', {
            localName: 'Prism'
        });
        
        // Load language components
        await sypnexAPI.loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js');
        await sypnexAPI.loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js');
        await sypnexAPI.loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js');
        await sypnexAPI.loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js');
        await sypnexAPI.loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js');
        
        // Load Prism CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
        document.head.appendChild(link);
        
        textEditor.prismLoaded = true;
        console.log('✅ Prism.js with all language grammars loaded successfully');
        
    } catch (error) {
        console.error('Failed to load Prism.js:', error);
        sypnexAPI.showNotification('Failed to load syntax highlighting', 'error');
    }
}

// Create highlighted editor
function createHighlightedEditor() {
    if (!textEditor.prismLoaded) return;
    
    const editorWrapper = textEditor.textarea.parentElement;
    const textarea = textEditor.textarea;
    
    // Create highlighted editor div
    const highlightedEditor = document.createElement('div');
    highlightedEditor.id = 'highlighted-editor';
    highlightedEditor.className = 'highlighted-editor';
    highlightedEditor.contentEditable = true;
    highlightedEditor.spellcheck = false;
    
    // Copy textarea styles
    highlightedEditor.style.cssText = textarea.style.cssText;
    highlightedEditor.style.fontFamily = 'monospace';
    highlightedEditor.style.whiteSpace = 'pre-wrap';
    highlightedEditor.style.wordWrap = textEditor.wordWrapEnabled ? 'break-word' : 'normal';
    highlightedEditor.style.overflow = 'auto';
    highlightedEditor.style.resize = 'none';
    highlightedEditor.style.border = 'none';
    highlightedEditor.style.outline = 'none';
    highlightedEditor.style.background = 'transparent';
    highlightedEditor.style.color = 'inherit';
    
    // Hide original textarea
    textarea.style.display = 'none';
    
    // Insert highlighted editor
    editorWrapper.insertBefore(highlightedEditor, textarea);
    
    textEditor.highlightedEditor = highlightedEditor;
    
    // Set initial content
    updateHighlightedContent();
    
    // Set up event handlers for highlighted editor
    highlightedEditor.addEventListener('input', handleHighlightedInput);
    highlightedEditor.addEventListener('scroll', syncScroll);
    highlightedEditor.addEventListener('keydown', handleHighlightedKeyDown);
    highlightedEditor.addEventListener('paste', handleHighlightedPaste);
    highlightedEditor.addEventListener('click', updateCursorPosition);
    highlightedEditor.addEventListener('keyup', updateCursorPosition);
    highlightedEditor.addEventListener('focus', updateCursorPosition);
    
    console.log('✅ Highlighted editor created');
}

// Track cursor position
function updateCursorPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        textEditor.cursorPosition = getTextOffset(range.startContainer, range.startOffset);
        // Sync to textarea
        syncCursorToTextarea();
    }
}

// Sync cursor position from textarea to highlighted editor
function syncCursorFromTextarea() {
    if (!textEditor.highlightedEditor) return;
    
    const textarea = textEditor.textarea;
    const cursorPos = textarea.selectionStart;
    textEditor.cursorPosition = cursorPos;
    
    // Restore cursor position in highlighted editor
    setTimeout(() => {
        restoreCursorPosition();
    }, 0);
}

// Sync cursor position from highlighted editor to textarea
function syncCursorToTextarea() {
    if (!textEditor.highlightedEditor) return;
    
    const textarea = textEditor.textarea;
    textarea.setSelectionRange(textEditor.cursorPosition, textEditor.cursorPosition);
}

// Update highlighted content
function updateHighlightedContent() {
    if (!textEditor.highlightedEditor || !textEditor.prismLoaded) return;
    
    const content = textEditor.textarea.value;
    const language = getFileLanguage(textEditor.filePath);
    
    if (!language) {
        // No language detected, use plain text
        textEditor.highlightedEditor.textContent = content;
        return;
    }
    
    const highlightedContent = Prism.highlight(content, Prism.languages[language], language);
    
    // Store current cursor position
    updateCursorPosition();
    
    // Store the cursor position before DOM manipulation
    const savedCursorPos = textEditor.cursorPosition;
    
    textEditor.highlightedEditor.innerHTML = highlightedContent;
    
    // Restore cursor position immediately
    textEditor.cursorPosition = savedCursorPos;
    restoreCursorPosition();
}

// Restore cursor position
function restoreCursorPosition() {
    if (textEditor.cursorPosition <= 0) {
        // Fallback to textarea cursor position
        syncCursorFromTextarea();
        return;
    }
    
    const selection = window.getSelection();
    const textNode = findTextNodeAtOffset(textEditor.highlightedEditor, textEditor.cursorPosition);
    
    if (textNode) {
        const nodeOffset = Math.min(textNode._nodeOffset || 0, textNode.textContent.length);
        const range = document.createRange();
        range.setStart(textNode, nodeOffset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        // If we can't find the text node, fallback to textarea position
        syncCursorFromTextarea();
    }
}

// Get text offset for cursor preservation - improved version
function getTextOffset(node, offset) {
    let totalOffset = 0;
    const walker = document.createTreeWalker(
        textEditor.highlightedEditor,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let currentNode;
    while (currentNode = walker.nextNode()) {
        if (currentNode === node) {
            return totalOffset + offset;
        }
        totalOffset += currentNode.textContent.length;
    }
    return totalOffset;
}

// Find text node at offset for cursor restoration - improved version
function findTextNodeAtOffset(element, offset) {
    let currentOffset = 0;
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;
        if (currentOffset + nodeLength >= offset) {
            // Store the offset within this node for later use
            node._nodeOffset = offset - currentOffset;
            return node;
        }
        currentOffset += nodeLength;
    }
    
    // If we didn't find a node, return the last text node
    const allTextNodes = [];
    const walker2 = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    while (node = walker2.nextNode()) {
        allTextNodes.push(node);
    }
    const lastNode = allTextNodes[allTextNodes.length - 1];
    if (lastNode) {
        lastNode._nodeOffset = lastNode.textContent.length;
    }
    return lastNode || null;
}

// Handle input in highlighted editor
function handleHighlightedInput() {
    // Update textarea value
    textEditor.textarea.value = textEditor.highlightedEditor.textContent;
    
    // Update cursor position immediately
    updateCursorPosition();
    
    // Debounced highlighting with shorter delay for better responsiveness
    if (textEditor.debounceTimer) {
        clearTimeout(textEditor.debounceTimer);
    }
    
    textEditor.debounceTimer = setTimeout(() => {
        updateHighlightedContent();
    }, 50); // Reduced from 100ms to 50ms
    
    // Update line numbers and status
    updateLineNumbers();
    updateStatus();
    markAsModified();
}

// Handle keydown in highlighted editor
function handleHighlightedKeyDown(e) {
    // Tab handling
    if (e.key === 'Tab') {
        e.preventDefault();
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const spaces = ' '.repeat(textEditor.settings.tabSize);
        
        // Insert spaces at cursor position
        const textNode = range.startContainer;
        const offset = range.startOffset;
        textNode.textContent = textNode.textContent.substring(0, offset) + 
                              spaces + 
                              textNode.textContent.substring(offset);
        
        // Move cursor after inserted spaces
        range.setStart(textNode, offset + spaces.length);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event
        textEditor.highlightedEditor.dispatchEvent(new Event('input'));
        return;
    }
    
    // Enter key handling
    if (e.key === 'Enter') {
        e.preventDefault();
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // Insert newline at cursor position
        const textNode = range.startContainer;
        const offset = range.startOffset;
        
        // Handle case where cursor is at the end of a text node
        if (offset === textNode.textContent.length) {
            // Create a new text node after the current one
            const newTextNode = document.createTextNode('\n');
            textNode.parentNode.insertBefore(newTextNode, textNode.nextSibling);
            
            // Move cursor to the new text node
            range.setStart(newTextNode, 1);
            range.collapse(true);
        } else {
            // Insert newline in the middle of text
            textNode.textContent = textNode.textContent.substring(0, offset) + 
                                  '\n' + 
                                  textNode.textContent.substring(offset);
            
            // Move cursor after newline
            range.setStart(textNode, offset + 1);
            range.collapse(true);
        }
        
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event
        textEditor.highlightedEditor.dispatchEvent(new Event('input'));
        return;
    }
    
    // Handle other keyboard shortcuts
    handleKeyDown(e);
}

// Handle paste in highlighted editor
function handleHighlightedPaste(e) {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // Insert text at cursor position
    const textNode = range.startContainer;
    const offset = range.startOffset;
    textNode.textContent = textNode.textContent.substring(0, offset) + 
                          text + 
                          textNode.textContent.substring(offset);
    
    // Move cursor after inserted text
    range.setStart(textNode, offset + text.length);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Trigger input event
    textEditor.highlightedEditor.dispatchEvent(new Event('input'));
}

// Enable syntax highlighting for supported files
async function enableSyntaxHighlighting() {
    if (!textEditor.settings.syntaxHighlighting) return;
    
    const language = getFileLanguage(textEditor.filePath);
    
    if (language) {
        if (!textEditor.prismLoaded) {
            await loadPrismJS();
        }
        
        if (!textEditor.highlightedEditor) {
            createHighlightedEditor();
        }
        
        textEditor.syntaxHighlightingEnabled = true;
        console.log(`✅ Syntax highlighting enabled for ${language} file`);
    } else {
        // Disable highlighting for unsupported files
        if (textEditor.highlightedEditor) {
            textEditor.highlightedEditor.remove();
            textEditor.highlightedEditor = null;
            textEditor.textarea.style.display = '';
        }
        textEditor.syntaxHighlightingEnabled = false;
    }
}

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
    
    // Textarea events
    textEditor.textarea.addEventListener('input', handleTextChange);
    textEditor.textarea.addEventListener('scroll', syncScroll);
    textEditor.textarea.addEventListener('keydown', handleKeyDown);
    

    
    // Window events
    window.addEventListener('beforeunload', handleBeforeUnload);
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

// Handle text changes
function handleTextChange() {
    updateLineNumbers();
    updateStatus();
    markAsModified();
}

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
    
    // Focus appropriate editor
    if (textEditor.highlightedEditor) {
        textEditor.highlightedEditor.focus();
    } else {
        textEditor.textarea.focus();
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

// Toggle syntax highlighting
async function toggleSyntaxHighlighting() {
    textEditor.settings.syntaxHighlighting = !textEditor.settings.syntaxHighlighting;
    
    // Save setting
    try {
        await sypnexAPI.setSetting('SYNTAX_HIGHLIGHTING', textEditor.settings.syntaxHighlighting);
    } catch (error) {
        console.error('Failed to save syntax highlighting setting:', error);
    }
    
    // Update UI
    if (syntaxHighlightingToggle) {
        syntaxHighlightingToggle.classList.toggle('active', textEditor.settings.syntaxHighlighting);
    }
    
    // Apply highlighting if enabled
    if (textEditor.settings.syntaxHighlighting) {
        await enableSyntaxHighlighting();
    } else {
        // Disable highlighting
        if (textEditor.highlightedEditor) {
            textEditor.highlightedEditor.remove();
            textEditor.highlightedEditor = null;
            textEditor.textarea.style.display = '';
        }
        textEditor.syntaxHighlightingEnabled = false;
    }
    
    sypnexAPI.showNotification(
        `Syntax highlighting ${textEditor.settings.syntaxHighlighting ? 'enabled' : 'disabled'}`,
        'info'
    );
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
    }
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

// Handle before unload
function handleBeforeUnload(e) {
    if (textEditor.isModified) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextEditor);
} else {
    // DOM is already loaded
    initTextEditor();
}

console.log('Text Editor script loaded');
console.log('=== TEXT EDITOR DEBUG INFO ===');
console.log('Document ready state:', document.readyState);
console.log('Document body exists:', !!document.body);
console.log('Window sypnexAPI type:', typeof window.sypnexAPI);
console.log('Global sypnexAPI type:', typeof sypnexAPI);
console.log('App container exists:', !!document.querySelector('.app-container'));
console.log('Text editor textarea exists:', !!document.getElementById('text-editor'));
console.log('Line numbers exists:', !!document.getElementById('line-numbers'));
console.log('=== END DEBUG INFO ===');

// ===== INTEGRATED TERMINAL FUNCTIONALITY =====

// Terminal variables
let terminalToggle, integratedTerminal, terminalOutput, terminalInput, terminalResize;
let terminalHistory = [];
let terminalHistoryIndex = -1;
let terminalSocket = null;

// Initialize terminal functionality
function initIntegratedTerminal() {
    console.log('Initializing integrated terminal...');
    
    // Get terminal DOM elements
    terminalToggle = document.getElementById('terminal-toggle');
    integratedTerminal = document.getElementById('integrated-terminal');
    terminalOutput = document.getElementById('terminalOutput');
    terminalInput = document.getElementById('terminalInput');
    terminalResize = document.getElementById('terminal-resize');
    
    if (!terminalToggle || !integratedTerminal || !terminalOutput || !terminalInput) {
        console.error('Terminal elements not found');
        return;
    }
    
    // Set up terminal event handlers
    setupTerminalEventHandlers();
    
    // Connect to WebSocket for real-time output
    connectTerminalWebSocket();
    
    console.log('Integrated terminal initialized');
}

// Set up terminal event handlers
function setupTerminalEventHandlers() {
    // Terminal toggle button
    terminalToggle.addEventListener('click', toggleTerminal);
    
    // Terminal input handling
    terminalInput.addEventListener('keydown', handleTerminalKeyDown);
    
    // Terminal resize functionality
    if (terminalResize) {
        terminalResize.addEventListener('mousedown', startTerminalResize);
    }
    
    // Make terminal output focusable for copy/paste
    terminalOutput.setAttribute('tabindex', '0');
    terminalOutput.addEventListener('keydown', handleTerminalOutputKeyDown);
}

// Toggle terminal visibility
async function toggleTerminal() {
    const isVisible = !integratedTerminal.classList.contains('hidden');
    
    if (isVisible) {
        integratedTerminal.classList.add('hidden');
        terminalToggle.classList.remove('active');
        await sypnexAPI.setSetting('TERMINAL_ENABLED', false);
        sypnexAPI.showNotification('Terminal hidden', 'info');
    } else {
        integratedTerminal.classList.remove('hidden');
        terminalToggle.classList.add('active');
        await sypnexAPI.setSetting('TERMINAL_ENABLED', true);
        terminalInput.focus();
        sypnexAPI.showNotification('Terminal shown', 'info');
    }
}

// Handle terminal input key events
async function handleTerminalKeyDown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        await executeTerminalCommand();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateTerminalHistory(-1);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateTerminalHistory(1);
    }
}

// Execute terminal command
async function executeTerminalCommand() {
    const command = terminalInput.value.trim();
    if (!command) return;
    
    // Add command to output
    appendTerminalOutput(`$ ${command}`, 'terminal-success');
    
    // Add to history
    addToTerminalHistory(command);
    
    // Clear input
    terminalInput.value = '';
    
    try {
        // Execute command via SypnexAPI
        const result = await sypnexAPI.executeTerminalCommand(command);
        
        if (result.success) {
            if (result.output) {
                appendTerminalOutput(result.output);
            } else {
                appendTerminalOutput('Command executed successfully (no output)', 'terminal-info');
            }
        } else {
            appendTerminalOutput(`Error: ${result.error}`, 'terminal-error');
        }
    } catch (error) {
        appendTerminalOutput(`Error: ${error.message}`, 'terminal-error');
    }
    
    // Add empty line
    appendTerminalOutput('');
    
    // Focus input for next command
    terminalInput.focus();
}

// Append output to terminal
function appendTerminalOutput(text, className = '') {
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    terminalOutput.appendChild(line);
    
    // Scroll to bottom
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Add command to history
function addToTerminalHistory(command) {
    // Don't add empty commands or duplicates
    if (!command.trim() || (terminalHistory.length > 0 && terminalHistory[terminalHistory.length - 1] === command)) {
        return;
    }
    
    terminalHistory.push(command);
    terminalHistoryIndex = terminalHistory.length;
    
    // Keep history size reasonable
    if (terminalHistory.length > 50) {
        terminalHistory.shift();
        terminalHistoryIndex--;
    }
}

// Navigate terminal history
function navigateTerminalHistory(direction) {
    if (terminalHistory.length === 0) return;
    
    if (direction === -1) {
        // Go up in history
        if (terminalHistoryIndex > 0) {
            terminalHistoryIndex--;
        }
    } else {
        // Go down in history
        if (terminalHistoryIndex < terminalHistory.length - 1) {
            terminalHistoryIndex++;
        } else {
            terminalHistoryIndex = terminalHistory.length;
        }
    }
    
    if (terminalHistoryIndex >= 0 && terminalHistoryIndex < terminalHistory.length) {
        terminalInput.value = terminalHistory[terminalHistoryIndex];
    } else {
        terminalInput.value = '';
    }
    
    // Move cursor to end
    terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
}

// Handle terminal output keyboard shortcuts
function handleTerminalOutputKeyDown(e) {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection.toString()) {
                navigator.clipboard.writeText(selection.toString());
            } else {
                // Copy all terminal output if nothing is selected
                const allText = terminalOutput.innerText || terminalOutput.textContent;
                navigator.clipboard.writeText(allText);
            }
        } else if (e.key === 'a') {
            e.preventDefault();
            const range = document.createRange();
            range.selectNodeContents(terminalOutput);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }
}

// Connect to WebSocket for real-time terminal output
async function connectTerminalWebSocket() {
    try {
        // Connect to WebSocket
        await sypnexAPI.connectSocket();
        
        // Join terminal room
        sypnexAPI.joinRoom('terminal');
        
        // Listen for terminal output
        sypnexAPI.on('terminal_output', (data) => {
            handleTerminalWebSocketOutput(data);
        });
        
        console.log('Terminal WebSocket connected');
    } catch (error) {
        console.error('Failed to connect terminal WebSocket:', error);
    }
}

// Handle WebSocket terminal output
function handleTerminalWebSocketOutput(data) {
    const { output, type } = data;
    
    // Determine output class based on type
    let className = '';
    if (type === 'stderr') {
        className = 'terminal-error';
    } else if (type === 'completion') {
        className = 'terminal-info';
    } else if (type === 'error') {
        className = 'terminal-error';
    }
    
    // Append the output
    appendTerminalOutput(output, className);
}

// Terminal resize functionality
function startTerminalResize(e) {
    e.preventDefault();
    
    const startY = e.clientY;
    const startHeight = integratedTerminal.offsetHeight;
    
    function onMouseMove(e) {
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
        integratedTerminal.style.height = newHeight + 'px';
    }
    
    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// Initialize terminal when text editor is ready
function initTextEditorWithTerminal() {
    initTextEditor();
    initIntegratedTerminal();
}

// Replace the original initTextEditor call
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextEditorWithTerminal);
} else {
    // DOM is already loaded
    initTextEditorWithTerminal();
} 
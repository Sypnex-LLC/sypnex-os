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
    highlightContainer: null,
    originalTextareaStyles: null,
    debounceTimer: null,
    // Cursor position tracking
    cursorPosition: 0,
    // Code validation
    pyodideLoaded: false,
    validationEnabled: true,
    validationDebounceTimer: null,
    currentErrors: [],
    errorMarkers: []
};

// DOM elements
let newFileBtn, loadFileBtn, saveFileBtn, saveAsFileBtn;
let currentFilenameEl, wordWrapToggle, lineNumbersToggle, syntaxHighlightingToggle, validationToggle;
let modifiedStatusEl, errorCountEl;

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
    validationToggle = document.getElementById('validation-toggle');
    
    modifiedStatusEl = document.getElementById('modified-status');
    errorCountEl = document.getElementById('error-count');
    
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
    if (validationToggle) {
        validationToggle.classList.toggle('active', textEditor.validationEnabled);
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
            syntaxHighlighting: await sypnexAPI.getSetting('SYNTAX_HIGHLIGHTING', true),
            codeValidation: await sypnexAPI.getSetting('CODE_VALIDATION', true)
        };
        
    // Apply settings
    textEditor.textarea.style.fontSize = textEditor.settings.fontSize + 'px';
    textEditor.textarea.style.tabSize = textEditor.settings.tabSize;
    textEditor.validationEnabled = textEditor.settings.codeValidation;
    
    // Disable browser spell checking and auto-features for code editing
    textEditor.textarea.setAttribute('spellcheck', 'false');
    textEditor.textarea.setAttribute('autocomplete', 'off');
    textEditor.textarea.setAttribute('autocorrect', 'off');
    textEditor.textarea.setAttribute('autocapitalize', 'off');        console.log('Settings loaded:', textEditor.settings);
    } catch (error) {
        console.error('Failed to load settings:', error);
        // Use defaults
        textEditor.settings = {
            autoSaveInterval: 30,
            fontSize: 14,
            tabSize: 4,
            syntaxHighlighting: true,
            codeValidation: true
        };
        textEditor.validationEnabled = true;
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
        
        // Add custom CSS to fix styling issues
        const customStyle = document.createElement('style');
        customStyle.textContent = `
            .highlighted-backdrop * {
                text-decoration: none !important;
                text-decoration-line: none !important;
                text-decoration-style: none !important;
                text-decoration-color: transparent !important;
                border-bottom: none !important;
                text-underline-offset: 0 !important;
            }
            .highlighted-backdrop .token.string {
                text-decoration: none !important;
            }
        `;
        document.head.appendChild(customStyle);
        
        textEditor.prismLoaded = true;
        console.log('✅ Prism.js with all language grammars loaded successfully');
        
    } catch (error) {
        console.error('Failed to load Prism.js:', error);
        sypnexAPI.showNotification('Failed to load syntax highlighting', 'error');
    }
}

// Load Pyodide for Python syntax validation
async function loadPyodide() {
    console.log('📦 loadPyodide called, current state:', textEditor.pyodideLoaded);
    
    if (textEditor.pyodideLoaded && window.pyodide) {
        console.log('✅ Pyodide already loaded, returning existing instance');
        return window.pyodide;
    }
    
    try {
        console.log('🚀 Starting Pyodide loading process...');
        
        // Load Pyodide script
        await sypnexAPI.loadLibrary('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js', {
            localName: 'loadPyodide'
        });
        
        console.log('📚 Pyodide library loaded, initializing instance...');
        
        // Initialize Pyodide - use the global loadPyodide function
        window.pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });
        
        console.log('🐍 Pyodide initialized, installing Python validation function...');
        
        // Install validation function
        window.pyodide.runPython(`
import ast

def validate_python_syntax(code):
    """Validate Python syntax and return errors"""
    try:
        # Try to parse the code as an AST
        ast.parse(code)
        return {"valid": True, "errors": []}
    except SyntaxError as e:
        error_info = {
            "line": e.lineno or 1,
            "column": e.offset or 1, 
            "message": e.msg or "Syntax error",
            "type": "syntax"
        }
        return {"valid": False, "errors": [error_info]}
    except Exception as e:
        error_info = {
            "line": 1,
            "column": 1,
            "message": str(e),
            "type": "general"
        }
        return {"valid": False, "errors": [error_info]}
        `);
        
        textEditor.pyodideLoaded = true;
        console.log('✅ Pyodide loaded and configured successfully!');
        
        // Show notification
        sypnexAPI.showNotification('Python validation ready!', 'success');
        
        return window.pyodide;
        
    } catch (error) {
        console.error('❌ Failed to load Pyodide:', error);
        sypnexAPI.showNotification('Failed to load Python validation: ' + error.message, 'error');
        throw error;
    }
}

// Validate Python syntax using Pyodide
async function validatePythonSyntax(code) {
    console.log('🔬 validatePythonSyntax called');
    console.log('Validation enabled:', textEditor.validationEnabled);
    
    if (!textEditor.validationEnabled) {
        console.log('❌ Validation disabled - returning valid');
        return {"valid": true, "errors": []};
    }
    
    try {
        console.log('📦 Loading Pyodide...');
        const pyodide = await loadPyodide();
        console.log('✅ Pyodide loaded, validating code...');
        
        // Call the Python validation function
        pyodide.globals.set("code_to_validate", code);
        const result = pyodide.runPython("validate_python_syntax(code_to_validate)");
        
        const jsResult = result.toJs({dict_converter: Object.fromEntries});
        console.log('🎯 Python validation result:', jsResult);
        
        return jsResult;
        
    } catch (error) {
        console.error('❌ Pyodide validation error:', error);
        console.log('🔄 Falling back to basic syntax validation...');
        
        // Fallback to basic client-side validation
        return validatePythonBasic(code);
    }
}

// Basic Python syntax validation (fallback)
function validatePythonBasic(code) {
    console.log('🔧 Using basic Python validation fallback');
    const errors = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) return;
        
        // Check for unterminated strings (more accurate)
        let inString = false;
        let stringChar = null;
        let escaped = false;
        
        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];
            
            if (escaped) {
                escaped = false;
                continue;
            }
            
            if (char === '\\') {
                escaped = true;
                continue;
            }
            
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar) {
                inString = false;
                stringChar = null;
            }
        }
        
        if (inString) {
            errors.push({
                line: lineNum,
                column: 1,
                message: "Unterminated string literal",
                type: "syntax"
            });
        }
        
        // Check for missing colons after control structures (more precise)
        const controlStructures = /^(if|elif|else|for|while|def|class|try|except|finally|with|async\s+def)\s/;
        if (controlStructures.test(trimmed) && !trimmed.endsWith(':') && !trimmed.includes('#')) {
            errors.push({
                line: lineNum,
                column: trimmed.length,
                message: "Missing colon",
                type: "syntax"
            });
        }
        
        // Check for basic indentation errors (very basic)
        if (trimmed.match(/^(return|break|continue|pass|raise|yield)\s/) && line !== trimmed) {
            // These keywords should typically be at proper indentation levels
            // But this is too complex for basic validation, so skip it
        }
        
        // Only check parentheses on lines that seem to have function calls or definitions
        if (trimmed.includes('(') || trimmed.includes(')')) {
            const openParens = (trimmed.match(/\(/g) || []).length;
            const closeParens = (trimmed.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                errors.push({
                    line: lineNum,
                    column: 1,
                    message: "Unmatched parentheses",
                    type: "syntax"
                });
            }
        }
    });
    
    console.log(`🎯 Basic validation found ${errors.length} errors`);
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

// Schedule validation with debouncing
function scheduleValidation() {
    console.log('🔍 scheduleValidation called');
    console.log('Current file path:', textEditor.filePath);
    console.log('Is Python file:', isPythonFile(textEditor.filePath));
    console.log('Validation enabled:', textEditor.validationEnabled);
    
    // Clear existing timer
    if (textEditor.validationDebounceTimer) {
        clearTimeout(textEditor.validationDebounceTimer);
    }
    
    // Only validate Python files
    if (!isPythonFile(textEditor.filePath) || !textEditor.validationEnabled) {
        console.log('❌ Skipping validation - not Python file or validation disabled');
        clearErrorMarkers();
        updateErrorCount(0);
        return;
    }
    
    console.log('✅ Scheduling Python validation...');
    
    // Debounce validation to avoid too frequent calls and interference with typing
    textEditor.validationDebounceTimer = setTimeout(async () => {
        const code = textEditor.textarea.value;
        console.log('🐍 About to validate Python code:', code.substring(0, 100) + '...');
        
        // Don't validate empty files
        if (!code.trim()) {
            console.log('📝 Empty code - clearing errors');
            clearErrorMarkers();
            updateErrorCount(0);
            return;
        }
        
        try {
            console.log('🚀 Calling validatePythonSyntax...');
            const result = await validatePythonSyntax(code);
            console.log('📊 Validation result:', result);
            displayValidationErrors(result.errors || []);
        } catch (error) {
            console.error('❌ Validation scheduling error:', error);
        }
    }, 1000); // 1000ms delay - much longer to avoid interfering with fast typing
}

// Display validation errors in the editor
function displayValidationErrors(errors) {
    // Clear previous errors
    clearErrorMarkers();
    
    // Store current errors
    textEditor.currentErrors = errors;
    
    // Update error count
    updateErrorCount(errors.length);
    
    // Add error markers
    errors.forEach(error => {
        addErrorMarker(error.line, error.message, error.type);
    });
    
    console.log(`Validation complete: ${errors.length} errors found`);
}

// Add error marker to a specific line
function addErrorMarker(lineNumber, message, type = 'syntax') {
    if (!textEditor.lineNumbers || lineNumber < 1) return;
    
    // Find the line number element
    const lineNumberElements = textEditor.lineNumbers.children;
    const lineIndex = lineNumber - 1; // Convert to 0-based index
    
    if (lineIndex < lineNumberElements.length) {
        const lineEl = lineNumberElements[lineIndex];
        
        // Add error class
        lineEl.classList.add('line-error');
        lineEl.title = `Line ${lineNumber}: ${message}`;
        
        // Store error info for cleanup
        textEditor.errorMarkers.push(lineEl);
    }
    
    // Also try to add underline to the text if using highlighted editor
    if (textEditor.highlightedEditor) {
        addErrorUnderline(lineNumber, message);
    }
}

// Add error underline to highlighted editor (basic implementation)
function addErrorUnderline(lineNumber, message) {
    // This is a simplified version - we could make it more sophisticated
    // For now, we'll rely on the line number highlighting
    console.log(`Error on line ${lineNumber}: ${message}`);
}

// Clear all error markers
function clearErrorMarkers() {
    // Clear line number error classes
    textEditor.errorMarkers.forEach(lineEl => {
        lineEl.classList.remove('line-error');
        lineEl.removeAttribute('title');
    });
    
    textEditor.errorMarkers = [];
    textEditor.currentErrors = [];
}

// Update error count in status bar
function updateErrorCount(count) {
    if (errorCountEl) {
        errorCountEl.textContent = count.toString();
        errorCountEl.style.color = count > 0 ? '#ff6b6b' : '#51cf66';
    }
}

// Create highlighted editor
function createHighlightedEditor() {
    if (!textEditor.prismLoaded) return;
    
    // Clean up any existing highlighted setup
    cleanupHighlightedEditor();
    
    const editorWrapper = textEditor.textarea.parentElement;
    const textarea = textEditor.textarea;
    
    // Store original textarea styles
    const originalStyles = {
        position: textarea.style.position,
        background: textarea.style.background,
        color: textarea.style.color,
        zIndex: textarea.style.zIndex,
        caretColor: textarea.style.caretColor,
        spellcheck: textarea.getAttribute('spellcheck'),
        autocomplete: textarea.getAttribute('autocomplete'),
        autocorrect: textarea.getAttribute('autocorrect'),
        autocapitalize: textarea.getAttribute('autocapitalize')
    };
    
    // Create a container for the overlay approach
    const highlightContainer = document.createElement('div');
    highlightContainer.className = 'highlight-container';
    highlightContainer.style.position = 'relative';
    highlightContainer.style.width = '100%';
    highlightContainer.style.height = '100%';
    
    // Create highlighted backdrop
    const highlightedBackdrop = document.createElement('div');
    highlightedBackdrop.id = 'highlighted-backdrop';
    highlightedBackdrop.className = 'highlighted-backdrop';
    highlightedBackdrop.style.position = 'absolute';
    highlightedBackdrop.style.top = '0';
    highlightedBackdrop.style.left = '0';
    highlightedBackdrop.style.width = '100%';
    highlightedBackdrop.style.height = '100%';
    highlightedBackdrop.style.pointerEvents = 'none';
    highlightedBackdrop.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
    highlightedBackdrop.style.fontSize = window.getComputedStyle(textarea).fontSize;
    highlightedBackdrop.style.lineHeight = window.getComputedStyle(textarea).lineHeight;
    highlightedBackdrop.style.padding = window.getComputedStyle(textarea).padding;
    highlightedBackdrop.style.margin = '0';
    highlightedBackdrop.style.border = window.getComputedStyle(textarea).border;
    highlightedBackdrop.style.whiteSpace = 'pre-wrap';
    highlightedBackdrop.style.wordWrap = 'break-word';
    highlightedBackdrop.style.overflow = 'hidden';
    highlightedBackdrop.style.zIndex = '1';
    highlightedBackdrop.style.resize = 'none';
    highlightedBackdrop.style.color = '#ffffff'; // Default text color for highlighting
    
    // Make sure textarea is on top and has transparent background and text
    textarea.style.position = 'relative';
    textarea.style.zIndex = '2';
    textarea.style.background = 'transparent';
    textarea.style.color = 'transparent';
    textarea.style.caretColor = '#ffffff';
    
    // Disable browser spell checking for code
    textarea.setAttribute('spellcheck', 'false');
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('autocorrect', 'off');
    textarea.setAttribute('autocapitalize', 'off');
    
    // Wrap textarea in container
    editorWrapper.insertBefore(highlightContainer, textarea);
    highlightContainer.appendChild(highlightedBackdrop);
    highlightContainer.appendChild(textarea);
    
    textEditor.highlightedEditor = highlightedBackdrop;
    textEditor.highlightContainer = highlightContainer;
    textEditor.originalTextareaStyles = originalStyles;
    textEditor.syntaxHighlightingEnabled = true;
    
    // Set initial content
    updateHighlightedContent();
    
    // Set up simple event handlers for the textarea (not the backdrop)
    textarea.addEventListener('input', handleSimpleInput);
    textarea.addEventListener('scroll', syncBackdropScroll);
    textarea.addEventListener('keydown', handleHighlightKeyDown);
    textarea.addEventListener('click', handleHighlightClick);
    textarea.addEventListener('focus', handleHighlightFocus);
    
    console.log('✅ Highlighted backdrop created (overlay method)');
}

// Focus appropriate editor
function focusEditor() {
    if (textEditor.textarea) {
        textEditor.textarea.focus();
    }
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
    
    // Apply syntax highlighting to backdrop
    const highlightedContent = Prism.highlight(content, Prism.languages[language], language);
    textEditor.highlightedEditor.innerHTML = highlightedContent;
    
    // Sync scroll position
    syncBackdropScroll();
    
    console.log('✅ Backdrop highlighting updated');
}

// Simple helper functions (keeping these for potential future use)
function getSimpleTextContent() {
    return textEditor.textarea.value;
}

// Handle simple input for backdrop approach
function handleSimpleInput() {
    // Update line numbers and status immediately
    updateLineNumbers();
    updateStatus();
    markAsModified();
    
    // Immediate highlighting update for responsive feel
    updateHighlightedContent();
    
    // Schedule validation for Python files
    scheduleValidation();
}

// Handle key events that might change content
function handleHighlightKeyDown(e) {
    // For keys that modify content, update highlighting immediately after the event
    if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
        setTimeout(() => {
            updateHighlightedContent();
        }, 0); // Update on next tick after the key event is processed
    }
}

// Handle click events (cursor position changes)
function handleHighlightClick() {
    // Sync scroll position when user clicks
    syncBackdropScroll();
}

// Handle focus events
function handleHighlightFocus() {
    // Ensure highlighting is in sync when textarea gets focus
    updateHighlightedContent();
    syncBackdropScroll();
}

// Sync backdrop scroll with textarea
function syncBackdropScroll() {
    if (textEditor.highlightedEditor) {
        textEditor.highlightedEditor.scrollTop = textEditor.textarea.scrollTop;
        textEditor.highlightedEditor.scrollLeft = textEditor.textarea.scrollLeft;
    }
}

// Clean up highlighted editor
function cleanupHighlightedEditor() {
    if (textEditor.highlightContainer) {
        // Restore original textarea styles
        if (textEditor.originalTextareaStyles) {
            const textarea = textEditor.textarea;
            textarea.style.position = textEditor.originalTextareaStyles.position;
            textarea.style.background = textEditor.originalTextareaStyles.background;
            textarea.style.color = textEditor.originalTextareaStyles.color;
            textarea.style.zIndex = textEditor.originalTextareaStyles.zIndex;
            textarea.style.caretColor = textEditor.originalTextareaStyles.caretColor;
            
            // Restore browser features attributes
            if (textEditor.originalTextareaStyles.spellcheck) {
                textarea.setAttribute('spellcheck', textEditor.originalTextareaStyles.spellcheck);
            }
            if (textEditor.originalTextareaStyles.autocomplete) {
                textarea.setAttribute('autocomplete', textEditor.originalTextareaStyles.autocomplete);
            }
            if (textEditor.originalTextareaStyles.autocorrect) {
                textarea.setAttribute('autocorrect', textEditor.originalTextareaStyles.autocorrect);
            }
            if (textEditor.originalTextareaStyles.autocapitalize) {
                textarea.setAttribute('autocapitalize', textEditor.originalTextareaStyles.autocapitalize);
            }
        }
        
        // Remove the container and restore textarea to its original parent
        const editorWrapper = textEditor.highlightContainer.parentElement;
        const textarea = textEditor.textarea;
        
        // Move textarea back to its original location
        editorWrapper.insertBefore(textarea, textEditor.highlightContainer);
        
        // Remove the highlight container
        textEditor.highlightContainer.remove();
        
        // Clear references
        textEditor.highlightContainer = null;
        textEditor.highlightedEditor = null;
        textEditor.originalTextareaStyles = null;
    }
}

// Simple helper functions (keeping these for potential future use)
function getSimpleTextContent() {
    return textEditor.textarea.value;
}

// Enable syntax highlighting for supported files
async function enableSyntaxHighlighting() {
    if (!textEditor.settings.syntaxHighlighting) {
        cleanupHighlightedEditor();
        textEditor.syntaxHighlightingEnabled = false;
        return;
    }
    
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
        cleanupHighlightedEditor();
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
    validationToggle?.addEventListener('click', toggleValidation);
    
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
    
    // Schedule validation for Python files
    scheduleValidation();
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
    
    // Also sync the backdrop if it exists
    syncBackdropScroll();
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
    
    // Clear any existing errors
    clearErrorMarkers();
    updateErrorCount(0);
    
    // Focus the textarea (not the backdrop)
    focusEditor();
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
    
    // Apply or disable highlighting
    if (textEditor.settings.syntaxHighlighting) {
        await enableSyntaxHighlighting();
    } else {
        // Disable highlighting
        cleanupHighlightedEditor();
        textEditor.syntaxHighlightingEnabled = false;
    }
    
    sypnexAPI.showNotification(
        `Syntax highlighting ${textEditor.settings.syntaxHighlighting ? 'enabled' : 'disabled'}`,
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
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



// Replace the original initTextEditor call
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextEditorWithTerminal);
} else {
    // DOM is already loaded
    initTextEditorWithTerminal();
} 
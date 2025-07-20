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

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
// Sypnex OS - Terminal Module
// Contains terminal core functionality

// Extend SypnexOS class with terminal methods
Object.assign(SypnexOS.prototype, {
    setupTerminalCore(windowElement) {
        const container = windowElement.querySelector('#terminalContainer');
        const output = windowElement.querySelector('#terminalOutput');
        const inputLine = windowElement.querySelector('#terminalInputLine');
        const input = windowElement.querySelector('#terminalInput');
        const prompt = windowElement.querySelector('#terminalPrompt');
        const history = windowElement.querySelector('#commandHistory');
        const suggestions = windowElement.querySelector('#commandSuggestions');
        
        if (!output || !input || !prompt || !inputLine) {
            console.warn('Terminal Core elements not found');
            return;
        }
        
        let commandHistory = [];
        let currentHistoryIndex = -1;
        let availableCommands = [];
        let currentVfsDirectory = '/';  // Track current virtual file system directory

        // Update prompt based on current directory
        function updatePrompt() {
            const displayPath = currentVfsDirectory === '/' ? '~' : `~${currentVfsDirectory}`;
            prompt.textContent = `${displayPath}$`;
        }

        function focusInput() {
            // Find the current active input (the last one that's not disabled)
            const activeInput = container.querySelector('.terminal-live-input:not([disabled])');
            if (activeInput) {
                activeInput.focus();
            } else {
                input.focus();
            }
        }
        
        // Auto-focus the terminal input when clicking anywhere in the container
        container.addEventListener('click', (e) => {
            // Find the current active input (the last one that's not disabled)
            const activeInput = container.querySelector('.terminal-live-input:not([disabled])');
            if (activeInput) {
                activeInput.focus();
            }
        });

        // Initialize with focus and updated prompt
        updatePrompt();
        setTimeout(() => focusInput(), 100);

        // Create a new input line (like a real terminal)
        function createNewInputLine() {
            const newInputLine = document.createElement('div');
            newInputLine.className = 'terminal-input-line';
            newInputLine.innerHTML = `
                <span class="terminal-prompt">${prompt.textContent}</span>
                <input type="text" class="terminal-live-input" autocomplete="off" spellcheck="false">
            `;
            
            output.appendChild(newInputLine);
            
            // Get reference to the new input element
            const newInput = newInputLine.querySelector('.terminal-live-input');
            
            // Setup event listeners for the new input BEFORE focusing
            setupInputEventListeners(newInput);
            
            // Focus the new input
            setTimeout(() => {
                newInput.focus();
            }, 10);
            
            // Scroll to bottom
            output.scrollTop = output.scrollHeight;
            
            return newInput;
        }

        function setupInputEventListeners(inputElement) {
            // Event listeners for the input
            inputElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    executeCommand(inputElement);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    navigateHistory(-1, inputElement);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    navigateHistory(1, inputElement);
                } else if (e.key === 'Tab') {
                    e.preventDefault();
                    showHistory(inputElement);
                }
            });
            
            // Copy/paste shortcuts
            inputElement.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'a') {
                        e.preventDefault();
                        inputElement.select();
                    }
                }
            });
        }
        
        // Setup initial input event listeners
        setupInputEventListeners(input);
        
        function addToHistory(command) {
            if (command.trim() && !commandHistory.includes(command.trim())) {
                commandHistory.unshift(command.trim());
                if (commandHistory.length > 50) {
                    commandHistory.pop();
                }
            }
            currentHistoryIndex = -1;
        }
        
        function navigateHistory(direction, inputElement) {
            if (commandHistory.length === 0) return;
            currentHistoryIndex += direction;
            if (currentHistoryIndex >= commandHistory.length) {
                currentHistoryIndex = commandHistory.length - 1;
            } else if (currentHistoryIndex < -1) {
                currentHistoryIndex = -1;
            }
            if (currentHistoryIndex === -1) {
                inputElement.value = '';
            } else {
                inputElement.value = commandHistory[currentHistoryIndex];
            }
        }
        
        function showHistory(inputElement) {
            if (commandHistory.length === 0) return;
            history.innerHTML = '';
            commandHistory.forEach(cmd => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.textContent = cmd;
                item.addEventListener('click', () => {
                    inputElement.value = cmd;
                    hideHistory();
                    inputElement.focus();
                });
                history.appendChild(item);
            });
            history.style.display = 'block';
        }
        
        function hideHistory() {
            history.style.display = 'none';
        }
        
        function appendOutput(text, className = '') {
            const line = document.createElement('div');
            line.className = `terminal-line ${className}`;
            
            // Check if this is ls command output and apply highlighting
            if (text && !text.includes('$') && !text.includes('Error:')) {
                // This might be ls output, apply highlighting
                let highlightedText = text;
                
                // First escape HTML characters to prevent injection
                highlightedText = highlightedText.replace(/&/g, '&amp;')
                                               .replace(/</g, '&lt;')
                                               .replace(/>/g, '&gt;')
                                               .replace(/"/g, '&quot;')
                                               .replace(/'/g, '&#39;');
                
                // Now apply highlighting (after escaping)
                highlightedText = highlightedText.replace(/([a-zA-Z0-9._-]+\/)/g, '<span class="terminal-directory">$1</span>');
                highlightedText = highlightedText.replace(/([a-zA-Z0-9._-]+\.py\*)/g, '<span class="terminal-executable">$1</span>');
                highlightedText = highlightedText.replace(/([a-zA-Z0-9._-]+\.py)(?!\*)/g, '<span class="terminal-executable">$1</span>');
                
                // Convert newlines to <br> tags
                highlightedText = highlightedText.replace(/\n/g, '<br>');
                
                line.innerHTML = highlightedText;
            } else {
                // Regular output, no highlighting
                line.innerHTML = text.replace(/&/g, '&amp;')
                                    .replace(/</g, '&lt;')
                                    .replace(/>/g, '&gt;')
                                    .replace(/"/g, '&quot;')
                                    .replace(/'/g, '&#39;')
                                    .replace(/\n/g, '<br>');
            }
            
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
        }
        
        // Track active Python executions
        let activePythonExecutions = new Set();
        let socket = null;
        let waitingForPythonCompletion = false;
        
        // Initialize WebSocket connection for Python output
        async function initializeWebSocket() {
            try {
                // Check if Socket.IO is available
                if (typeof io !== 'undefined') {
                    // Connect to Socket.IO server
                    socket = io();
                    
                    socket.on('connect', () => {
                        
                        // Join terminal room for Python execution output
                        socket.emit('join_room', { room: 'terminal' });
                    });
                    
                    socket.on('disconnect', () => {
                    });
                    
                    // Listen for Python output
                    socket.on('terminal_output', (data) => {
                        handlePythonOutput(data);
                    });
                    
                    socket.on('connect_error', (error) => {
                        console.error('Terminal: WebSocket connection error:', error);
                    });
                    
                } else {
                    console.warn('Terminal: Socket.IO not available for WebSocket connection');
                }
            } catch (error) {
                console.error('Terminal: WebSocket initialization error:', error);
            }
        }
        
        // Handle Python execution output
        function handlePythonOutput(data) {
            const { execution_id, output, type } = data;
            
            // Determine output class based on type
            let className = 'terminal-output';
            if (type === 'stderr') {
                className = 'terminal-error';
            } else if (type === 'completion') {
                className = 'terminal-info';
                // Python execution completed, create new input line
                waitingForPythonCompletion = false;
                setTimeout(() => createNewInputLine(), 100);
                return; // Don't append the completion message
            } else if (type === 'error') {
                className = 'terminal-error';
                // Python execution completed with error, create new input line
                waitingForPythonCompletion = false;
                setTimeout(() => createNewInputLine(), 100);
            }
            
            // Append the output
            appendOutput(output, className);
            
            // Scroll to bottom
            output.scrollTop = output.scrollHeight;
        }
        
        async function executeCommand(inputElement) {
            const command = inputElement.value.trim();
            if (!command) return;

            // Disable the current input
            inputElement.disabled = true;
            
            addToHistory(command);
            hideHistory();
            
            // Check if this is a Python command
            const isPythonCommand = command.startsWith('python ') || command.startsWith('python3 ') || command === 'python' || command === 'python3';
            
            try {
                const response = await fetch('/api/terminal/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ command: command })
                });
                
                const data = await response.json();
                if (response.ok) {
                    // Handle clear screen command
                    if (data.clear_screen) {
                        output.innerHTML = '';
                        updatePrompt();
                        createNewInputLine();
                        return;
                    }
                    
                    // Add command output to terminal
                    if (data.output) {
                        appendOutput(data.output);
                    } else if (data.error) {
                        appendOutput(`Error: ${data.error}`, 'terminal-error');
                    }
                    
                    // Update current directory if cd command was successful
                    if (command.startsWith('cd ') && !data.error) {
                        const match = data.output.match(/Changed to directory: (.+)/);
                        if (match) {
                            currentVfsDirectory = match[1];
                            updatePrompt();
                        }
                    } else if (command === 'cd' && !data.error) {
                        currentVfsDirectory = '/';
                        updatePrompt();
                    }
                    
                    // Check if this is a Python execution that will have async output
                    if (isPythonCommand && data.execution_id) {
                        // Wait for Python completion before creating new input line
                        waitingForPythonCompletion = true;
                        return;
                    }
                } else {
                    appendOutput(`Error: ${data.error}`, 'terminal-error');
                }
            } catch (error) {
                appendOutput(`Error: ${error.message}`, 'terminal-error');
            }
            
            // Create new input line for next command (only if not waiting for Python)
            if (!waitingForPythonCompletion) {
                createNewInputLine();
            }
        }

        async function loadAvailableCommands() {
            try {
                const response = await fetch('/api/terminal/commands');
                if (response.ok) {
                    availableCommands = await response.json();
                }
            } catch (error) {
                console.error('Failed to load available commands:', error);
            }
        }
        
        // Add context menu and copy/paste support to terminal output
        output.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            
            // Create context menu
            const contextMenu = document.createElement('div');
            contextMenu.className = 'terminal-context-menu';
            contextMenu.style.cssText = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                background: var(--glass-bg);
                border: 1px solid var(--glass-border);
                border-radius: 8px;
                backdrop-filter: blur(20px);
                padding: 4px 0;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            
            // Copy button
            const copyBtn = document.createElement('div');
            copyBtn.textContent = 'Copy';
            copyBtn.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                color: var(--text-primary);
                font-size: 14px;
                transition: background-color 0.2s ease;
            `;
            copyBtn.addEventListener('mouseenter', () => {
                copyBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
            });
            copyBtn.addEventListener('mouseleave', () => {
                copyBtn.style.backgroundColor = 'transparent';
            });
            copyBtn.addEventListener('click', () => {
                const selection = window.getSelection();
                if (selection.toString()) {
                    navigator.clipboard.writeText(selection.toString());
                } else {
                    // Copy all terminal output if nothing is selected
                    const allText = output.innerText || output.textContent;
                    navigator.clipboard.writeText(allText);
                }
                document.body.removeChild(contextMenu);
            });
            
            // Select All button
            const selectAllBtn = document.createElement('div');
            selectAllBtn.textContent = 'Select All';
            selectAllBtn.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                color: var(--text-primary);
                font-size: 14px;
                border-top: 1px solid var(--glass-border);
                transition: background-color 0.2s ease;
            `;
            selectAllBtn.addEventListener('mouseenter', () => {
                selectAllBtn.style.backgroundColor = 'rgba(0, 212, 255, 0.1)';
            });
            selectAllBtn.addEventListener('mouseleave', () => {
                selectAllBtn.style.backgroundColor = 'transparent';
            });
            selectAllBtn.addEventListener('click', () => {
                const range = document.createRange();
                range.selectNodeContents(output);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.body.removeChild(contextMenu);
            });
            
            contextMenu.appendChild(copyBtn);
            contextMenu.appendChild(selectAllBtn);
            document.body.appendChild(contextMenu);
            
            // Remove context menu when clicking outside
            const removeMenu = () => {
                if (document.body.contains(contextMenu)) {
                    document.body.removeChild(contextMenu);
                }
                document.removeEventListener('click', removeMenu);
            };
            setTimeout(() => {
                document.addEventListener('click', removeMenu);
            }, 100);
        });
        
        // Add keyboard shortcuts to terminal output
        output.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c') {
                    e.preventDefault();
                    const selection = window.getSelection();
                    if (selection.toString()) {
                        navigator.clipboard.writeText(selection.toString());
                    } else {
                        // Copy all terminal output if nothing is selected
                        const allText = output.innerText || output.textContent;
                        navigator.clipboard.writeText(allText);
                    }
                } else if (e.key === 'a') {
                    e.preventDefault();
                    const range = document.createRange();
                    range.selectNodeContents(output);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        });
        
        // Make terminal output focusable for keyboard shortcuts
        output.setAttribute('tabindex', '0');
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.terminal-container')) {
                hideHistory();
            }
        });
        
        // Load available commands and focus input initially
        loadAvailableCommands().then(() => {
            focusInput();
        });
        
        // Initialize WebSocket for Python output
        initializeWebSocket();
    }
}); 
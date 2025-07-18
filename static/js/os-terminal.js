// Sypnex OS - Terminal Module
// Contains terminal core functionality

// Extend SypnexOS class with terminal methods
Object.assign(SypnexOS.prototype, {
    setupTerminalCore(windowElement) {
        const output = windowElement.querySelector('#terminalOutput');
        const input = windowElement.querySelector('#terminalInput');
        const history = windowElement.querySelector('#commandHistory');
        const suggestions = windowElement.querySelector('#commandSuggestions');
        
        if (!output || !input || !history) {
            console.warn('Terminal Core elements not found');
            return;
        }
        
        let commandHistory = [];
        let currentHistoryIndex = -1;
        let availableCommands = [];
        let currentVfsDirectory = '/';  // Track current virtual file system directory

        function focusInput() {
            input.focus();
        }
        
        function addToHistory(command) {
            if (command.trim() && !commandHistory.includes(command.trim())) {
                commandHistory.unshift(command.trim());
                if (commandHistory.length > 50) {
                    commandHistory.pop();
                }
            }
            currentHistoryIndex = -1;
        }
        
        function navigateHistory(direction) {
            if (commandHistory.length === 0) return;
            currentHistoryIndex += direction;
            if (currentHistoryIndex >= commandHistory.length) {
                currentHistoryIndex = commandHistory.length - 1;
            } else if (currentHistoryIndex < -1) {
                currentHistoryIndex = -1;
            }
            if (currentHistoryIndex === -1) {
                input.value = '';
            } else {
                input.value = commandHistory[currentHistoryIndex];
            }
        }
        
        function showHistory() {
            if (commandHistory.length === 0) return;
            history.innerHTML = '';
            commandHistory.forEach(cmd => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.textContent = cmd;
                item.addEventListener('click', () => {
                    input.value = cmd;
                    hideHistory();
                    input.focus();
                });
                history.appendChild(item);
            });
            history.style.display = 'block';
        }
        
        function hideHistory() {
            history.style.display = 'none';
        }

        function showSuggestions(partialCommand) {
            if (!partialCommand || partialCommand.length < 1) {
                hideSuggestions();
                return;
            }

            const matchingCommands = availableCommands.filter(cmd => 
                cmd.name.toLowerCase().startsWith(partialCommand.toLowerCase())
            );

            if (matchingCommands.length === 0) {
                hideSuggestions();
                return;
            }

            suggestions.innerHTML = '';
            matchingCommands.slice(0, 5).forEach(cmd => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <span class="suggestion-name">${cmd.name}</span>
                    <span class="suggestion-help">${cmd.help}</span>
                `;
                item.addEventListener('click', () => {
                    input.value = cmd.name;
                    hideSuggestions();
                    input.focus();
                });
                suggestions.appendChild(item);
            });
            suggestions.style.display = 'block';
        }

        function hideSuggestions() {
            suggestions.style.display = 'none';
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
        
        // Initialize WebSocket connection for Python output
        async function initializeWebSocket() {
            try {
                // Check if Socket.IO is available
                if (typeof io !== 'undefined') {
                    // Connect to Socket.IO server
                    socket = io();
                    
                    socket.on('connect', () => {
                        console.log('Terminal: Connected to WebSocket for Python output');
                        
                        // Join terminal room for Python execution output
                        socket.emit('join_room', { room: 'terminal' });
                        console.log('Terminal: Joined terminal room');
                    });
                    
                    socket.on('disconnect', () => {
                        console.log('Terminal: Disconnected from WebSocket');
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
            } else if (type === 'error') {
                className = 'terminal-error';
            }
            
            // Append the output
            appendOutput(output, className);
            
            // Scroll to bottom
            output.scrollTop = output.scrollHeight;
        }
        
        async function executeCommand() {
            const command = input.value.trim();
            if (!command) return;
            
            appendOutput(`${currentVfsDirectory}$ ${command}`, 'terminal-success');
            addToHistory(command);
            input.value = '';
            hideSuggestions();
            
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
                        appendOutput('', 'terminal-success');
                        focusInput();
                        return;
                    }
                    
                    if (data.output) {
                        appendOutput(data.output);
                    } else if (data.error) {
                        appendOutput(`Error: ${data.error}`, 'terminal-error');
                    } else {
                        appendOutput('No output.', 'terminal-info');
                    }
                    
                    // If this is a background Python execution, track it
                    if (data.background && data.execution_id) {
                        activePythonExecutions.add(data.execution_id);
                        console.log(`Terminal: Started tracking Python execution: ${data.execution_id}`);
                    }
                    
                    // Update current directory if cd command was successful
                    if (command.startsWith('cd ') && !data.error) {
                        // Extract the new path from the output
                        const match = data.output.match(/Changed to directory: (.+)/);
                        if (match) {
                            currentVfsDirectory = match[1];
                        }
                    } else if (command === 'cd' && !data.error) {
                        // cd without args goes to root
                        currentVfsDirectory = '/';
                    }
                } else {
                    appendOutput(`Error: ${data.error}`, 'terminal-error');
                }
            } catch (error) {
                appendOutput(`Error: ${error.message}`, 'terminal-error');
            }
            
            appendOutput('', 'terminal-success');
            focusInput();
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
        
        // Event listeners
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                executeCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateHistory(-1);
                hideSuggestions();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateHistory(1);
                hideSuggestions();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (suggestions.style.display === 'block') {
                    // Select first suggestion
                    const firstSuggestion = suggestions.querySelector('.suggestion-item');
                    if (firstSuggestion) {
                        input.value = firstSuggestion.querySelector('.suggestion-name').textContent;
                        hideSuggestions();
                        input.focus();
                    }
                } else {
                    showHistory();
                }
            }
        });
        
        input.addEventListener('input', () => {
            hideHistory();
            const partialCommand = input.value.trim();
            showSuggestions(partialCommand);
        });
        
        // Add keyboard shortcuts for copy/paste
        input.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c') {
                    // Copy is handled by browser
                } else if (e.key === 'v') {
                    // Paste is handled by browser
                } else if (e.key === 'a') {
                    e.preventDefault();
                    input.select();
                }
            }
        });
        
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
                background: #2d2d2d;
                border: 1px solid #444;
                border-radius: 4px;
                padding: 4px 0;
                z-index: 10000;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            `;
            
            // Copy button
            const copyBtn = document.createElement('div');
            copyBtn.textContent = 'Copy';
            copyBtn.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                color: #ffffff;
                font-size: 14px;
            `;
            copyBtn.addEventListener('mouseenter', () => {
                copyBtn.style.backgroundColor = '#3d3d3d';
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
                padding: 8px 16px;
                cursor: pointer;
                color: #ffffff;
                font-size: 14px;
                border-top: 1px solid #444;
            `;
            selectAllBtn.addEventListener('mouseenter', () => {
                selectAllBtn.style.backgroundColor = '#3d3d3d';
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
            if (!e.target.closest('.input-container')) {
                hideHistory();
                hideSuggestions();
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
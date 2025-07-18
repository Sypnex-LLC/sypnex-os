// SypnexAPI Terminal - Terminal command execution
// This file extends the SypnexAPI class with terminal integration functionality

// Extend SypnexAPI with terminal methods
Object.assign(SypnexAPI.prototype, {
    
    /**
     * Execute a terminal command
     * @param {string} command - Command to execute
     * @returns {Promise<object>} - Command execution result
     */
    async executeTerminalCommand(command) {
        try {
            const response = await fetch('/api/terminal/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: command })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('SypnexAPI: Error executing terminal command:', error);
            return {
                error: `Command execution failed: ${error.message}`,
                success: false
            };
        }
    }
    
}); 
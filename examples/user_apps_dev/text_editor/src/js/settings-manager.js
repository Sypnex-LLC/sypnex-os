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
        
        console.log('Settings loaded:', textEditor.settings);
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

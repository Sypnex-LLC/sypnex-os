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

// Simple helper functions (keeping these for potential future use)
function getSimpleTextContent() {
    return textEditor.textarea.value;
}
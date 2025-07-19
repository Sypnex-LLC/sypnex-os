# Sypnex OS User App Development Guide

## 🚀 Quick Start

Create your first app in 3 simple steps:

### 1. Create App Structure
```
my_app/
├── src/
│   ├── index.html    # App content (NO DOCTYPE/head/body)
│   ├── style.css     # App-specific styles only
│   └── main.js       # App logic
└── my_app.app        # App metadata
```

### 2. Create Your .app File
```json
{
  "id": "my_app",
  "name": "My Application", 
  "description": "What my app does",
  "icon": "fas fa-star",
  "type": "user_app",
  "scripts": ["main.js"],
  "settings": [
    {
      "key": "MY_SETTING",
      "name": "My Setting",
      "type": "string", 
      "value": "default",
      "description": "Setting description"
    }
  ]
}
```

### 3. Write Your HTML (Content Only)
```html
<!-- NO DOCTYPE, head, body, or external links! -->
<div class="app-container">
  <div class="app-header">
    <h1>My App</h1>
  </div>
  <div class="app-content">
    <!-- Your app content -->
  </div>
</div>
```

### 4. Initialize Your JavaScript
```javascript
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyApp);
} else {
    // DOM is already loaded
    initMyApp();
}

function initMyApp() {
    // Check if SypnexAPI is available
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
        // Your app initialization
        console.log('App ID:', sypnexAPI.getAppId());
    } else {
        console.error('SypnexAPI not available');
    }
}

console.log('My App script loaded');
```

## ❌ Common Mistakes to Avoid

### HTML Structure
❌ **Don't do this:**
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
  <div class="app-container">
    <!-- content -->
  </div>
</body>
</html>
```

✅ **Do this:**
```html
<div class="app-container">
  <div class="app-header">
    <h1>My App</h1>
  </div>
  <div class="app-content">
    <!-- content -->
  </div>
</div>
```


### JavaScript Initialization
❌ **Don't do this:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    if (window.SypnexAPI) { // Wrong API reference
        // ...
    }
});
```

✅ **Do this:**
```javascript
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyApp);
} else {
    initMyApp();
}

function initMyApp() {
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) { // Correct API reference
        // ...
    }
}
```

### Settings UI
❌ **Don't do this:**
```javascript
// Building custom settings UI
const settingsModal = document.getElementById('settingsModal');
// ... custom settings form
```

✅ **Do this:**
```javascript
// OS handles settings UI automatically based on .app file
const settings = await sypnexAPI.getAllAppSettings();
const mySetting = await sypnexAPI.getAppSetting('MY_SETTING', 'default');
```

## Overview

This guide covers how to create user applications for Sypnex OS. User apps are sandboxed applications that run within the OS environment and have access to the SypnexAPI for system integration.

**Key Concepts:**
- Apps are **sandboxed** - they run in isolated environments
- Apps are **injected** into the OS - no standalone HTML pages
- Apps use **SypnexAPI** for system integration
- Apps follow **OS standards** for styling and behavior

## App Structure

A user app consists of the following structure:

```
my_app/
├── src/
│   ├── index.html    # Main app interface (content only)
│   ├── style.css     # App-specific styles only
│   ├── main.js       # App logic
│   └── [other files] # Additional resources
└── my_app.app        # App metadata
```

## App Metadata

The `.app` file contains metadata that describes your application:

```json
{
  "id": "my_app",
  "name": "My Application",
  "description": "A sample user application",
  "icon": "fas fa-star",
  "keywords": ["sample", "example", "demo"],
  "author": "Your Name",
  "version": "1.0.0",
  "type": "user_app",
  "scripts": [
    "main.js",
    "utils.js"
  ],
  "settings": [
    {
      "key": "API_ENDPOINT",
      "name": "API Endpoint",
      "type": "string",
      "value": "https://api.example.com",
      "description": "API endpoint URL"
    }
  ]
}
```

### Required Metadata Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **id** | ✅ | Unique identifier for your app | `"my_app"` |
| **name** | ✅ | Display name shown in app manager | `"My Application"` |
| **description** | ✅ | Brief description of what your app does | `"A sample user application"` |
| **icon** | ✅ | Font Awesome icon class | `"fas fa-star"` |
| **type** | ✅ | Must be "user_app" | `"user_app"` |
| **scripts** | ✅ | Array of JavaScript files to load (in order) | `["main.js"]` |
| **keywords** | ❌ | Array of searchable keywords | `["sample", "demo"]` |
| **author** | ❌ | Your name or organization | `"Your Name"` |
| **version** | ❌ | Semantic version string | `"1.0.0"` |
| **settings** | ❌ | Array of configurable settings | See settings section |

## HTML Structure

Your `index.html` should contain **only the app content** - no DOCTYPE, head, body, or external links.

**Note**: You must include the `<div class="app-container">` wrapper yourself. The OS does not automatically inject it.

### ✅ Correct HTML Structure
```html
<div class="app-container">
    <div class="app-header">
        <h2><i class="fas fa-star"></i> My App</h2>
        <p>Description of what your app does</p>
    </div>

    <div class="app-content">
        <!-- Your app content goes here -->
        <div id="app-content">
            Hello from my app!
        </div>
    </div>
</div>
```

### ❌ Wrong HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My App</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="app-container">
        <!-- content -->
    </div>
    <script src="main.js"></script>
</body>
</html>
```

## CSS Best Practices

### Sandboxing Model
Your app runs in a sandboxed environment. The OS provides:
- **Base styles** via CSS variables
- **Standard components** via app-standards.css
- **Isolated scope** to prevent conflicts

### Available OS CSS Variables
```css
/* Use these variables instead of hardcoding colors */
.my-app-element {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    color: var(--text-secondary);
    color: var(--accent-color);
}
```

### Naming Convention
**Only style your app-specific content. Don't recreate OS container styles:**

```css
/* ✅ Good - App-specific content only */
.my-app-widget { }
.my-app-button { }
.my-app-card { }
.my-app-status { }

/* ❌ Bad - Don't style OS containers */
.app-container { }
.app-header { }
.app-content { }
```

### Example CSS
```css
/* My App - App-specific content styles only */
.my-app-widget {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.my-app-button {
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    cursor: pointer;
}

.my-app-button:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
}

.my-app-status {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-top: 0.5rem;
}
```

## JavaScript Development

### Initialization Pattern
Use this pattern to ensure your app initializes correctly:

```javascript
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyApp);
} else {
    // DOM is already loaded
    initMyApp();
}

function initMyApp() {
    // Check if SypnexAPI is available
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
        console.log('App ID:', sypnexAPI.getAppId());
        console.log('Initialized:', sypnexAPI.isInitialized());
        
        // Your app initialization
        setupEventListeners();
        loadInitialData();
    } else {
        console.error('SypnexAPI not available');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: SypnexAPI not available</div>';
    }
}

// Clean up when app is closed
window.addEventListener('beforeunload', () => {
    // Cleanup code
});

console.log('My App script loaded');
```

### SypnexAPI Access

Your app has access to the SypnexAPI through the global `sypnexAPI` object (lowercase):

```javascript
// ✅ Correct API reference
const api = sypnexAPI;

// ❌ Wrong API reference
const api = window.SypnexAPI;

// Check if SypnexAPI is available
if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
    console.warn('SypnexAPI not available - running in standalone mode');
    return;
}

console.log('App ID:', sypnexAPI.getAppId());
console.log('Initialized:', sypnexAPI.isInitialized());
```

### ⚠️ Event Handling in Sandboxed Environment

**CRITICAL:** Apps run in a sandboxed environment where inline `onclick` handlers may not work reliably.

#### ❌ DON'T use inline onclick handlers:
```html
<!-- This may not work in the sandbox! -->
<button onclick="myFunction()">Click me</button>
<button onclick="appendNumber('5')">5</button>
```

#### ✅ DO use event listeners set up after DOM ready:
```html
<!-- Use data attributes instead -->
<button data-action="my-action" data-value="5">5</button>
<button data-action="calculate">Calculate</button>
```

```javascript
function initMyApp() {
    // ... other initialization code ...
    
    // Set up event listeners after DOM is ready
    setupEventListeners();
}

function setupEventListeners() {
    // Add click event listeners to all buttons
    const buttons = document.querySelectorAll('[data-action]');
    buttons.forEach(button => {
        button.addEventListener('click', handleButtonClick);
    });
}

function handleButtonClick(event) {
    const button = event.target;
    const action = button.getAttribute('data-action');
    const value = button.getAttribute('data-value');
    
    switch(action) {
        case 'my-action':
            myFunction(value);
            break;
        case 'calculate':
            calculate();
            break;
        // ... other actions
    }
}
```

#### Why This Matters:
- **Sandbox Security**: Inline handlers can't access functions in the app's scope
- **Function Scope**: Functions defined after DOM load may not be globally accessible
- **Reliability**: Event listeners are more reliable in isolated environments

#### Required .app Configuration:
Make sure your `.app` file includes the `scripts` array:
```json
{
  "id": "my_app",
  "scripts": ["main.js"],  // ⚠️ CRITICAL: Without this, JS won't load!
  "type": "user_app"
}
```

**Common Error:** Forgetting the `scripts` array results in "function not defined" errors.

### App Settings

The OS automatically handles settings UI based on your `.app` file. Access settings via API:

```javascript
// Get a setting with default value
const endpoint = await sypnexAPI.getAppSetting('API_ENDPOINT', 'https://default.com');

// Set a setting
await sypnexAPI.setAppSetting('API_ENDPOINT', 'https://new-endpoint.com');

// Get all settings
const allSettings = await sypnexAPI.getAllAppSettings();

// ❌ Don't build custom settings UI - the OS handles this automatically
```

### Virtual File System

Interact with the OS file system:

```javascript
// List directory contents
const files = await sypnexAPI.vfs.listDirectory('/apps');

// Read a file
const content = await sypnexAPI.vfs.readFile('/apps/my_app/config.json');

// Write a file
await sypnexAPI.vfs.writeFile('/apps/my_app/data.json', JSON.stringify(data));

// Create a directory
await sypnexAPI.vfs.createDirectory('/apps/my_app/cache');

// Delete a file or directory
await sypnexAPI.vfs.deletePath('/apps/my_app/temp.txt');
```

### WebSocket Communication

Connect to the real-time messaging system:

```javascript
// Connect to WebSocket
sypnexAPI.socket.connect();

// Subscribe to events
sypnexAPI.socket.on('workflow_update', (data) => {
    console.log('Workflow updated:', data);
});

// Send messages
sypnexAPI.socket.emit('app_event', { message: 'Hello from my app!' });

// Disconnect
sypnexAPI.socket.disconnect();
```

### Notifications

Show system notifications:

```javascript
// Show different types of notifications
sypnexAPI.showNotification('App loaded successfully!', 'success');
sypnexAPI.showNotification('Warning: Low memory', 'warning');
sypnexAPI.showNotification('Error occurred', 'error');
sypnexAPI.showNotification('Information message', 'info');
```

### External Libraries

Load external CSS and JavaScript libraries from CDNs:

```javascript
// Load CSS
await sypnexAPI.libraries.loadCSS('https://cdn.example.com/style.css');

// Load JavaScript
await sypnexAPI.libraries.loadJS('https://cdn.example.com/library.js');

// Load from CDN with version (e.g., Three.js, Chart.js, etc.)
await sypnexAPI.libraries.loadLibrary('three', '0.150.0');
await sypnexAPI.libraries.loadLibrary('chart', '3.9.1');
```

## Deployment

### Development Deployment
```bash
cd examples
python dev_deploy.py my_app
```

### Production Deployment
```bash
cd examples
python pack_app.py my_app
```

## Example: Complete App

Here's a complete example of a simple app:

### my_app.app
```json
{
  "id": "my_app",
  "name": "My Simple App",
  "description": "A simple example app",
  "icon": "fas fa-star",
  "type": "user_app",
  "scripts": ["main.js"],
  "settings": [
    {
      "key": "REFRESH_INTERVAL",
      "name": "Refresh Interval",
      "type": "number",
      "value": 5000,
      "description": "How often to refresh data (ms)"
    }
  ]
}
```

### src/index.html
```html
<div class="app-header">
    <h2><i class="fas fa-star"></i> My Simple App</h2>
    <p>This is a simple example app</p>
</div>

<div class="app-content">
    <div class="my-app-status">
        <h3>Status</h3>
        <div id="status" class="my-app-status-value">Loading...</div>
    </div>
    
    <div class="my-app-controls">
        <button id="refreshBtn" class="my-app-button">
            <i class="fas fa-sync-alt"></i> Refresh
        </button>
    </div>
</div>
```

### src/style.css
```css
/* My App - App-specific styles only */
.my-app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.my-app-content {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    padding: 1rem;
}

.my-app-status {
    margin-bottom: 1rem;
}

.my-app-status-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--accent-color);
}

.my-app-button {
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.my-app-button:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
}
```

### src/main.js
```javascript
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyApp);
} else {
    // DOM is already loaded
    initMyApp();
}

function initMyApp() {
    // Check if SypnexAPI is available
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
        console.log('App ID:', sypnexAPI.getAppId());
        
        // Set up event listeners
        setupEventListeners();
        
        // Load initial data
        refreshData();
        
        // Start auto-refresh
        startAutoRefresh();
        
    } else {
        console.error('SypnexAPI not available');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: SypnexAPI not available</div>';
    }
}

function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
}

async function refreshData() {
    try {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'Refreshing...';
        }
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (statusEl) {
            statusEl.textContent = 'Data refreshed at ' + new Date().toLocaleTimeString();
        }
        
        if (sypnexAPI && sypnexAPI.showNotification) {
            sypnexAPI.showNotification('Data refreshed successfully!', 'success');
        }
        
    } catch (error) {
        console.error('Failed to refresh data:', error);
        if (sypnexAPI && sypnexAPI.showNotification) {
            sypnexAPI.showNotification('Failed to refresh data', 'error');
        }
    }
}

function startAutoRefresh() {
    // Get refresh interval from settings
    if (sypnexAPI) {
        sypnexAPI.getAppSetting('REFRESH_INTERVAL', 5000).then(interval => {
            setInterval(refreshData, interval);
        });
    }
}

// Clean up when app is closed
window.addEventListener('beforeunload', () => {
    // Any cleanup code
});

console.log('My App script loaded');
```

## Troubleshooting

### ⚠️ "Function not defined" / "ReferenceError" Errors

**Most Common Issue:** JavaScript functions not accessible to HTML buttons.

**Symptoms:**
- Console shows: `Uncaught ReferenceError: myFunction is not defined`
- Buttons don't respond to clicks
- App loads but interactions don't work

**Solutions:**
1. **Check `.app` file has `scripts` array:**
   ```json
   {
     "id": "my_app", 
     "scripts": ["main.js"],  // ← Must include this!
     "type": "user_app"
   }
   ```

2. **Use event listeners instead of inline onclick:**
   ```html
   <!-- ❌ Don't use onclick (may not work in sandbox) -->
   <button onclick="myFunction()">Click</button>
   
   <!-- ✅ Use data attributes + event listeners -->
   <button data-action="my-action">Click</button>
   ```

3. **Set up event listeners in initApp():**
   ```javascript
   function initApp() {
       // Set up all event listeners here
       document.querySelectorAll('[data-action]').forEach(button => {
           button.addEventListener('click', handleButtonClick);
       });
   }
   ```

### App Not Loading
- Check browser console for errors
- Verify `.app` file has correct `id` and `type` fields
- Ensure scripts are listed in correct order in `scripts` array
- Deploy with: `python dev_deploy.py app_name`

### Styles Not Working
- Check that CSS classes are prefixed with app name
- Verify you're using OS CSS variables, not hardcoded values
- Ensure no conflicts with OS class names

### JavaScript Not Running
- Check that initialization pattern is correct
- Verify `sypnexAPI` is available (lowercase)
- Check browser console for errors
- Ensure functions are defined globally (not inside other functions)

### Settings Not Working
- Verify settings are defined correctly in `.app` file
- Use `sypnexAPI.getAppSetting()` and `sypnexAPI.setAppSetting()`
- Don't build custom settings UI - OS handles this automatically

### Quick Debugging Checklist
- [ ] `.app` file has `"scripts": ["your-script.js"]` array
- [ ] JavaScript functions are defined globally (not inside other functions)  
- [ ] Using event listeners instead of inline onclick handlers
- [ ] HTML has no DOCTYPE, html, head, or body tags
- [ ] Deployed with `python dev_deploy.py app_name` after changes
- [ ] Browser console shows no JavaScript errors

## 🤝 Community & Support

### Getting Help
- **Questions & Support**: [GitHub Discussions](https://github.com/Sypnex-LLC/sypnex-os/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/Sypnex-LLC/sypnex-os/issues)
- **App Development Help**: Use the `app-development` tag in discussions

### Sharing Your Apps
We encourage developers to share their applications with the community:
- Fork the repository and add your app to `examples/user_apps_dev/`
- Create a pull request with your app and documentation
- Share screenshots and demos in GitHub Discussions

### Contributing to the Development Guide
This guide is community-maintained! If you:
- Find errors or unclear sections
- Have suggestions for improvements
- Want to add new examples or tutorials

Please submit a pull request or create an issue. Your experience helps other developers!

## 📚 Additional Resources

- [Core Components Documentation](SYPNEX_OS_CORE_COMPONENTS.md)
- [Frontend Architecture Guide](SYPNEX_OS_FRONTEND_ARCHITECTURE.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Example Applications](examples/user_apps_dev/)

---

Happy app building!
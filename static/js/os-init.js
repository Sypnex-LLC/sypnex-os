// Sypnex OS - Main Initialization
// This file initializes the OS when the page loads

// Initialize the OS when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.sypnexOS = new SypnexOS();
    
    // Protect critical OS objects while allowing normal operation
    setTimeout(() => {
        if (window.sypnexOS) {
            // Prevent replacement of the main OS instance
            Object.defineProperty(window, 'sypnexOS', {
                writable: false,
                configurable: false
            });
            
            // Freeze the prototype to prevent method modification
            Object.freeze(SypnexOS.prototype);
            
            // Freeze individual critical methods (but not the whole object)
            if (window.sypnexOS.openApp) Object.freeze(window.sypnexOS.openApp);
            if (window.sypnexOS.closeApp) Object.freeze(window.sypnexOS.closeApp);
            if (window.sypnexOS.showNotification) Object.freeze(window.sypnexOS.showNotification);
            if (window.sypnexOS.reportAppError) Object.freeze(window.sypnexOS.reportAppError);
            
        }
    }, 100); // Small delay to ensure OS is fully initialized
}); 
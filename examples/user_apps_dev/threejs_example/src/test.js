// Test.js - This file will be loaded first to demonstrate sequential script loading
console.log('🧪 Test.js loaded first! This demonstrates the new multiple script loading feature.');

// Create a simple utility function that main script can use
function testUtility() {
    console.log('🔧 Test utility function called from test.js');
    return 'Hello from test.js utility!';
}

// Add a global flag to show this script loaded
window.testScriptLoaded = true;

// Script loaded successfully (no notification needed)

console.log('✅ Test.js initialization complete'); 
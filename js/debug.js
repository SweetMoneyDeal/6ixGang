// Debug settings
window.DEBUG = true;

// Debug logging function
function debugLog(...args) {
    if (window.DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// Debug error logging function
function debugError(...args) {
    if (window.DEBUG) {
        console.error('[DEBUG]', ...args);
    }
}

// Export debug functions
window.debugLog = debugLog;
window.debugError = debugError; 
// Event Manager for handling all game events
class EventManager {
    constructor() {
        this.listeners = new Map();
        this.cachedElements = new Map();
        this.cleanupFunctions = [];
    }

    // Cache DOM elements
    cacheElement(id) {
        if (!this.cachedElements.has(id)) {
            this.cachedElements.set(id, document.getElementById(id));
        }
        return this.cachedElements.get(id);
    }

    // Add event listener with cleanup
    addEventListener(element, event, handler) {
        if (!this.listeners.has(element)) {
            this.listeners.set(element, new Map());
        }
        element.addEventListener(event, handler);
        this.listeners.get(element).set(event, handler);
        
        // Add cleanup function
        this.cleanupFunctions.push(() => {
            element.removeEventListener(event, handler);
            this.listeners.get(element).delete(event);
        });
    }

    // Remove all event listeners
    removeAllListeners() {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.listeners.clear();
        this.cleanupFunctions = [];
    }

    // Clear cached elements
    clearCache() {
        this.cachedElements.clear();
    }

    // Clean up all resources
    cleanup() {
        this.removeAllListeners();
        this.clearCache();
    }
}

// Create global event manager instance
const eventManager = new EventManager();

// Export for use in other files
window.eventManager = eventManager; 
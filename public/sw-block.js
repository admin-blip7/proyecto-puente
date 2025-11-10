// Block problematic service workers from being registered
// This script prevents third-party service workers from causing issues

(function() {
  'use strict';
  
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return;
  }

  // Store original ServiceWorker registration
  const originalRegister = navigator.serviceWorker?.register;
  
  if (!originalRegister) {
    return;
  }

  // Override service worker registration to add safety checks
  navigator.serviceWorker.register = function(scriptURL, options) {
    // Block registration of problematic service workers
    const blockedPatterns = [
      /cnm-sw\.js/i,
      /sw\.js$/i,
      /service-worker\.js$/i
    ];
    
    const scriptPath = typeof scriptURL === 'string' ? scriptURL : scriptURL?.toString() || '';
    
    // Check if this service worker should be blocked
    const shouldBlock = blockedPatterns.some(pattern => pattern.test(scriptPath));
    
    if (shouldBlock) {
      console.warn('[SW Block] Blocked service worker registration:', scriptPath);
      return Promise.reject(new Error('Service worker registration blocked for security'));
    }
    
    // Allow other service workers with error handling
    return originalRegister.call(this, scriptURL, options).catch(error => {
      console.error('[SW Block] Service worker registration failed:', error);
      throw error;
    });
  };

  // Also prevent service workers from using problematic Response constructors
  if (typeof Response !== 'undefined') {
    const OriginalResponse = Response;
    
    window.Response = function(body, init) {
      // Check if status code doesn't allow body
      const status = init?.status || 200;
      const nullBodyStatuses = [101, 204, 205, 304];
      
      if (nullBodyStatuses.includes(status) && body !== null && body !== undefined) {
        console.warn('[SW Block] Preventing Response with null body status:', status);
        // Create response with null body for these status codes
        return new OriginalResponse(null, init);
      }
      
      return new OriginalResponse(body, init);
    };
    
    // Copy static methods
    Object.setPrototypeOf(window.Response, OriginalResponse);
    Object.setPrototypeOf(window.Response.prototype, OriginalResponse.prototype);
  }
})();

"use client"

import { useEffect } from 'react';

export default function ErrorSuppressionScript() {
  useEffect(() => {
    // Only run in development
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const originalError = console.error;
      
      console.error = (...args: any[]) => {
        try {
          // Convert arguments to string safely
          const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (arg && typeof arg === 'object' && arg.message) return arg.message;
            return String(arg || '');
          }).join(' ');

          // Suppress specific development errors
          const suppressPatterns = [
            'ERR_ABORTED',
            'net::ERR_',
            'Failed to fetch',
            'NetworkError',
            'AbortError',
            '@vite/client',
            'vite',
            'HMR'
          ];

          const shouldSuppress = suppressPatterns.some(pattern => message.includes(pattern));

          // Don't suppress critical errors
          const criticalPatterns = ['permission', 'PERMISSION_DENIED', 'unhandled'];
          const isCritical = criticalPatterns.some(pattern => 
            message.toLowerCase().includes(pattern)
          );

          if (shouldSuppress && !isCritical) {
            console.debug('[suppressed-dev]', message);
            return;
          }

          // Log other errors normally
          originalError.apply(console, args);
        } catch (e) {
          // Fallback to original console.error if anything fails
          originalError.apply(console, args);
        }
      };

      // Cleanup function
      return () => {
        try {
          console.error = originalError;
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    }
  }, []);

  return null; // This component doesn't render anything
}
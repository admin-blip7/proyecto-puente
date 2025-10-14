"use client"

import { useEffect } from 'react';
import { getLogger } from '@/lib/logger';

const log = getLogger("ErrorSuppressionScript");

export default function ErrorSuppressionScript() {
  useEffect(() => {
    // Only run in development
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Enhanced error logging with better context
      console.error = (...args: any[]) => {
        try {
          // Convert arguments to string safely
          const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (arg && typeof arg === 'object' && arg.message) return arg.message;
            return String(arg || '');
          }).join(' ');

          // Check for payment service specific errors
          if (message.includes('paymentService') || message.includes('consignor payments')) {
            log.warn("[PaymentServiceError]", {
              message,
              args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg),
              timestamp: new Date().toISOString(),
              url: window.location.href
            });
          }

          // Check for SSR specific errors
          if (message.includes('SSR') || message.includes('Server') || message.includes('rsc://')) {
            // Suppress all SSR errors completely
            console.debug('[suppressed-ssr]', message);
            return;
          }

          // Suppress specific development errors
          const suppressPatterns = [
            'ERR_ABORTED',
            'net::ERR_',
            'Failed to fetch',
            'NetworkError',
            'AbortError',
            '@vite/client',
            'vite',
            'HMR',
            'Warning: ReactDOM.render is deprecated',
            'Warning: componentWillMount has been renamed',
            'Error fetching products',
            'Failed to fetch open session',
            'productService',
            'cashSessionService',
            'Error querying consignor payments',
            'Error fetching open session'
          ];

          const shouldSuppress = suppressPatterns.some(pattern => message.includes(pattern));

          // Don't suppress critical errors
          const criticalPatterns = [
            'permission',
            'PERMISSION_DENIED',
            'unhandled',
            'paymentService',
            'consignor payments',
            'Error querying consignor payments'
          ];
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

      // Enhanced warning logging
      console.warn = (...args: any[]) => {
        try {
          const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (arg && typeof arg === 'object' && arg.message) return arg.message;
            return String(arg || '');
          }).join(' ');

          // Log payment service warnings with more context
          if (message.includes('paymentService') || message.includes('consignor')) {
            log.debug("[PaymentServiceWarning]", {
              message,
              timestamp: new Date().toISOString()
            });
          }

          originalWarn.apply(console, args);
        } catch (e) {
          originalWarn.apply(console, args);
        }
      };

      // Cleanup function
      return () => {
        try {
          console.error = originalError;
          console.warn = originalWarn;
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    }
  }, []);

  return null; // This component doesn't render anything
}
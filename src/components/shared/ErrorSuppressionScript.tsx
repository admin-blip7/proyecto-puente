"use client"

import { useEffect } from 'react';

export default function ErrorSuppressionScript() {
  useEffect(() => {
    const suppressEnabled = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SUPPRESS_DEV_ERRORS === 'true';
    if (suppressEnabled) {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        const message = args.join(' ');

        // Do NOT suppress critical or permission errors
        if (
          message.toLowerCase().includes('permission') ||
          message.includes('PERMISSION_DENIED') ||
          message.toLowerCase().includes('unhandled')
        ) {
          return originalError.apply(console, args);
        }

        // Suppress ERR_ABORTED and similar transient network errors in dev only
        if (
          message.includes('ERR_ABORTED') ||
          message.includes('net::ERR_') ||
          message.includes('Failed to fetch') ||
          message.includes('NetworkError') ||
          message.includes('AbortError')
        ) {
          // Log at debug level to keep trace without noise
          console.debug('[suppressed-dev]', message);
          return;
        }

        // Suppress Vite client/HMR noise only in dev
        if (
          message.includes('@vite/client') ||
          message.includes('vite') ||
          message.includes('HMR')
        ) {
          console.debug('[suppressed-dev]', message);
          return;
        }

        // Allow other errors to be logged
        originalError.apply(console, args);
      };

      // Cleanup function to restore original console.error
      return () => {
        console.error = originalError;
      };
    }
  }, []);

  return null; // This component doesn't render anything
}
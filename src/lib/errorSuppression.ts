// Error suppression utility for development
// This helps reduce console noise during development

let originalConsoleError: ((...data: any[]) => void) | null = null;

export const suppressConsoleErrors = () => {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SUPPRESS_DEV_ERRORS === 'true') {
    if (!originalConsoleError) originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');

      // Do NOT suppress critical or permission errors
      if (
        message.toLowerCase().includes('permission') ||
        message.includes('PERMISSION_DENIED') ||
        message.toLowerCase().includes('unhandled')
      ) {
        return originalConsoleError!.apply(console, args);
      }

      // Suppress ERR_ABORTED and similar transient network errors
      if (
        message.includes('ERR_ABORTED') ||
        message.includes('net::ERR_') ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('AbortError')
      ) {
        console.debug('[suppressed-dev]', message);
        return;
      }

      // Suppress Vite client errors
      if (
        message.includes('@vite/client') ||
        message.includes('vite') ||
        message.includes('HMR')
      ) {
        console.debug('[suppressed-dev]', message);
        return;
      }

      // Allow other errors to be logged
      originalConsoleError!.apply(console, args);
    };
  }
};

export const restoreConsoleErrors = () => {
  if (originalConsoleError) {
    console.error = originalConsoleError;
    originalConsoleError = null;
  }
};
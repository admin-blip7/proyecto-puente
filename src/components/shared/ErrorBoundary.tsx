"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getLogger } from '@/lib/logger';

const log = getLogger("ErrorBoundary");

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; errorInfo?: React.ErrorInfo; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error("ErrorBoundary caught an error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });

    this.setState({ error, errorInfo });
    
    // Llamar al callback de error personalizado si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent 
        error={this.state.error} 
        errorInfo={this.state.errorInfo} 
        reset={this.reset} 
      />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, errorInfo, reset }: { 
  error?: Error; 
  errorInfo?: React.ErrorInfo; 
  reset: () => void;
}) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <div className="flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      
      <h2 className="text-2xl font-semibold mb-2">Ha ocurrido un error inesperado</h2>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        Lo sentimos, algo salió mal al cargar esta sección. Nuestro equipo ha sido notificado del problema.
      </p>

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mb-6 text-left w-full max-w-2xl">
          <summary className="cursor-pointer text-sm font-mono bg-muted p-2 rounded mb-2">
            Detalles del error (solo desarrollo)
          </summary>
          <div className="bg-muted/50 p-4 rounded text-xs font-mono overflow-auto max-h-40">
            <div className="mb-2">
              <strong>Error:</strong> {error.message}
            </div>
            {error.stack && (
              <div className="mb-2">
                <strong>Stack:</strong>
                <pre className="whitespace-pre-wrap">{error.stack}</pre>
              </div>
            )}
            {errorInfo?.componentStack && (
              <div>
                <strong>Component Stack:</strong>
                <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="flex gap-3">
        <Button onClick={handleReset} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </Button>
        <Button onClick={handleReload}>
          Recargar página
        </Button>
      </div>
    </div>
  );
}

// Hook para manejar errores en componentes funcionales
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      log.error("useErrorHandler caught an error", {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }, [error]);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { setError, resetError };
}

export default ErrorBoundary;
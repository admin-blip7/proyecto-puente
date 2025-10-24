'use client';

import { useEffect, useState } from 'react';

/**
 * Componente para manejar errores de Fast Refresh y mejorar la estabilidad
 * en desarrollo con Turbopack
 */
export function FastRefreshErrorHandler({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    // Manejar errores de Fast Refresh
    const handleReactDevOverlayError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('react-server-dom-turbopack')) {
        console.warn('🚨 Fast Refresh error detected:', event.error.message);
        setHasError(true);
        setErrorCount(prev => prev + 1);
        
        // Intentar recuperar después de un tiempo
        setTimeout(() => {
          setHasError(false);
        }, 2000);
      }
    };

    // Escuchar errores de red que puedan afectar Fast Refresh
    const handleNetworkError = (event: ErrorEvent) => {
      if (event.message?.includes('Failed to load resource') || 
          event.message?.includes('500')) {
        console.warn('🌐 Network error in development:', event.message);
      }
    };

    window.addEventListener('error', handleReactDevOverlayError);
    window.addEventListener('error', handleNetworkError);

    return () => {
      window.removeEventListener('error', handleReactDevOverlayError);
      window.removeEventListener('error', handleNetworkError);
    };
  }, []);

  // Mostrar un mensaje de error amigable en desarrollo
  if (hasError && process.env.NODE_ENV === 'development') {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: '#ff6b6b',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
        border: '1px solid #ff5252'
      }}>
        ⚠️ Fast Refresh problem detected ({errorCount})
        <br />
        <small>Trying to recover...</small>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook para manejar errores de Fast Refresh de manera proactiva
 */
export function useFastRefreshHandler() {
  useEffect(() => {
    let refreshAttempts = 0;
    
    const handleBeforeUnload = () => {
      // Limpiar estado antes de recargar
      refreshAttempts = 0;
    };

    const handleStorageChange = (e: StorageEvent) => {
      // Detectar cambios en el almacenamiento que puedan indicar problemas de HMR
      if (e.key === 'react-devtools-log' && e.newValue?.includes('Fast Refresh')) {
        refreshAttempts++;
        
        if (refreshAttempts > 5) {
          console.warn('🔄 Too many Fast Refresh attempts, consider restarting dev server');
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
}
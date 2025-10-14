import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/lib/logger';

const log = getLogger("SSRErrorHandler");

// Interfaz para errores SSR
interface SSRErrorContext {
  url: string;
  userAgent?: string;
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  cookies?: string;
}

// Función para capturar errores SSR
export function captureSSRError(error: Error, context: Partial<SSRErrorContext> = {}) {
  const errorContext: SSRErrorContext = {
    url: context.url || 'unknown',
    userAgent: context.userAgent || 'unknown',
    timestamp: new Date().toISOString(),
    method: context.method || 'GET',
    headers: context.headers || {},
    cookies: context.cookies
  };

  log.error("SSR Error Captured", {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context: errorContext,
    ssrError: true
  });

  // En producción, podrías enviar esto a un servicio de monitoreo
  if (process.env.NODE_ENV === 'production') {
    // Ejemplo: enviar a Sentry, DataDog, etc.
    // Sentry.captureException(error, { extra: errorContext });
  }
}

// Función wrapper para componentes SSR
export function withSSRErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallbackValue: R,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const requestId = `ssr-${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      log.debug(`[SSR] Starting ${operationName}`, { requestId });
      
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      log.info(`[SSR] Completed ${operationName}`, {
        requestId,
        duration: `${duration}ms`,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      captureSSRError(errorObj, {
        url: typeof window !== 'undefined' ? window.location.href : 'SSR',
        method: 'GET',
        headers: {},
        timestamp: new Date().toISOString()
      });
      
      log.error(`[SSR] Failed ${operationName}`, {
        requestId,
        duration: `${duration}ms`,
        error: errorObj.message,
        fallback: fallbackValue !== null ? (typeof fallbackValue === 'object' ? `${fallbackValue.constructor.name}` : String(fallbackValue)) : 'null'
      });
      
      return fallbackValue;
    }
  };
}

// Función para verificar el estado de los servicios críticos
export async function checkSSRHealth() {
  const healthChecks = {
    supabase: false,
    paymentService: false,
    consignorService: false,
    financeService: false
  };

  try {
    // Verificar conexión a Supabase
    const { getSupabaseServerClient } = await import('@/lib/supabaseServerClient');
    const supabase = getSupabaseServerClient();
    
    const { error } = await supabase.from('_health_check').select('*').limit(1);
    healthChecks.supabase = !error;
  } catch (error) {
    log.error("Supabase health check failed", { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    // Verificar servicio de pagos
    const { getConsignorPayments } = await import('@/lib/services/paymentService');
    // Intentar con un ID de prueba que no debería existir
    await getConsignorPayments('00000000-0000-0000-0000-000000000000');
    healthChecks.paymentService = true;
  } catch (error) {
    // Es esperado que falle, pero verificamos que no sea un error crítico
    const errorMsg = error instanceof Error ? error.message : String(error);
    healthChecks.paymentService = !errorMsg.includes('Critical') && !errorMsg.includes('Initialization');
  }

  try {
    // Verificar otros servicios
    const { getConsignors } = await import('@/lib/services/consignorService');
    await getConsignors();
    healthChecks.consignorService = true;
  } catch (error) {
    log.error("Consignor service health check failed", { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    const { getExpenses } = await import('@/lib/services/financeService');
    await getExpenses();
    healthChecks.financeService = true;
  } catch (error) {
    log.error("Finance service health check failed", { error: error instanceof Error ? error.message : String(error) });
  }

  const overallHealth = Object.values(healthChecks).every(check => check);
  
  log.info("SSR Health check completed", {
    healthChecks,
    overallHealth,
    timestamp: new Date().toISOString()
  });

  return {
    healthy: overallHealth,
    checks: healthChecks,
    timestamp: new Date().toISOString()
  };
}

// Middleware para Next.js (si se necesita)
export function middleware(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `middleware-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Agregar headers de seguimiento
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-request-start', startTime.toString());

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Agregar headers de respuesta
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-response-time', `${Date.now() - startTime}ms`);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
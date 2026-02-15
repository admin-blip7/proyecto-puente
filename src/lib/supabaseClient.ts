import "@/lib/polyfill-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or anon key is missing in environment variables");
}

// Custom storage adapter to avoid localStorage errors on server
const customStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

const isServer = typeof window === 'undefined';

console.log('[SupabaseClient] Initializing. isServer:', isServer);

// Inicializar cliente de Supabase
let supabaseInstance: SupabaseClient<any, "public", any> | undefined;

// Configuración de reintentos para manejar errores de red temporalmente
const fetchWithTimeout = async (url: RequestInfo | URL, options?: RequestInit, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    // Silenciar errores de aborto que son normales al navegar
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[SupabaseClient] Request timeout - Supabase may be slow or unavailable');
    }
    throw error;
  }
};

// Track consecutive failures to disable auth temporarily
let consecutiveAuthFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
let authDisabled = false;

// Wrapper para fetch que deshabilita auth si hay muchas fallas
const smartFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const urlStr = typeof url === 'string' ? url : url.toString();

  // Si hay demasiadas fallas y es una petición de auth, retornar error inmediatamente
  if (authDisabled && urlStr.includes('/auth/v1/')) {
    console.warn('[SupabaseClient] Auth temporarily disabled due to repeated failures');
    throw new Error('Auth temporarily disabled');
  }

  try {
    const response = await fetchWithTimeout(url, options, 8000); // 8 segundos timeout

    // Reset counter on success
    if (urlStr.includes('/auth/v1/')) {
      consecutiveAuthFailures = 0;
      authDisabled = false;
    }

    return response;
  } catch (error) {
    // Increment counter on auth failures
    if (urlStr.includes('/auth/v1/')) {
      consecutiveAuthFailures++;
      if (consecutiveAuthFailures >= MAX_CONSECUTIVE_FAILURES) {
        authDisabled = true;
        console.error('[SupabaseClient] Too many auth failures, disabling auth refreshes temporarily');
        // Re-enable after 5 minutes
        setTimeout(() => {
          consecutiveAuthFailures = 0;
          authDisabled = false;
          console.log('[SupabaseClient] Auth re-enabled after cooldown period');
        }, 5 * 60 * 1000);
      }
    }
    throw error;
  }
};

try {
  supabaseInstance = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: !isServer,
        autoRefreshToken: !isServer,
        detectSessionInUrl: !isServer,
        storage: !isServer ? customStorage : {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        },
        // Reducir la frecuencia de refresco para evitar demasiadas peticiones fallidas
        refreshTokenThreshold: 300, // 5 minutos antes de expiración
      },
      global: {
        headers: {
          'X-Client-Info': 'storefront-swift/1.0.0'
        },
        fetch: smartFetch,
      },
      db: {
        schema: 'public'
      }
    })
    : undefined;
} catch (error) {
  console.error('[SupabaseClient] Error initializing client:', error);
  // Fallback to safe mode (no persistence)
  if (supabaseUrl && supabaseAnonKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          fetch: smartFetch,
        }
      });
      console.log('[SupabaseClient] Fallback to safe mode successful');
    } catch (e) {
      console.error('[SupabaseClient] Fallback failed:', e);
    }
  }
}

export const supabase = supabaseInstance;

// Si el cliente está disponible, configurar el refresco automático de tokens
// (solo en cliente, no en servidor)
if (supabase && typeof window !== 'undefined') {
  // Escuchar cambios de autenticación para mantener la sesión actualizada
  supabase.auth.onAuthStateChange((event, session) => {
    // La sesión ya se refresca automáticamente con autoRefreshToken: true
    console.log("Auth state changed:", event, session?.user?.email);
  });
}

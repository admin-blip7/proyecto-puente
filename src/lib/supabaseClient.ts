import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// CRITICAL FIX: Replace broken localStorage polyfill in Node.js
if (typeof window === 'undefined') {
  const globalAny = globalThis as any;

  try {
    // Check if localStorage is missing or invalid
    const isInvalid = !globalAny.localStorage || typeof globalAny.localStorage.getItem !== 'function';

    if (isInvalid) {
      console.log('[SupabaseClient] Installing memory-based localStorage polyfill for Node.js');

      const memoryStorage = new Map<string, string>();
      const polyfill = {
        getItem: (key: string) => memoryStorage.get(key) || null,
        setItem: (key: string, value: string) => memoryStorage.set(key, value),
        removeItem: (key: string) => memoryStorage.delete(key),
        clear: () => memoryStorage.clear(),
        get length() { return memoryStorage.size; },
        key: (index: number) => Array.from(memoryStorage.keys())[index] || null
      };

      // Try direct assignment first
      try {
        globalAny.localStorage = polyfill;
      } catch (e) {
        // If direct assignment fails (read-only property), try Object.defineProperty
        Object.defineProperty(globalAny, 'localStorage', {
          value: polyfill,
          writable: true,
          configurable: true
        });
      }
    }
  } catch (e) {
    console.warn('[SupabaseClient] Failed to polyfill localStorage:', e);
  }
}

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

try {
  supabaseInstance = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: !isServer,
        autoRefreshToken: !isServer,
        detectSessionInUrl: !isServer,
        storage: !isServer ? customStorage : undefined,
      },
      global: {
        headers: {
          'X-Client-Info': 'storefront-swift/1.0.0'
        }
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

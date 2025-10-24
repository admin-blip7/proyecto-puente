import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or anon key is missing in environment variables");
}

// Inicializar cliente de Supabase
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'storefront-swift/1.0.0'
        }
      }
    })
  : undefined;

// Si el cliente está disponible, configurar el refresco automático de tokens
// (solo en cliente, no en servidor)
if (supabase && typeof window !== 'undefined') {
  // Escuchar cambios de autenticación para mantener la sesión actualizada
  supabase.auth.onAuthStateChange((event, session) => {
    // La sesión ya se refresca automáticamente con autoRefreshToken: true
    console.log("Auth state changed:", event, session?.user?.email);
  });
}

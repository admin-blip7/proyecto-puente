import { createClient } from "@supabase/supabase-js";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const getSupabaseServerClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    // En desarrollo o build, es normal usar el cliente anónimo si no hay SERVICE_ROLE_KEY
    if (process.env.NODE_ENV === 'development') {
      console.log("🔧 Development mode: Using anon key for Supabase (SERVICE_ROLE_KEY not available)");
    } else {
      console.warn("⚠️ Supabase server credentials not configured, falling back to client client");
    }
    
    // Fallback to client client for development or when service role is not available
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error(
        "No Supabase credentials available. Please check your environment configuration."
      );
    }
    
    return createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

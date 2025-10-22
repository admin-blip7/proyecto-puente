import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    
    // Verificar la configuración de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log("Environment variables check:");
    console.log("SUPABASE_URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
    console.log("SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓ Set" : "✗ Missing");
    console.log("SUPABASE_SERVICE_KEY:", supabaseServiceKey ? "✓ Set" : "✗ Missing");

    // Intentar obtener usuarios (usando service role)
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch users",
        details: usersError.message,
        environment: {
          supabaseUrl: !!supabaseUrl,
          supabaseAnonKey: !!supabaseAnonKey,
          supabaseServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }

    // Verificar tabla de usuarios si existe
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .limit(5);

    return NextResponse.json({
      success: true,
      message: "Auth debug information",
      data: {
        totalUsers: users?.users?.length || 0,
        sampleUsers: users?.users?.slice(0, 3).map(user => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata
        })) || [],
        profilesTableExists: !profilesError,
        profilesCount: profiles?.length || 0,
        sampleProfiles: profiles?.slice(0, 3) || []
      },
      environment: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
        supabaseServiceKey: !!supabaseServiceKey
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Debug auth endpoint error:", error);
    return NextResponse.json({
      success: false,
      error: "Unexpected error in debug auth endpoint",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
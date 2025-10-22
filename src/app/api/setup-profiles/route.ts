import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    
    console.log("Setting up profiles table...");

    // Try to create profiles for existing users first
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch users for profile creation",
        details: usersError.message
      }, { status: 500 });
    }

    // Check if profiles table exists by trying to query it
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profilesError && profilesError.message.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: "Profiles table does not exist",
        details: "Please create the profiles table manually in Supabase using the SQL script provided",
        sqlScript: `
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Admin' CHECK (role IN ('Admin', 'Cajero')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to manage all profiles
CREATE POLICY "Service role can manage all profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');
        `
      }, { status: 400 });
    }

    // Create profiles for existing users
    const profilesData = users.users.map(user => ({
      id: user.id,
      name: user.user_metadata?.name || 
            user.user_metadata?.full_name || 
            user.email?.split('@')[0] || 
            'Usuario',
      email: user.email || '',
      role: user.user_metadata?.role || 'Admin'
    }));

    if (profilesData.length > 0) {
      const { error: insertError } = await supabase
        .from('profiles')
        .upsert(profilesData, { onConflict: 'id' });

      if (insertError) {
        console.error("Error creating profiles:", insertError);
        return NextResponse.json({
          success: false,
          error: "Failed to create user profiles",
          details: insertError.message
        }, { status: 500 });
      }
    }

    // Verify profiles were created
    const { data: profiles, error: finalProfilesError } = await supabase
      .from('profiles')
      .select('*');

    return NextResponse.json({
      success: true,
      message: "Profiles setup completed successfully",
      data: {
        totalUsers: users.users.length,
        profilesCreated: profiles?.length || 0,
        profiles: profiles || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Setup profiles endpoint error:", error);
    return NextResponse.json({
      success: false,
      error: "Unexpected error in setup profiles endpoint",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
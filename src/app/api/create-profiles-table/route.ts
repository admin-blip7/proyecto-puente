import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration'
      }, { status: 500 });
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check if profiles table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('Profiles table already exists');
    } else {
      // Table doesn't exist, we need to create it manually
      console.log('Profiles table does not exist, creating it...');
      
      // Since we can't execute raw SQL directly, we'll use a different approach
      // We'll try to insert a test record to see if the table exists
      const testProfile = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Test User',
        email: 'test@example.com',
        role: 'Admin'
      };

      const { error: insertError } = await supabase
        .from('profiles')
        .insert(testProfile);

      if (insertError && insertError.message.includes('relation "public.profiles" does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Profiles table does not exist and cannot be created automatically',
          details: 'Please create the profiles table manually in Supabase using the SQL script provided',
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

CREATE POLICY "Service role can manage all profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to handle user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Usuario'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Admin')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
          `
        }, { status: 500 });
      } else if (insertError) {
        console.error('Error testing profiles table:', insertError);
      } else {
        // Clean up test record
        await supabase
          .from('profiles')
          .delete()
          .eq('id', testProfile.id);
      }
    }

    // Get existing users and create profiles
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch users',
        details: usersError.message
      }, { status: 500 });
    }

    // Create profiles for existing users
    const profilesCreated = [];
    for (const user of users.users) {
      const profileData = {
        id: user.id,
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
        email: user.email || '',
        role: user.user_metadata?.role || 'Admin'
      };

      const { error: insertError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });

      if (insertError) {
        console.error('Error creating profile for user:', user.id, insertError);
      } else {
        profilesCreated.push(profileData);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Profiles table verified and profiles created successfully',
      profilesCreated: profilesCreated.length,
      users: users.users.length
    });

  } catch (error) {
    console.error('Error in create-profiles-table:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
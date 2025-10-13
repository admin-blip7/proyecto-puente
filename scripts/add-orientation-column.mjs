#!/usr/bin/env node

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function addOrientationColumn() {
  try {
    console.log("Adding 'orientation' column to settings table...");
    
    // SQL to add the orientation column
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE settings ADD COLUMN IF NOT EXISTS orientation TEXT;`
    });

    if (error) {
      console.log("RPC function not available, trying alternative approach...");
      
      // Alternative: Try using a direct SQL query through a stored procedure
      // First, let's check if the column already exists
      const { data: checkData, error: checkError } = await supabase
        .from('settings')
        .select('orientation')
        .limit(1);
        
      if (checkError) {
        if (checkError.message.includes("column \"orientation\" does not exist")) {
          console.log("Column 'orientation' does not exist. Need to add it manually through Supabase dashboard.");
          console.log("\nPlease follow these steps:");
          console.log("1. Go to your Supabase dashboard");
          console.log("2. Navigate to Table Editor");
          console.log("3. Select the 'settings' table");
          console.log("4. Click 'Add Column'");
          console.log("5. Set column name: 'orientation'");
          console.log("6. Set data type: 'text'");
          console.log("7. Leave nullable: true");
          console.log("8. Save the column");
          console.log("\nAlternatively, you can run this SQL in the SQL Editor:");
          console.log("ALTER TABLE settings ADD COLUMN orientation TEXT;");
        } else {
          console.error("Error checking orientation column:", checkError);
        }
      } else {
        console.log("Column 'orientation' already exists!");
      }
    } else {
      console.log("Successfully added 'orientation' column:", data);
    }
    
  } catch (error) {
    console.error("Error adding orientation column:", error);
  }
}

addOrientationColumn();
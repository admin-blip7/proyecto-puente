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

async function checkSettingsTable() {
  try {
    console.log("Checking settings table structure...");
    
    // Query to get table structure
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'settings'
    });

    if (error) {
      console.log("RPC function not available, trying direct query...");
      
      // Alternative: Try to get a sample row to see the structure
      const { data: sampleData, error: sampleError } = await supabase
        .from('settings')
        .select('*')
        .limit(1);
        
      if (sampleError) {
        console.error("Error querying settings table:", sampleError);
        return;
      }
      
      if (sampleData && sampleData.length > 0) {
        console.log("Sample row from settings table:");
        console.log(JSON.stringify(sampleData[0], null, 2));
        console.log("\nColumns found:", Object.keys(sampleData[0]));
      } else {
        console.log("No data found in settings table");
      }
    } else {
      console.log("Table structure:", data);
    }
    
  } catch (error) {
    console.error("Error checking settings table:", error);
  }
}

checkSettingsTable();
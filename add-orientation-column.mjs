import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addOrientationColumn() {
  try {
    console.log("🔧 Adding 'orientation' column to settings table...");

    const { error } = await supabase.rpc('add_orientation_column');

    if (error) {
      console.error("❌ Error adding column:", error);
      process.exit(1);
    }

    console.log("✅ Column 'orientation' added successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addOrientationColumn();
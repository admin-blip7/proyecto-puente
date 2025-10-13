#!/usr/bin/env node

import { config } from "dotenv";
import pkg from 'pg';
const { Client } = pkg;

// Load environment variables from .env.local
config({ path: ".env.local" });

// Parse the Supabase URL to get connection details
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script."
  );
  process.exit(1);
}

// Extract database connection info from Supabase URL
const url = new URL(SUPABASE_URL);
const projectRef = url.hostname.split('.')[0];

// Construct PostgreSQL connection string
const connectionString = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD}@db.${projectRef}.supabase.co:5432/postgres`;

console.log("Note: This script requires the SUPABASE_DB_PASSWORD environment variable.");
console.log("If you don't have it, you can find it in your Supabase dashboard under Settings > Database.");
console.log("");

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.log("SUPABASE_DB_PASSWORD not found. Please add it to your .env.local file:");
  console.log("SUPABASE_DB_PASSWORD=your_database_password");
  console.log("");
  console.log("Alternatively, you can run this SQL command directly in your Supabase SQL Editor:");
  console.log("ALTER TABLE settings ADD COLUMN IF NOT EXISTS orientation TEXT;");
  process.exit(1);
}

const client = new Client({
  connectionString,
});

async function migrateSettingsTable() {
  try {
    console.log("Connecting to Supabase database...");
    await client.connect();
    
    console.log("Adding 'orientation' column to settings table...");
    
    const result = await client.query(`
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS orientation TEXT;
    `);
    
    console.log("Successfully added 'orientation' column to settings table!");
    
    // Verify the column was added
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'settings' AND column_name = 'orientation';
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log("Verification successful - column details:", verifyResult.rows[0]);
    } else {
      console.log("Warning: Could not verify column was added");
    }
    
  } catch (error) {
    console.error("Error migrating settings table:", error.message);
    
    if (error.code === 'ENOTFOUND' || error.message.includes('connection')) {
      console.log("\nConnection failed. Please try running this SQL command directly in your Supabase SQL Editor:");
      console.log("ALTER TABLE settings ADD COLUMN IF NOT EXISTS orientation TEXT;");
    }
  } finally {
    await client.end();
  }
}

migrateSettingsTable();
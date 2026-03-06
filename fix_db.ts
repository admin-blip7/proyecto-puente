import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

async function run() {
  const cnString = process.env.DATABASE_URL;
  if (!cnString) {
    console.error("No DATABASE_URL found in env");
    return;
  }
  const connectionString = cnString.replace('?sslmode=require', '');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const sql = fs.readFileSync('supabase/migrations/20260221000004_remove_firestore_id_from_triggers.sql', 'utf8');
  await client.query(sql);
  console.log("Applied SQL successfully!");
  await client.end();
}
run();

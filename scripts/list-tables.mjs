#!/usr/bin/env node

import { config } from "dotenv";
import pkg from 'pg';
const { Client } = pkg;

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_DB_PASSWORD) {
    console.error("Missing credentials");
    process.exit(1);
}

const url = new URL(SUPABASE_URL);
const projectRef = url.hostname.split('.')[0];
const connectionString = `postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${projectRef}.supabase.co:5432/postgres`;

const client = new Client({ connectionString });

async function listTables() {
    try {
        await client.connect();

        // List all tables in public schema
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        console.log("Tables in public schema:");
        res.rows.forEach(row => console.log(`- ${row.table_name}`));

    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await client.end();
    }
}

listTables();

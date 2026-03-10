import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const cnString = process.env.DATABASE_URL;
  if (!cnString) return;
  const connectionString = cnString.replace('?sslmode=require', '');
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'public.branch_stock'::regclass;
  `);
  console.log(res.rows);
  await client.end();
}
run();

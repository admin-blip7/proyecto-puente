import { Client } from 'pg';
import * as dotenv from 'dotenv';
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
  const res = await client.query(`
    select pol.policyname, pol.cmd, pol.roles, pol.qual, pol.with_check
    from pg_policies pol
    where pol.tablename = 'branch_stock';
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run();

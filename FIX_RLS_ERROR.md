# Fix RLS Error in CRM Tables

## Problem
```
Error: new row violates row-level security policy for table "crm_clients"
```

The CRM tables have Row Level Security (RLS) enabled, which is blocking INSERT/UPDATE/DELETE operations.

## Solution

Follow **ONE** of these approaches:

### Option 1: Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the SQL below:

```sql
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view CRM clients" ON crm_clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert CRM clients" ON crm_clients;
DROP POLICY IF EXISTS "Allow authenticated users to update CRM clients" ON crm_clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete CRM clients" ON crm_clients;

DROP POLICY IF EXISTS "Allow authenticated users to view CRM interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert CRM interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Allow authenticated users to update CRM interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Allow authenticated users to delete CRM interactions" ON crm_interactions;

DROP POLICY IF EXISTS "Allow authenticated users to view CRM tags" ON crm_tags;
DROP POLICY IF EXISTS "Allow authenticated users to insert CRM tags" ON crm_tags;
DROP POLICY IF EXISTS "Allow authenticated users to update CRM tags" ON crm_tags;
DROP POLICY IF EXISTS "Allow authenticated users to delete CRM tags" ON crm_tags;

DROP POLICY IF EXISTS "Allow authenticated users to view CRM tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to insert CRM tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to update CRM tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Allow authenticated users to delete CRM tasks" ON crm_tasks;

DROP POLICY IF EXISTS "Allow authenticated users to view CRM documents" ON crm_documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert CRM documents" ON crm_documents;
DROP POLICY IF EXISTS "Allow authenticated users to update CRM documents" ON crm_documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete CRM documents" ON crm_documents;

-- Disable RLS on all CRM tables
ALTER TABLE crm_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents DISABLE ROW LEVEL SECURITY;

-- Verify the fix
SELECT table_name, rowsecurity FROM information_schema.tables 
WHERE table_name IN ('crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents')
ORDER BY table_name;
```

6. Click **Run** (Ctrl+Enter or Cmd+Enter)
7. You should see output showing RLS is now **false** for all tables

### Option 2: Using Supabase CLI

If you have Supabase CLI configured:

```bash
# Push the latest migrations (including RLS fix)
supabase migration up

# Or manually execute with psql
psql postgresql://<user>:<password>@<host>:5432/<database> -f supabase/migrations/20251024100000_fix_crm_rls_final.sql
```

### Option 3: Verify the Fix

After executing the SQL, run this verification query:

```sql
SELECT table_name, rowsecurity 
FROM information_schema.tables 
WHERE table_name IN ('crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents')
ORDER BY table_name;
```

Expected output:
```
table_name         | rowsecurity
-------------------|------------
crm_clients        | f
crm_documents      | f
crm_interactions   | f
crm_tags           | f
crm_tasks          | f
```

(All should be `f` = false)

## After Fix

1. Refresh your browser (Ctrl+R or Cmd+R)
2. Try creating a new CRM client again
3. The error should be gone and clients should save successfully

## Still Having Issues?

If the error persists after executing the SQL:

1. Check your browser's Network tab (F12 → Network)
2. Look for requests to `crm_clients` that return 403 status
3. Verify in Supabase Dashboard that RLS is indeed disabled:
   - Go to **Authentication** → **Policies**
   - Check that each CRM table shows "0 policies"

## Alternative: Re-enable RLS with Proper Policies

If you want RLS enabled with working policies instead of disabling it:

```sql
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
ON crm_clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable write for authenticated users"
ON crm_clients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON crm_clients FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users"
ON crm_clients FOR DELETE
TO authenticated
USING (true);
```

Do the same for other CRM tables.

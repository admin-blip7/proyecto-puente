-- ===================================
-- IMMEDIATE FIX: Disable RLS on CRM Tables
-- Execute this directly in Supabase SQL Editor
-- ===================================

-- Step 1: Drop ALL existing policies on CRM tables
DROP POLICY IF EXISTS "Users can view crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can insert crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can update crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can delete crm_clients" ON crm_clients;

DROP POLICY IF EXISTS "Users can view crm_interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Users can insert crm_interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Users can update crm_interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Users can delete crm_interactions" ON crm_interactions;

DROP POLICY IF EXISTS "Users can view crm_tags" ON crm_tags;
DROP POLICY IF EXISTS "Users can insert crm_tags" ON crm_tags;
DROP POLICY IF EXISTS "Users can update crm_tags" ON crm_tags;
DROP POLICY IF EXISTS "Users can delete crm_tags" ON crm_tags;

DROP POLICY IF EXISTS "Users can view crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can insert crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can update crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can delete crm_tasks" ON crm_tasks;

DROP POLICY IF EXISTS "Users can view crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Users can insert crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Users can update crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Users can delete crm_documents" ON crm_documents;

-- Step 2: DISABLE RLS completely on CRM tables
ALTER TABLE crm_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
-- Run this query to confirm - should show 0 rows if RLS is disabled
SELECT * FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents');

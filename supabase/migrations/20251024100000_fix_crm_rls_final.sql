-- ===================================
-- Final RLS Fix for CRM Tables
-- Disable RLS and remove all policies
-- ===================================

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

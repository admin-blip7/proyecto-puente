-- ===================================
-- Clean Old RLS Policies
-- Removes conflicting policies from previous migrations
-- ===================================

-- Drop all old policies from crm_clients
DROP POLICY IF EXISTS "Users can view crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can create crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can update crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can delete crm_clients" ON crm_clients;

-- Drop all old policies from crm_interactions
DROP POLICY IF EXISTS "Users can view crm_interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Users can create crm_interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Users can update crm_interactions" ON crm_interactions;
DROP POLICY IF EXISTS "Users can delete crm_interactions" ON crm_interactions;

-- Drop all old policies from crm_tags
DROP POLICY IF EXISTS "Users can view crm_tags" ON crm_tags;
DROP POLICY IF EXISTS "Users can create crm_tags" ON crm_tags;
DROP POLICY IF EXISTS "Users can update crm_tags" ON crm_tags;
DROP POLICY IF EXISTS "Users can delete crm_tags" ON crm_tags;

-- Drop all old policies from crm_tasks
DROP POLICY IF EXISTS "Users can view crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can create crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can update crm_tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Users can delete crm_tasks" ON crm_tasks;

-- Drop all old policies from crm_documents
DROP POLICY IF EXISTS "Users can view crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Users can create crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Users can update crm_documents" ON crm_documents;
DROP POLICY IF EXISTS "Users can delete crm_documents" ON crm_documents;

-- Disable RLS on all CRM tables
ALTER TABLE crm_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents DISABLE ROW LEVEL SECURITY;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_crm_clients_created_by ON crm_clients(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_documents_uploaded_by ON crm_documents(uploaded_by);

-- Verify changes (view in Supabase Dashboard)
-- All CRM tables should now have RLS disabled and old policies removed

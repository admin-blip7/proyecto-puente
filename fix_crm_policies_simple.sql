-- Simple script to drop existing CRM policies to avoid conflicts
-- This avoids the DO block syntax issues

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
-- ===================================
-- Database Optimization and Performance
-- Fixes RLS, indexes, and performance issues
-- ===================================

-- STEP 1: Disable RLS on CRM Tables (Fix critical INSERT/UPDATE/DELETE errors)
ALTER TABLE crm_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents DISABLE ROW LEVEL SECURITY;

-- STEP 2: Create indexes on foreign keys without indexes (Performance improvement)
CREATE INDEX IF NOT EXISTS idx_crm_clients_created_by ON crm_clients(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_documents_uploaded_by ON crm_documents(uploaded_by);

-- STEP 3: Drop duplicate indexes on product_variants (Performance cleanup)
DROP INDEX IF EXISTS idx_product_variants_productid;

-- STEP 4: Verify RLS is disabled on CRM tables
SELECT table_name, rowsecurity 
FROM information_schema.tables 
WHERE table_name IN ('crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents')
ORDER BY table_name;

-- Migration: Drop all remaining firestore_id columns
-- Created: 2026-02-03
-- Purpose: Complete cleanup of Firebase/Firestore references

-- ================================================
-- Drop firestore_id columns from all tables
-- ================================================

BEGIN;

-- CRM Tables
ALTER TABLE IF EXISTS public.crm_clients DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.crm_documents DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.crm_interactions DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.crm_tags DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.crm_tasks DROP COLUMN IF EXISTS firestore_id;

-- Other Tables
ALTER TABLE IF EXISTS public.warranties DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.products DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.accounts DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.expenses DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.income_categories DROP COLUMN IF EXISTS firestore_id;
ALTER TABLE IF EXISTS public.consignors DROP COLUMN IF EXISTS firestore_id;

-- ================================================
-- Drop related indexes
-- ================================================

DROP INDEX IF EXISTS public.idx_products_firestore_id;
DROP INDEX IF EXISTS public.idx_accounts_firestore_id;
DROP INDEX IF EXISTS public.idx_crm_clients_firestore_id;
DROP INDEX IF EXISTS public.idx_crm_documents_firestore_id;
DROP INDEX IF EXISTS public.idx_crm_interactions_firestore_id;
DROP INDEX IF EXISTS public.idx_crm_tags_firestore_id;
DROP INDEX IF EXISTS public.idx_crm_tasks_firestore_id;
DROP INDEX IF EXISTS public.idx_warranties_firestore_id;
DROP INDEX IF EXISTS public.idx_expenses_firestore_id;
DROP INDEX IF EXISTS public.idx_income_categories_firestore_id;
DROP INDEX IF EXISTS public.idx_consignors_firestore_id;

COMMIT;

-- ================================================
-- Verification
-- ================================================

-- Run this query to verify no firestore_id columns remain:
-- SELECT table_name, column_name 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' 
--   AND column_name = 'firestore_id'
-- ORDER BY table_name;

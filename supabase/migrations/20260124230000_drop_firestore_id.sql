-- Migration to drop firestore_id columns
-- Drop firestore_id column from multiple tables
DO $$ 
DECLARE 
    tables TEXT[] := ARRAY[
        'product_variants', 'purchase_orders', 'inventory_logs', 'consignors', 
        'repair_orders', 'credit_accounts', 'clients', 'settings_backup', 
        'expense_categories', 'suppliers', 'inventory', 'products', 'accounts', 
        'consignor_payments', 'fixed_assets', 'consignor_transactions', 
        'crm_clients', 'crm_tags', 'crm_documents', 'crm_interactions', 
        'crm_tasks', 'warranties_new', 'sales', 'debts', 'expenses', 
        'cash_sessions', 'income_categories', 'incomes', 'transfers'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        BEGIN
            EXECUTE 'ALTER TABLE ' || quote_ident(tbl) || ' DROP COLUMN IF EXISTS firestore_id';
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Table % does not exist, skipping', tbl;
            WHEN OTHERS THEN
                RAISE NOTICE 'Error dropping column from %: %', tbl, SQLERRM;
        END;
    END LOOP;
END $$;

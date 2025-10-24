-- Check warranties table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'warranties' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check sales table structure  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check crm_clients table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_clients' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check crm_interactions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'crm_interactions' AND table_schema = 'public'
ORDER BY ordinal_position;

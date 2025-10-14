-- Queries para verificar que las correcciones se aplicaron correctamente
-- Ejecutar después de que el script fix-database-schema.sql termine

-- 1. Verificar que las tablas existen
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Verificar estructura de la tabla accounts
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'accounts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar estructura de la tabla settings
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'settings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar que los productos tienen IDs válidos
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN id IS NOT NULL AND id != '' THEN 1 END) as products_with_id,
    COUNT(CASE WHEN id IS NULL OR id = '' THEN 1 END) as products_without_id
FROM products;

-- 5. Verificar configuraciones por defecto en settings
SELECT id, jsonb_object_keys(data) as keys_count, last_updated 
FROM settings 
WHERE id IN ('ticket_design', 'label_design_product');

-- 6. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Verificar índices creados
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 8. Verificar que no haya productos duplicados o inválidos
SELECT COUNT(*) as invalid_products 
FROM products 
WHERE id IS NULL OR id = '' OR name IS NULL OR name = '';

-- 9. Verificar tablas de consignors y repair_orders
SELECT 
    'consignors' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as with_id
FROM consignors
UNION ALL
SELECT 
    'repair_orders' as table_name, 
    COUNT(*) as record_count,
    COUNT(CASE WHEN id IS NOT NULL THEN 1 END) as with_id
FROM repair_orders;
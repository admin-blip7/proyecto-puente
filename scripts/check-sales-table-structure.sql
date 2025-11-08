-- Verificar la estructura de la tabla sales
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales' AND table_schema = 'public'
ORDER BY ordinal_position;

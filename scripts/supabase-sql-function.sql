-- Función para ejecutar SQL dinámico en Supabase
-- Ejecutar primero esta función para luego poder ejecutar el script de corrección

CREATE OR REPLACE FUNCTION exec_sql(sql_string TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    EXECUTE sql_string;
    RETURN 'SQL executed successfully';
EXCEPTION WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;
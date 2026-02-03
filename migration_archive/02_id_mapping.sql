-- Tabla de mapeo para la migración
-- Permite reconciliar IDs de Firestore con los nuevos UUIDs de Postgres

CREATE TABLE IF NOT EXISTS public.migration_mappings (
    collection_name text NOT NULL,
    firestore_id text NOT NULL,
    postgres_id uuid NOT NULL,
    migrated_at timestamptz DEFAULT now(),
    PRIMARY KEY (collection_name, firestore_id)
);

CREATE INDEX IF NOT EXISTS idx_migration_firestore_id ON public.migration_mappings(firestore_id);
CREATE INDEX IF NOT EXISTS idx_migration_postgres_id ON public.migration_mappings(postgres_id);

-- Ejemplo de función para obtener o generar UUID mapeado
CREATE OR REPLACE FUNCTION public.get_or_create_mapping(col_name text, f_id text)
RETURNS uuid AS $$
DECLARE
    p_id uuid;
BEGIN
    SELECT postgres_id INTO p_id FROM migration_mappings 
    WHERE collection_name = col_name AND firestore_id = f_id;
    
    IF p_id IS NULL THEN
        p_id := gen_random_uuid();
        INSERT INTO migration_mappings (collection_name, firestore_id, postgres_id)
        VALUES (col_name, f_id, p_id);
    END IF;
    
    RETURN p_id;
END;
$$ LANGUAGE plpgsql;

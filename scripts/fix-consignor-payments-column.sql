-- Script para verificar y corregir el esquema de consignor_payments
-- Verificar columnas existentes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'consignor_payments' 
ORDER BY ordinal_position;

-- Si la columna consignorId no existe, la creamos
-- (Esto solo se ejecutará si la columna no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'consignor_payments' 
        AND column_name = 'consignorId'
    ) THEN
        -- Si no existe consignorId, verificar si existe consignor_id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'consignor_payments' 
            AND column_name = 'consignor_id'
        ) THEN
            -- Renombrar consignor_id a consignorId
            ALTER TABLE public.consignor_payments 
            RENAME COLUMN consignor_id TO consignorId;
            
            -- Actualizar el índice si existe
            DROP INDEX IF EXISTS idx_consignor_payments_consignor_id;
            CREATE INDEX IF NOT EXISTS idx_consignor_payments_consignor_id 
            ON public.consignor_payments(consignorId);
        ELSE
            -- Crear la columna consignorId si no existe ninguna variante
            ALTER TABLE public.consignor_payments 
            ADD COLUMN consignorId UUID REFERENCES public.consignors(id) ON DELETE CASCADE;
            
            CREATE INDEX IF NOT EXISTS idx_consignor_payments_consignor_id 
            ON public.consignor_payments(consignorId);
        END IF;
    END IF;
END $$;

-- Verificar el resultado final
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'consignor_payments' 
ORDER BY ordinal_position;
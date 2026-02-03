-- Script para verificar y corregir la tabla accounts
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar si la tabla accounts existe
DO $check_table$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts' AND table_schema = 'public') THEN
        -- Crear la tabla si no existe
        CREATE TABLE public.accounts (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            firestore_id TEXT UNIQUE,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'Banco',
            current_balance DECIMAL(15,2) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Tabla accounts creada exitosamente';
    ELSE
        RAISE NOTICE 'La tabla accounts ya existe';
    END IF;
END $check_table$;

-- 2. Verificar y agregar la columna firestore_id si no existe
DO $add_firestore_id$
BEGIN
    -- Verificar si la columna firestore_id existe en la tabla accounts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND table_schema = 'public'
        AND column_name = 'firestore_id'
    ) THEN
        -- Agregar la columna firestore_id
        ALTER TABLE public.accounts ADD COLUMN firestore_id TEXT UNIQUE;
        RAISE NOTICE 'Columna firestore_id agregada a la tabla accounts';

        -- Crear un índice para mejorar el rendimiento
        CREATE INDEX IF NOT EXISTS idx_accounts_firestore_id ON public.accounts(firestore_id);
    ELSE
        RAISE NOTICE 'La columna firestore_id ya existe en la tabla accounts';
    END IF;
END $add_firestore_id$;

-- 3. Verificar y agregar la columna current_balance si no existe
DO $add_balance$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'accounts'
        AND table_schema = 'public'
        AND column_name = 'current_balance'
    ) THEN
        ALTER TABLE public.accounts ADD COLUMN current_balance DECIMAL(15,2) DEFAULT 0;
        RAISE NOTICE 'Columna current_balance agregada a la tabla accounts';
    ELSE
        RAISE NOTICE 'La columna current_balance ya existe en la tabla accounts';
    END IF;
END $add_balance$;

-- 4. Verificar estructura actual de la tabla
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'accounts'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Contar registros existentes
SELECT COUNT(*) as total_accounts FROM public.accounts;

-- 6. Mostrar algunos datos de ejemplo (si existen)
SELECT * FROM public.accounts LIMIT 3;
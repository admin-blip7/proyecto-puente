-- Agregar columna firestore_id a la tabla accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS firestore_id TEXT UNIQUE;

-- Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_accounts_firestore_id ON public.accounts(firestore_id);
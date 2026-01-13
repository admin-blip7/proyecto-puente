-- Ensure products.id is unique so foreign keys can reference it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_id_unique'
          AND conrelid = 'public.products'::regclass
    ) THEN
        ALTER TABLE public.products
        ADD CONSTRAINT products_id_unique UNIQUE (id);
    END IF;
END $$;

-- Create kardex table for detailed inventory movements
CREATE TABLE IF NOT EXISTS public.kardex (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO', 'SALIDA')),
    concepto VARCHAR(100) NOT NULL,
    cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
    stock_anterior NUMERIC NOT NULL,
    stock_nuevo NUMERIC NOT NULL CHECK (stock_nuevo >= 0),
    precio_unitario NUMERIC,
    valor_total NUMERIC,
    referencia VARCHAR(100),
    usuario_id UUID REFERENCES auth.users(id),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kardex_producto ON public.kardex(producto_id);
CREATE INDEX IF NOT EXISTS idx_kardex_fecha ON public.kardex(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kardex_tipo ON public.kardex(tipo);

-- View for current stock by product (latest movement)
CREATE OR REPLACE VIEW public.stock_actual AS
SELECT DISTINCT ON (producto_id)
    producto_id,
    stock_nuevo AS stock_actual,
    created_at AS ultima_actualizacion
FROM public.kardex
ORDER BY producto_id, created_at DESC;

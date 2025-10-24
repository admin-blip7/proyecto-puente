-- Create compatibilidades table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.compatibilidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    producto_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    modelo TEXT NOT NULL,
    marca TEXT,
    tipo TEXT,
    nivel_compatibilidad TEXT DEFAULT 'No compatible',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add nivel_compatibilidad column if it doesn't exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'compatibilidades'
        AND table_schema = 'public'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'compatibilidades'
            AND column_name = 'nivel_compatibilidad'
        ) THEN
            ALTER TABLE public.compatibilidades
            ADD COLUMN nivel_compatibilidad TEXT DEFAULT 'No compatible';
        END IF;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_compatibilidades_producto_id ON public.compatibilidades(producto_id);
CREATE INDEX IF NOT EXISTS idx_compatibilidades_modelo ON public.compatibilidades(modelo);
CREATE INDEX IF NOT EXISTS idx_compatibilidades_nivel ON public.compatibilidades(nivel_compatibilidad);

-- Enable RLS
ALTER TABLE public.compatibilidades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.compatibilidades FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.compatibilidades FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.compatibilidades FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.compatibilidades FOR DELETE USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_compatibilidades_updated_at
    BEFORE UPDATE ON public.compatibilidades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
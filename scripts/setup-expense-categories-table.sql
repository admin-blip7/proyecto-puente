-- Create expense_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expense_categories_firestore_id ON public.expense_categories(firestore_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON public.expense_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON public.expense_categories(name);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'expense_categories'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.expense_categories FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'expense_categories'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.expense_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'expense_categories'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.expense_categories FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'expense_categories'
          AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.expense_categories FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_expense_categories_updated_at'
    ) THEN
        CREATE TRIGGER update_expense_categories_updated_at
            BEFORE UPDATE ON public.expense_categories
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert default categories if table is empty
INSERT INTO public.expense_categories (firestore_id, name, is_active)
SELECT 
    gen_random_uuid()::text,
    category,
    true
FROM (VALUES 
    ('Retiro de Caja'),
    ('Servicios (Luz, Agua, Internet)'),
    ('Renta'),
    ('Sueldos y Salarios'),
    ('Transporte y Combustible'),
    ('Material de Oficina'),
    ('Mantenimiento'),
    ('Publicidad'),
    ('Otros Gastos')
) AS categories(category)
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories);

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'expense_categories'
ORDER BY ordinal_position;

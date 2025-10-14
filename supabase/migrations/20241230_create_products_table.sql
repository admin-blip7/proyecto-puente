-- Create products table with category and attributes support
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE,
    name TEXT NOT NULL,
    sku TEXT,
    price DECIMAL(15,2) DEFAULT 0,
    cost DECIMAL(15,2) DEFAULT 0,
    stock DECIMAL(15,2) DEFAULT 0,
    type TEXT DEFAULT 'Venta' CHECK (type IN ('Venta', 'Refacción')),
    ownership_type TEXT DEFAULT 'Propio' CHECK (ownership_type IN ('Propio', 'Consigna', 'Familiar')),
    consignor_id TEXT,
    reorder_point DECIMAL(15,2) DEFAULT 0,
    combo_product_ids TEXT[] DEFAULT '{}',
    compatibility_tags TEXT[] DEFAULT '{}',
    search_keywords TEXT[] DEFAULT '{}',
    category TEXT,
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_firestore_id ON products(firestore_id);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.products FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.products FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.products FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;
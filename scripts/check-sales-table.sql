-- Check if sales table exists and create it if it doesn't
-- This script ensures the sales table has the correct structure for the API

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE,
    saleId TEXT NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]',
    total DECIMAL(15,2) DEFAULT 0,
    totalAmount DECIMAL(15,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'Efectivo',
    paymentMethod TEXT DEFAULT 'Efectivo',
    cashier_id TEXT,
    cashierId TEXT,
    cashier_name TEXT,
    cashierName TEXT,
    customer_name TEXT,
    customerName TEXT,
    customer_phone TEXT,
    customerPhone TEXT,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    cash_session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_firestore_id ON public.sales(firestore_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_cash_session_id ON public.sales(cash_session_id);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'sales'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.sales FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'sales'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.sales FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'sales'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.sales FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'sales'
          AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.sales FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;
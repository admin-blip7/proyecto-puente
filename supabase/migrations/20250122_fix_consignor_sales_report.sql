-- Fix for consignor sales report API
-- This migration ensures all required tables and columns exist

-- Create or update function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Fix consignors table
DO $$
BEGIN
    -- Check if consignors table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consignors' AND table_schema = 'public') THEN
        CREATE TABLE public.consignors (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            firestore_id TEXT UNIQUE,
            name TEXT NOT NULL,
            contact_info TEXT,
            balance_due DECIMAL(15,2) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.consignors ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Enable read access for all users" ON public.consignors FOR SELECT USING (true);
        CREATE POLICY "Enable insert for authenticated users" ON public.consignors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY "Enable update for authenticated users" ON public.consignors FOR UPDATE USING (auth.role() = 'authenticated');
        CREATE POLICY "Enable delete for authenticated users" ON public.consignors FOR DELETE USING (auth.role() = 'authenticated');
        
        RAISE NOTICE 'Created consignors table';
    END IF;
    
    -- Add firestore_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consignors'
        AND column_name = 'firestore_id'
    ) THEN
        ALTER TABLE public.consignors ADD COLUMN firestore_id TEXT UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_consignors_firestore_id ON public.consignors(firestore_id);
        
        -- Update existing consignors to have firestore_id if they don't
        UPDATE public.consignors
        SET firestore_id = gen_random_uuid()::text
        WHERE firestore_id IS NULL;
        
        RAISE NOTICE 'Added firestore_id column to consignors table';
    END IF;
    
    -- Add contact_info column if it doesn't exist (for backwards compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consignors'
        AND column_name = 'contact_info'
    ) THEN
        ALTER TABLE public.consignors ADD COLUMN contact_info TEXT;
        RAISE NOTICE 'Added contact_info column to consignors table';
    END IF;
END $$;

-- Fix sales table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales' AND table_schema = 'public') THEN
        CREATE TABLE public.sales (
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
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_sales_firestore_id ON public.sales(firestore_id);
        CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
        CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON public.sales(payment_method);
        CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales(client_id);
        CREATE INDEX IF NOT EXISTS idx_sales_cash_session_id ON public.sales(cash_session_id);
        
        -- Enable RLS
        ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Enable read access for all users" ON public.sales FOR SELECT USING (true);
        CREATE POLICY "Enable insert for authenticated users" ON public.sales FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY "Enable update for authenticated users" ON public.sales FOR UPDATE USING (auth.role() = 'authenticated');
        CREATE POLICY "Enable delete for authenticated users" ON public.sales FOR DELETE USING (auth.role() = 'authenticated');
        
        RAISE NOTICE 'Created sales table';
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales'
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.sales ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_sales_client_id ON public.sales(client_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sales'
        AND column_name = 'cash_session_id'
    ) THEN
        ALTER TABLE public.sales ADD COLUMN cash_session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_sales_cash_session_id ON public.sales(cash_session_id);
    END IF;
END $$;

-- Fix clients table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        CREATE TABLE public.clients (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            firestore_id TEXT UNIQUE,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_clients_firestore_id ON public.clients(firestore_id);
        CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
        CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
        
        -- Enable RLS
        ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Enable read access for all users" ON public.clients FOR SELECT USING (true);
        CREATE POLICY "Enable insert for authenticated users" ON public.clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY "Enable update for authenticated users" ON public.clients FOR UPDATE USING (auth.role() = 'authenticated');
        CREATE POLICY "Enable delete for authenticated users" ON public.clients FOR DELETE USING (auth.role() = 'authenticated');
        
        RAISE NOTICE 'Created clients table';
    END IF;
END $$;

-- Fix cash_sessions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_sessions' AND table_schema = 'public') THEN
        CREATE TABLE public.cash_sessions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            firestore_id TEXT UNIQUE,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            opening_amount DECIMAL(15,2) DEFAULT 0,
            closing_amount DECIMAL(15,2) DEFAULT 0,
            expected_amount DECIMAL(15,2) DEFAULT 0,
            difference DECIMAL(15,2) DEFAULT 0,
            status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
            notes TEXT,
            opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            closed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_firestore_id ON public.cash_sessions(firestore_id);
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_user_id ON public.cash_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.cash_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_at ON public.cash_sessions(opened_at);
        
        -- Enable RLS
        ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Enable read access for all users" ON public.cash_sessions FOR SELECT USING (true);
        CREATE POLICY "Enable insert for authenticated users" ON public.cash_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
        CREATE POLICY "Enable update for authenticated users" ON public.cash_sessions FOR UPDATE USING (auth.role() = 'authenticated');
        CREATE POLICY "Enable delete for authenticated users" ON public.cash_sessions FOR DELETE USING (auth.role() = 'authenticated');
        
        RAISE NOTICE 'Created cash_sessions table';
    END IF;
END $$;

-- Create triggers for updated_at
DO $$
BEGIN
    -- Consignors trigger
    DROP TRIGGER IF EXISTS update_consignors_updated_at ON public.consignors;
    CREATE TRIGGER update_consignors_updated_at
        BEFORE UPDATE ON public.consignors
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Sales trigger
    DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
    CREATE TRIGGER update_sales_updated_at
        BEFORE UPDATE ON public.sales
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Clients trigger
    DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
    CREATE TRIGGER update_clients_updated_at
        BEFORE UPDATE ON public.clients
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    -- Cash sessions trigger
    DROP TRIGGER IF EXISTS update_cash_sessions_updated_at ON public.cash_sessions;
    CREATE TRIGGER update_cash_sessions_updated_at
        BEFORE UPDATE ON public.cash_sessions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END $$;

-- Create RPC function to get consignor sales with product details
-- This function must be created after all tables exist
CREATE OR REPLACE FUNCTION get_consignor_sales(consignor_id_param TEXT)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    total DECIMAL,
    payment_method TEXT,
    items JSONB,
    total_quantity INTEGER,
    client_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.created_at,
        COALESCE(s.total, s.totalAmount, 0) as total,
        COALESCE(s.payment_method, s.paymentMethod, 'Efectivo') as payment_method,
        COALESCE(s.items, '[]'::jsonb) as items,
        -- Calculate total quantity from items
        (
            SELECT COALESCE(SUM((item->>'quantity')::integer), 0)
            FROM jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) as item
        ) as total_quantity,
        -- Get client name
        COALESCE(c.name, s.customer_name, s.customerName, 'Cliente General') as client_name
    FROM public.sales s
    LEFT JOIN public.clients c ON s.client_id = c.id
    WHERE
        -- For now, return all sales since we don't have consignor_id in items yet
        -- TODO: Filter by consignor_id when items structure includes it
        TRUE
    ORDER BY s.created_at DESC;
END;
$$;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION get_consignor_sales TO authenticated;
GRANT EXECUTE ON FUNCTION get_consignor_sales TO anon;
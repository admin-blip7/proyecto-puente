-- Script para corregir el esquema de la base de datos
-- Puede ejecutarse desde el editor SQL de Supabase o mediante scripts/execute-database-fix.js

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Verificar y crear tabla accounts si no existe
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'Banco',
    current_balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Verificar y crear tabla settings si no existe
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Verificar si la tabla products tiene las columnas necesarias
DO $$
BEGIN
    -- Verificar y agregar columnas faltantes a products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'id') THEN
        ALTER TABLE products ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'created_at') THEN
        ALTER TABLE products ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'last_updated') THEN
        ALTER TABLE products ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Agregar columna ownership_type si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'ownership_type') THEN
        ALTER TABLE products ADD COLUMN ownership_type TEXT DEFAULT 'Propio';
    END IF;
    
    -- Corregir productos sin ID
    UPDATE products SET id = gen_random_uuid() WHERE id IS NULL OR id = '';
END $$;

-- 4. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- 5. Verificar y crear tabla consignors si no existe
CREATE TABLE IF NOT EXISTS public.consignors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_info TEXT,
    balance_due DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Verificar y crear tabla repair_orders si no existe
CREATE TABLE IF NOT EXISTS public.repair_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    device_brand TEXT,
    device_model TEXT,
    device_serial_imei TEXT,
    reported_issue TEXT,
    status TEXT DEFAULT 'Pendiente',
    total_price DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Insertar datos de configuración por defecto si no existen
INSERT INTO public.settings (id, data) VALUES 
('ticket_design', '{
    "header": {
        "showLogo": true,
        "logoUrl": "",
        "show": {
            "storeName": true,
            "address": true,
            "phone": true,
            "rfc": false,
            "website": false
        },
        "storeName": "Nombre de tu Tienda",
        "address": "Dirección de tu Tienda",
        "phone": "123-456-7890",
        "rfc": "",
        "website": ""
    },
    "body": {
        "showQuantity": true,
        "showUnitPrice": false,
        "showTotal": true,
        "fontSize": "sm"
    },
    "footer": {
        "showSubtotal": true,
        "showTaxes": true,
        "showDiscounts": true,
        "thankYouMessage": "¡Gracias por tu compra!",
        "additionalInfo": "Políticas de devolución: 30 días con ticket.",
        "showQrCode": false,
        "qrCodeUrl": ""
    }
}') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (id, data) VALUES 
('label_design_product', '{
    "width": 51,
    "height": 102,
    "orientation": "vertical",
    "fontSize": 9,
    "barcodeHeight": 30,
    "includeLogo": false,
    "logoUrl": "",
    "storeName": "Nombre de tu Tienda",
    "content": {
        "showProductName": true,
        "showSku": true,
        "showPrice": true,
        "showStoreName": false
    }
}') ON CONFLICT (id) DO NOTHING;

-- 8. Limpiar productos duplicados o inválidos
DELETE FROM products WHERE id IS NULL OR id = '' OR name IS NULL OR name = '';

-- 9. Verificar y crear RLS (Row Level Security) policies
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'accounts'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.accounts FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'accounts'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.accounts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'accounts'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.accounts FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'accounts'
          AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.accounts FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'settings'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.settings FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'settings'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'settings'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.settings FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'settings'
          AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.settings FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'consignors'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.consignors FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'consignors'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.consignors FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'consignors'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.consignors FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'consignors'
          AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.consignors FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'repair_orders'
          AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON public.repair_orders FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'repair_orders'
          AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.repair_orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'repair_orders'
          AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.repair_orders FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'repair_orders'
          AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.repair_orders FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

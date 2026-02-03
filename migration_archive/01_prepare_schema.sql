-- Migración para preparar el esquema limpio en Supabase
-- Sigue las mejores prácticas: snake_case, timestamptz, uuids

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Ventas (Normalizada)
CREATE TABLE IF NOT EXISTS public.sales_new (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id text UNIQUE,
    sale_number text,
    total_amount numeric NOT NULL DEFAULT 0,
    payment_method text,
    cashier_id text,
    cashier_name text,
    customer_name text,
    customer_phone text,
    customer_email text,
    session_id uuid, -- Referencia a cash_sessions
    status text DEFAULT 'completed',
    amount_paid numeric DEFAULT 0,
    change_given numeric DEFAULT 0,
    discount_code text,
    discount_amount numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    cancelled_at timestamptz,
    cancel_reason text
);

-- 3. Tabla de Items de Venta (Desnormalizada desde el array de Firestore)
CREATE TABLE IF NOT EXISTS public.sale_items_new (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id uuid REFERENCES public.sales_new(id) ON DELETE CASCADE,
    product_id uuid, -- FK a products
    product_name text,
    quantity integer NOT NULL DEFAULT 1,
    price_at_sale numeric NOT NULL DEFAULT 0,
    consignor_id uuid, -- FK a consignors
    metadata jsonb -- Para seriales u otros datos variables
);

-- 4. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_firestore_id ON public.sales_new(firestore_id);
CREATE INDEX IF NOT EXISTS idx_sales_session_id ON public.sales_new(session_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items_new(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items_new(product_id);

-- 5. Tabla de Sesiones de Caja (Limpia)
CREATE TABLE IF NOT EXISTS public.cash_sessions_new (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id text UNIQUE,
    status text DEFAULT 'Abierto',
    opened_by uuid,
    opened_by_name text,
    opened_at timestamptz DEFAULT now(),
    closed_by uuid,
    closed_by_name text,
    closed_at timestamptz,
    starting_float numeric NOT NULL DEFAULT 0,
    total_cash_sales numeric DEFAULT 0,
    total_card_sales numeric DEFAULT 0,
    total_cash_payouts numeric DEFAULT 0,
    expected_cash_in_drawer numeric DEFAULT 0,
    actual_cash_count numeric,
    difference numeric,
    is_balanced boolean,
    bags_data jsonb, -- Agrupación de bags_start, sales, end
    cash_left_for_next_session numeric DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Historial de Inventario (Limpio)
CREATE TABLE IF NOT EXISTS public.inventory_logs_new (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id text UNIQUE,
    product_id uuid,
    product_name text,
    change integer NOT NULL,
    reason text,
    updated_by uuid,
    created_at timestamptz DEFAULT now(),
    metadata jsonb -- Referencias a sale_id, repair_id, etc.
);

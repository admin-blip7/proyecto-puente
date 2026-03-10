-- ============================================================================
-- Sistema de Dropshipping para Mayoreo
-- Creado: 2026-02-17
-- Descripción: Tablas para gestionar pedidos dropshipping con proveedores
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla de proveedores de dropshipping
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wholesale_suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    lead_time_default TEXT DEFAULT '3-5 días hábiles',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentario de tabla
COMMENT ON TABLE public.wholesale_suppliers IS 'Proveedores de dropshipping para pedidos mayoreo';

-- ----------------------------------------------------------------------------
-- Tabla de catálogo de productos dropshipping
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wholesale_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.wholesale_suppliers(id) ON DELETE CASCADE,

    -- Datos del proveedor
    supplier_sku TEXT,
    supplier_cost NUMERIC CHECK (supplier_cost >= 0),

    -- Configuración de precios
    wholesale_price NUMERIC CHECK (wholesale_price >= 0),
    wholesale_min_qty INTEGER DEFAULT 5 CHECK (wholesale_min_qty >= 1),

    -- Estado
    is_active BOOLEAN DEFAULT true,
    lead_time TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT wholesale_products_unique UNIQUE(product_id, supplier_id)
);

-- Comentario de tabla
COMMENT ON TABLE public.wholesale_products IS 'Configuración de productos dropshipping por proveedor';

-- ----------------------------------------------------------------------------
-- Tabla de pedidos de dropshipping
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wholesale_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,

    -- Información del cliente final
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    shipping_address JSONB NOT NULL,

    -- Información del proveedor
    supplier_id UUID REFERENCES public.wholesale_suppliers(id),

    -- Relación con venta original
    sale_id TEXT,

    -- Items del pedido
    items JSONB NOT NULL,

    -- Montos
    subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
    supplier_cost NUMERIC CHECK (supplier_cost >= 0),
    profit NUMERIC,

    -- Estado del pedido
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Pedido recibido, sin enviar a proveedor
        'sent_to_supplier',  -- Enviado a proveedor
        'confirmed',         -- Proveedor confirmó pedido
        'shipped',           -- Enviado a cliente
        'delivered',         -- Entregado al cliente
        'cancelled'          -- Pedido cancelado
    )),

    -- Información de tracking
    supplier_order_number TEXT,
    tracking_number TEXT,
    tracking_url TEXT,

    -- Fechas importantes
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_to_supplier_at TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- Notas
    notes TEXT,
    internal_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentario de tabla
COMMENT ON TABLE public.wholesale_orders IS 'Pedidos de dropshipping enviados a proveedores';

-- ----------------------------------------------------------------------------
-- Índices para optimización
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wholesale_suppliers_active ON public.wholesale_suppliers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_wholesale_products_product ON public.wholesale_products(product_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_products_supplier ON public.wholesale_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_products_active ON public.wholesale_products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_status ON public.wholesale_orders(status);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_supplier ON public.wholesale_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_sale_id ON public.wholesale_orders(sale_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_orders_order_date ON public.wholesale_orders(order_date DESC);

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ----------------------------------------------------------------------------

-- Habilitar RLS
ALTER TABLE public.wholesale_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_orders ENABLE ROW LEVEL SECURITY;

-- Políticas para wholesale_suppliers
DROP POLICY IF EXISTS "wholesale_suppliers_select_all" ON public.wholesale_suppliers;
CREATE POLICY "wholesale_suppliers_select_all" ON public.wholesale_suppliers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "wholesale_suppliers_insert_auth" ON public.wholesale_suppliers;
CREATE POLICY "wholesale_suppliers_insert_auth" ON public.wholesale_suppliers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wholesale_suppliers_update_auth" ON public.wholesale_suppliers;
CREATE POLICY "wholesale_suppliers_update_auth" ON public.wholesale_suppliers
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wholesale_suppliers_delete_auth" ON public.wholesale_suppliers;
CREATE POLICY "wholesale_suppliers_delete_auth" ON public.wholesale_suppliers
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para wholesale_products
DROP POLICY IF EXISTS "wholesale_products_select_all" ON public.wholesale_products;
CREATE POLICY "wholesale_products_select_all" ON public.wholesale_products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "wholesale_products_insert_auth" ON public.wholesale_products;
CREATE POLICY "wholesale_products_insert_auth" ON public.wholesale_products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wholesale_products_update_auth" ON public.wholesale_products;
CREATE POLICY "wholesale_products_update_auth" ON public.wholesale_products
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wholesale_products_delete_auth" ON public.wholesale_products;
CREATE POLICY "wholesale_products_delete_auth" ON public.wholesale_products
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para wholesale_orders
DROP POLICY IF EXISTS "wholesale_orders_select_all" ON public.wholesale_orders;
CREATE POLICY "wholesale_orders_select_all" ON public.wholesale_orders
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "wholesale_orders_insert_auth" ON public.wholesale_orders;
CREATE POLICY "wholesale_orders_insert_auth" ON public.wholesale_orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wholesale_orders_update_auth" ON public.wholesale_orders;
CREATE POLICY "wholesale_orders_update_auth" ON public.wholesale_orders
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wholesale_orders_delete_auth" ON public.wholesale_orders;
CREATE POLICY "wholesale_orders_delete_auth" ON public.wholesale_orders
    FOR DELETE USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Función para generar número de orden
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_wholesale_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'WS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(4), 'base64'), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Trigger para updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_wholesale_suppliers_updated_at ON public.wholesale_suppliers;
CREATE TRIGGER update_wholesale_suppliers_updated_at
    BEFORE UPDATE ON public.wholesale_suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wholesale_products_updated_at ON public.wholesale_products;
CREATE TRIGGER update_wholesale_products_updated_at
    BEFORE UPDATE ON public.wholesale_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wholesale_orders_updated_at ON public.wholesale_orders;
CREATE TRIGGER update_wholesale_orders_updated_at
    BEFORE UPDATE ON public.wholesale_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Trigger para generar order_number automáticamente
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS generate_wholesale_order_number_trigger ON public.wholesale_orders;
CREATE TRIGGER generate_wholesale_order_number_trigger
    BEFORE INSERT ON public.wholesale_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_wholesale_order_number();

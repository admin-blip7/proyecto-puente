-- ============================================================================
-- Sistema Multi-Socio Multi-Sucursal con Comunidad de Stock
-- Creado: 2026-02-17
-- Descripción: Tablas para gestionar socios con múltiples sucursales,
--              stock por sucursal, transferencias y comunidad de stock
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla de Socios (Partners)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE,

    -- Información de contacto
    contact_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,

    -- Configuración de pagos
    commission_rate DECIMAL(5,4) DEFAULT 0.1500, -- 15% comisión para el socio
    payment_method TEXT DEFAULT 'transfer', -- transfer, cash, card
    payment_data JSONB DEFAULT '{}', -- CLABE, cuenta, etc.

    -- Configuración de comunidad
    community_enabled BOOLEAN DEFAULT false, -- ¿Comparte stock con comunidad?

    -- Configuración de stock
    allow_branch_transfers BOOLEAN DEFAULT true, -- ¿Puede transferir entre sucursales?
    allow_cross_branch_selling BOOLEAN DEFAULT true, -- ¿Puede vender desde otra sucursal?

    -- Límites
    max_monthly_sales DECIMAL(15,2) DEFAULT 10000,
    credit_limit DECIMAL(15,2) DEFAULT 0,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.partners IS 'Socios del sistema con múltiples sucursales';
COMMENT ON COLUMN public.partners.commission_rate IS 'Porción de cada venta que pertenece al socio (0.15 = 15%)';
COMMENT ON COLUMN public.partners.community_enabled IS 'Si el socio participa en la comunidad de stock con otros socios';

-- ----------------------------------------------------------------------------
-- 2. Tabla de Sucursales (Branches)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    code TEXT, -- Código corto (ej: PUE, ACA, MTY)

    -- Ubicación
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'México',

    -- Configuración
    is_main BOOLEAN DEFAULT false, -- Sucursal principal del socio
    is_active BOOLEAN DEFAULT true,

    -- Contacto de la sucursal
    manager_name TEXT,
    manager_phone TEXT,
    manager_email TEXT,

    -- Horarios
    business_hours JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT branches_unique_code_per_partner UNIQUE(partner_id, code)
);

COMMENT ON TABLE public.branches IS 'Sucursales de los socios';
COMMENT ON COLUMN public.branches.is_main IS 'Indica si es la sucursal principal del socio';

-- ----------------------------------------------------------------------------
-- 3. Tabla de Stock por Sucursal
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branch_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL, -- REFERENCES public.products(id) - NOTE: products.id is TEXT, not UUID

    -- Cantidades
    quantity DECIMAL(15,2) DEFAULT 0, -- Stock total en sucursal
    reserved DECIMAL(15,2) DEFAULT 0, -- Reservado (no vendible)
    available DECIMAL(15,2) GENERATED ALWAYS AS (quantity - reserved) STORED,

    -- Costos y precios específicos por sucursal
    cost_override DECIMAL(15,2), -- Costo específico de esta sucursal
    price_override DECIMAL(15,2), -- Precio específico de esta sucursal

    -- Ubicación en almacén
    location TEXT, -- Pasillo, estante, etc.

    -- Publicación en tienda online (requiere aprobación del Master)
    published_to_store BOOLEAN DEFAULT false, -- ¿El Master aprobó este stock para tienda online?
    store_approved_at TIMESTAMP WITH TIME ZONE, -- Cuándo fue aprobado
    store_approved_by UUID REFERENCES auth.users(id), -- Qué admin lo aprobó

    -- Fechas
    last_stock_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sale_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT branch_stock_unique UNIQUE(branch_id, product_id)
);

COMMENT ON TABLE public.branch_stock IS 'Stock de productos por sucursal';
COMMENT ON COLUMN public.branch_stock.published_to_store IS 'Indica si el Master ha aprobado este stock para mostrarse en la tienda online (/tienda)';
COMMENT ON COLUMN public.branch_stock.store_approved_by IS 'Usuario Admin que aprobó este stock para tienda online';

-- ----------------------------------------------------------------------------
-- 4. Tabla de Transferencias entre Sucursales
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branch_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_number TEXT UNIQUE NOT NULL,

    -- Relaciones
    partner_id UUID NOT NULL REFERENCES public.partners(id),
    from_branch_id UUID REFERENCES public.branches(id), -- NULL = entrada externa
    to_branch_id UUID NOT NULL REFERENCES public.branches(id), -- NULL = salida externa

    -- Items transferidos
    items JSONB NOT NULL, -- [{product_id, quantity, from_location, to_location}]

    -- Estado
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',     -- Solicitada
        'approved',    -- Aprobada
        'in_transit',  -- En camino
        'received',    -- Recibida
        'cancelled'    -- Cancelada
    )),

    -- Fechas
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,

    -- Referencias
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    received_by UUID REFERENCES auth.users(id),

    -- Notas
    notes TEXT,
    internal_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.branch_transfers IS 'Transferencias de stock entre sucursales';

-- ----------------------------------------------------------------------------
-- 5. Tabla de Configuración de Comunidad
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Socios participantes
    partners UUID[] DEFAULT '{}',

    -- Configuración
    allow_view BOOLEAN DEFAULT true, -- ¿Pueden ver stock?
    allow_reserve BOOLEAN DEFAULT false, -- ¿Pueden reservar?
    allow_sell BOOLEAN DEFAULT false, -- ¿Pueden vender stock de otros?

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.community_config IS 'Configuración de comunidades de socios';

-- ----------------------------------------------------------------------------
-- 6. Tabla de Sucursales Compartidas en Comunidad
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.branch_community_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    community_id UUID NOT NULL REFERENCES public.community_config(id) ON DELETE CASCADE,

    -- ¿Qué productos comparte?
    share_type TEXT DEFAULT 'all' CHECK (share_type IN ('all', 'selected', 'none')),

    -- Si es 'selected', lista de product_ids
    product_ids UUID[] DEFAULT '{}',

    -- Permisos
    allow_view BOOLEAN DEFAULT true,
    allow_reserve BOOLEAN DEFAULT false,
    allow_transfer BOOLEAN DEFAULT false,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT branch_community_unique UNIQUE(branch_id, community_id)
);

COMMENT ON TABLE public.branch_community_shares IS 'Sucursales que comparten stock en comunidad';

-- ----------------------------------------------------------------------------
-- Índices para optimización
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_partners_active ON public.partners(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_partners_email ON public.partners(email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_branches_partner ON public.branches(partner_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_branch_stock_branch ON public.branch_stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_product ON public.branch_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_branch_product ON public.branch_stock(branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_published ON public.branch_stock(published_to_store) WHERE published_to_store = true;

CREATE INDEX IF NOT EXISTS idx_branch_transfers_partner ON public.branch_transfers(partner_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_from_branch ON public.branch_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_to_branch ON public.branch_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_status ON public.branch_transfers(status);

CREATE INDEX IF NOT EXISTS idx_community_partners ON public.community_config(partners);
CREATE INDEX IF NOT EXISTS idx_community_active ON public.community_config(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_branch_community_branch ON public.branch_community_shares(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_community_community ON public.branch_community_shares(community_id);
CREATE INDEX IF NOT EXISTS idx_branch_community_active ON public.branch_community_shares(is_active) WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- Funciones Helper
-- ----------------------------------------------------------------------------

-- Obtener partner_id del usuario actual
CREATE OR REPLACE FUNCTION get_current_partner_id()
RETURNS UUID AS $$
BEGIN
    -- Si es Admin master, retorna NULL (ve todo)
    IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (user_metadata->>'role' = 'Admin' OR app_metadata->>'isAdmin' = 'true')
        AND user_metadata->>'partner_id' IS NULL
    ) THEN
        RETURN NULL;
    END IF;

    -- Si es socio, retorna su partner_id
    RETURN (
        SELECT user_metadata->>'partner_id'::UUID
        FROM auth.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE sql SECURITY DEFINER;

-- Obtener branch_id del usuario actual
CREATE OR REPLACE FUNCTION get_current_branch_id()
RETURNS UUID AS $$
BEGIN
    -- Si es Admin master, retorna NULL (ve todo)
    IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (user_metadata->>'role' = 'Admin' OR app_metadata->>'isAdmin' = 'true')
        AND user_metadata->>'partner_id' IS NULL
    ) THEN
        RETURN NULL;
    END IF;

    -- Si es socio con sucursal asignada, retorna esa
    RETURN (
        SELECT user_metadata->>'branch_id'::UUID
        FROM auth.users
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE sql SECURITY DEFINER;

-- Obtener stock disponible de un producto en una sucursal
CREATE OR REPLACE FUNCTION get_branch_stock(p_branch_id UUID, p_product_id UUID)
RETURNS DECIMAL AS $$
    SELECT COALESCE(available, 0)
    FROM public.branch_stock
    WHERE branch_id = p_branch_id AND product_id = p_product_id;
$$ LANGUAGE sql STABLE;

-- Obtener stock total de un producto en todas las sucursales de un socio
CREATE OR REPLACE FUNCTION get_partner_stock(p_partner_id UUID, p_product_id UUID)
RETURNS DECIMAL AS $$
    SELECT COALESCE(SUM(available), 0)
    FROM public.branch_stock bs
    JOIN public.branches b ON bs.branch_id = b.id
    WHERE b.partner_id = p_partner_id AND bs.product_id = p_product_id;
$$ LANGUAGE sql STABLE;

-- Verificar si un producto está compartido en comunidad
CREATE OR REPLACE FUNCTION is_product_shared_in_community(p_product_id UUID, p_community_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.branch_community_shares bcs
        JOIN public.branch_stock bs ON bcs.branch_id = bs.branch_id
        WHERE bcs.community_id = p_community_id
        AND bs.product_id = p_product_id
        AND bcs.is_active = true
        AND (
            bcs.share_type = 'all'
            OR (bcs.share_type = 'selected' AND p_product_id = ANY(bcs.product_ids))
        )
    );
$$ LANGUAGE sql STABLE;

-- Obtener stock disponible para tienda online (solo aprobados por Master)
CREATE OR REPLACE FUNCTION get_store_stock(p_product_id UUID)
RETURNS DECIMAL AS $$
    -- Stock de socios aprobado para tienda online
    DECLARE
        v_partner_stock DECIMAL;
    BEGIN
        SELECT COALESCE(SUM(bs.available), 0) INTO v_partner_stock
        FROM public.branch_stock bs
        WHERE bs.product_id = p_product_id
        AND bs.published_to_store = true  -- Solo aprobados por Master
        AND bs.available > 0;

        -- Agregar stock propio del Master (productos sin partner)
        RETURN v_partner_stock + COALESCE(
            (SELECT stock FROM public.products WHERE id = p_product_id), 0
        );
    END;
$$ LANGUAGE plpgsql STABLE;

-- Aprobar stock de socio para tienda online
CREATE OR REPLACE FUNCTION approve_store_stock(p_branch_id UUID, p_product_id UUID, p_admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.branch_stock
    SET published_to_store = true,
        store_approved_at = NOW(),
        store_approved_by = p_admin_id
    WHERE branch_id = p_branch_id AND product_id = p_product_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Desaprobar stock de socio para tienda online
CREATE OR REPLACE FUNCTION disapprove_store_stock(p_branch_id UUID, p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.branch_stock
    SET published_to_store = false,
        store_approved_at = NULL,
        store_approved_by = NULL
    WHERE branch_id = p_branch_id AND product_id = p_product_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generar número de transferencia
CREATE OR REPLACE FUNCTION generate_transfer_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'TRF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || upper(substring(encode(gen_random_bytes(3), 'base64'), 1, 4));
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

-- Trigger para generar transfer_number
DROP TRIGGER IF EXISTS generate_branch_transfer_number ON public.branch_transfers;
CREATE TRIGGER generate_branch_transfer_number
    BEFORE INSERT ON public.branch_transfers
    FOR EACH ROW
    WHEN (NEW.transfer_number IS NULL)
    EXECUTE FUNCTION generate_transfer_number();

-- Trigger para updated_at (asumiendo que la función ya existe)
DROP TRIGGER IF EXISTS update_branches_updated_at ON public.branches;
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branch_stock_updated_at ON public.branch_stock;
CREATE TRIGGER update_branch_stock_updated_at
    BEFORE UPDATE ON public.branch_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branch_transfers_updated_at ON public.branch_transfers;
CREATE TRIGGER update_branch_transfers_updated_at
    BEFORE UPDATE ON public.branch_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ----------------------------------------------------------------------------

-- Habilitar RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_community_shares ENABLE ROW LEVEL SECURITY;

-- Políticas para partners (todos pueden leer, solo authenticated modificar)
DROP POLICY IF EXISTS "partners_select_all" ON public.partners;
CREATE POLICY "partners_select_all" ON public.partners FOR SELECT USING (true);

DROP POLICY IF EXISTS "partners_insert_auth" ON public.partners;
CREATE POLICY "partners_insert_auth" ON public.partners FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "partners_update_auth" ON public.partners;
CREATE POLICY "partners_update_auth" ON public.partners FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "partners_delete_auth" ON public.partners;
CREATE POLICY "partners_delete_auth" ON public.partners FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para branches
DROP POLICY IF EXISTS "branches_select_all" ON public.branches;
CREATE POLICY "branches_select_all" ON public.branches FOR SELECT USING (true);

DROP POLICY IF EXISTS "branches_insert_auth" ON public.branches;
CREATE POLICY "branches_insert_auth" ON public.branches FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "branches_update_auth" ON public.branches;
CREATE POLICY "branches_update_auth" ON public.branches FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "branches_delete_auth" ON public.branches;
CREATE POLICY "branches_delete_auth" ON public.branches FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para branch_stock
DROP POLICY IF EXISTS "branch_stock_select_all" ON public.branch_stock;
CREATE POLICY "branch_stock_select_all" ON public.branch_stock FOR SELECT USING (true);

DROP POLICY IF EXISTS "branch_stock_insert_auth" ON public.branch_stock;
CREATE POLICY "branch_stock_insert_auth" ON public.branch_stock FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "branch_stock_update_auth" ON public.branch_stock;
CREATE POLICY "branch_stock_update_auth" ON public.branch_stock FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "branch_stock_delete_auth" ON public.branch_stock;
CREATE POLICY "branch_stock_delete_auth" ON public.branch_stock FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para branch_transfers
DROP POLICY IF EXISTS "branch_transfers_select_all" ON public.branch_transfers;
CREATE POLICY "branch_transfers_select_all" ON public.branch_transfers FOR SELECT USING (true);

DROP POLICY IF EXISTS "branch_transfers_insert_auth" ON public.branch_transfers;
CREATE POLICY "branch_transfers_insert_auth" ON public.branch_transfers FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "branch_transfers_update_auth" ON public.branch_transfers;
CREATE POLICY "branch_transfers_update_auth" ON public.branch_transfers FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "branch_transfers_delete_auth" ON public.branch_transfers;
CREATE POLICY "branch_transfers_delete_auth" ON public.branch_transfers FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para community_config
DROP POLICY IF EXISTS "community_config_select_all" ON public.community_config;
CREATE POLICY "community_config_select_all" ON public.community_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_config_insert_auth" ON public.community_config;
CREATE POLICY "community_config_insert_auth" ON public.community_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "community_config_update_auth" ON public.community_config;
CREATE POLICY "community_config_update_auth" ON public.community_config FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "community_config_delete_auth" ON public.community_config;
CREATE POLICY "community_config_delete_auth" ON public.community_config FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para branch_community_shares
DROP POLICY IF EXISTS "branch_community_shares_select_all" ON public.branch_community_shares;
CREATE POLICY "branch_community_shares_select_all" ON public.branch_community_shares FOR SELECT USING (true);

DROP POLICY IF EXISTS "branch_community_shares_insert_auth" ON public.branch_community_shares;
CREATE POLICY "branch_community_shares_insert_auth" ON public.branch_community_shares FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "branch_community_shares_update_auth" ON public.branch_community_shares;
CREATE POLICY "branch_community_shares_update_auth" ON public.branch_community_shares FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "branch_community_shares_delete_auth" ON public.branch_community_shares;
CREATE POLICY "branch_community_shares_delete_auth" ON public.branch_community_shares FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- SCRIPT MANUAL COMPLETO: Setup de Sistema Multi-Socio
-- Creado: 2026-02-18
-- Rama: feature/rama-supabase
--
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu dashboard de Supabase
--    (https://supabase.com/dashboard/project/aaftjwktzpnyjwklroww/sql/new)
-- 2. Copia y pega ESTE script completo
-- 3. Ejecuta el script
-- 4. Verifica el resultado en la sección "Results"
--
-- ESTE SCRIPT:
-- - Crea las tablas del sistema multi-socio (partners, branches, branch_stock)
-- - Crea la tabla profiles
-- - Configura RLS y políticas de seguridad
-- - Crea triggers para nuevos usuarios
-- - Sincroniza usuarios existentes de auth.users a profiles
-- ============================================================================

-- ============================================================================
-- PARTE 1: SISTEMA MULTI-SOCIO (Partners, Branches, Stock)
-- ============================================================================

-- Tabla de Socios (Partners)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT UNIQUE,
    contact_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    commission_rate DECIMAL(5,4) DEFAULT 0.1500,
    payment_method TEXT DEFAULT 'transfer',
    payment_data JSONB DEFAULT '{}',
    community_enabled BOOLEAN DEFAULT false,
    allow_branch_transfers BOOLEAN DEFAULT true,
    allow_cross_branch_selling BOOLEAN DEFAULT true,
    max_monthly_sales DECIMAL(15,2) DEFAULT 10000,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.partners IS 'Socios del sistema con múltiples sucursales';

-- Tabla de Sucursales (Branches)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'México',
    is_main BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    manager_name TEXT,
    manager_phone TEXT,
    manager_email TEXT,
    business_hours JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT branches_unique_code_per_partner UNIQUE(partner_id, code)
);

COMMENT ON TABLE public.branches IS 'Sucursales de los socios';

-- Tabla de Stock por Sucursal
CREATE TABLE IF NOT EXISTS public.branch_stock (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    quantity DECIMAL(15,2) DEFAULT 0,
    reserved DECIMAL(15,2) DEFAULT 0,
    available DECIMAL(15,2) GENERATED ALWAYS AS (quantity - reserved) STORED,
    cost_override DECIMAL(15,2),
    price_override DECIMAL(15,2),
    location TEXT,
    published_to_store BOOLEAN DEFAULT false,
    store_approved_at TIMESTAMP WITH TIME ZONE,
    store_approved_by UUID,
    last_stock_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sale_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT branch_stock_unique UNIQUE(branch_id, product_id)
);

COMMENT ON TABLE public.branch_stock IS 'Stock de productos por sucursal';

-- ============================================================================
-- PARTE 2: TABLA PROFILES
-- ============================================================================

-- Crear tabla profiles con FKs a partners y branches
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'Admin' CHECK (role IN ('Admin', 'Cajero', 'Socio')),
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Perfiles de usuario extendidos con metadata adicional';

-- ============================================================================
-- PARTE 3: CONFIGURACIÓN DE RLS
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para partners
DROP POLICY IF EXISTS "partners_select_all" ON public.partners;
CREATE POLICY "partners_select_all" ON public.partners FOR SELECT USING (true);

DROP POLICY IF EXISTS "partners_insert_admin" ON public.partners;
CREATE POLICY "partners_insert_admin" ON public.partners FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "partners_update_admin" ON public.partners;
CREATE POLICY "partners_update_admin" ON public.partners FOR UPDATE USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "partners_delete_admin" ON public.partners;
CREATE POLICY "partners_delete_admin" ON public.partners FOR DELETE USING (auth.role() = 'service_role');

-- Políticas para branches
DROP POLICY IF EXISTS "branches_select_all" ON public.branches;
CREATE POLICY "branches_select_all" ON public.branches FOR SELECT USING (true);

DROP POLICY IF EXISTS "branches_insert_admin" ON public.branches;
CREATE POLICY "branches_insert_admin" ON public.branches FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "branches_update_admin" ON public.branches;
CREATE POLICY "branches_update_admin" ON public.branches FOR UPDATE USING (auth.role() = 'service_role');

-- Políticas para branch_stock
DROP POLICY IF EXISTS "branch_stock_select_all" ON public.branch_stock;
CREATE POLICY "branch_stock_select_all" ON public.branch_stock FOR SELECT USING (true);

DROP POLICY IF EXISTS "branch_stock_insert_admin" ON public.branch_stock;
CREATE POLICY "branch_stock_insert_admin" ON public.branch_stock FOR INSERT WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "branch_stock_update_admin" ON public.branch_stock;
CREATE POLICY "branch_stock_update_admin" ON public.branch_stock FOR UPDATE USING (auth.role() = 'service_role');

-- Políticas para profiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_auth" ON public.profiles;
CREATE POLICY "profiles_insert_auth" ON public.profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
CREATE POLICY "profiles_service_role_all" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- PARTE 4: ÍNDICES
-- ============================================================================

-- Partners
CREATE INDEX IF NOT EXISTS idx_partners_slug ON public.partners(slug);
CREATE INDEX IF NOT EXISTS idx_partners_email ON public.partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON public.partners(is_active);

-- Branches
CREATE INDEX IF NOT EXISTS idx_branches_partner_id ON public.branches(partner_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON public.branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_is_main ON public.branches(is_main);

-- Branch Stock
CREATE INDEX IF NOT EXISTS idx_branch_stock_branch_id ON public.branch_stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_product_id ON public.branch_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_branch_stock_published ON public.branch_stock(published_to_store);
CREATE INDEX IF NOT EXISTS idx_branch_stock_available ON public.branch_stock(available) WHERE available > 0;

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON public.profiles(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id) WHERE branch_id IS NOT NULL;

-- ============================================================================
-- PARTE 5: FUNCIÓN Y TRIGGERS
-- ============================================================================

-- Crear función update_updated_at_column() si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branches_updated_at ON public.branches;
CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        INSERT INTO public.profiles (id, name, email, role, partner_id, branch_id)
        VALUES (
            NEW.id,
            COALESCE(
                NEW.raw_user_meta_data->>'name',
                NEW.raw_user_meta_data->>'full_name',
                split_part(NEW.email, '@', 1),
                'Usuario'
            ),
            NEW.email,
            COALESCE(
                NEW.raw_user_meta_data->>'role',
                'Admin'
            ),
            NULLIF(NEW.raw_user_meta_data->>'partner_id', '')::UUID,
            NULLIF(NEW.raw_user_meta_data->>'branch_id', '')::UUID
        )
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            partner_id = COALESCE(EXCLUDED.partner_id, public.profiles.partner_id),
            branch_id = COALESCE(EXCLUDED.branch_id, public.profiles.branch_id),
            updated_at = NOW();
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
            RETURN NEW;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PARTE 6: SINCRONIZAR USUARIOS EXISTENTES
-- ============================================================================

-- Insertar usuarios que no tienen perfil
WITH missing_users AS (
    SELECT
        au.id,
        au.email,
        COALESCE(
            au.raw_user_meta_data->>'name',
            au.raw_user_meta_data->>'full_name',
            split_part(au.email, '@', 1),
            'Usuario'
        ) as name,
        COALESCE(
            au.raw_user_meta_data->>'role',
            'Admin'
        ) as role,
        NULLIF(au.raw_user_meta_data->>'partner_id', '')::UUID as partner_id,
        NULLIF(au.raw_user_meta_data->>'branch_id', '')::UUID as branch_id,
        au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
)
INSERT INTO public.profiles (id, name, email, role, partner_id, branch_id, created_at, updated_at)
SELECT
    id,
    name,
    email,
    role,
    partner_id,
    branch_id,
    created_at,
    NOW()
FROM missing_users
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTE 7: VERIFICAR RESULTADOS
-- ============================================================================

-- Mostrar resumen de tablas creadas
SELECT
    'partners' as table_name,
    COUNT(*) as total_rows
FROM public.partners

UNION ALL

SELECT
    'branches' as table_name,
    COUNT(*) as total_rows
FROM public.branches

UNION ALL

SELECT
    'branch_stock' as table_name,
    COUNT(*) as total_rows
FROM public.branch_stock

UNION ALL

SELECT
    'profiles' as table_name,
    COUNT(*) as total_rows
FROM public.profiles;

-- Mostrar usuarios por partner
SELECT
    p.partner_id,
    p.name,
    p.email,
    p.role,
    p.branch_id,
    p.created_at
FROM public.profiles p
WHERE p.partner_id IS NOT NULL
ORDER BY p.partner_id, p.created_at DESC;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
--
-- Después de ejecutar este script:
-- 1. Recarga la página de admin de partners
-- 2. Abre el detalle de "22 Electronic Puebla"
-- 3. Ve al tab "Usuarios"
-- 4. Deberías ver los usuarios del socio listados
--
-- Si no ves usuarios, verifica que:
-- - Los usuarios tienen partner_id en su metadata (auth.users -> raw_user_meta_data)
-- - Los usuarios fueron creados con el partner_id correcto
-- ============================================================================

-- ============================================================================
-- Crear tabla profiles y sincronizar usuarios existentes
-- Creado: 2026-02-18
-- Problema: La tabla profiles no existe, causando error en getPartnerUsers()
-- Solución: Crear tabla profiles y sincronizar usuarios de auth.users
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Crear tabla profiles si no existe
-- ----------------------------------------------------------------------------

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

-- Comentarios
COMMENT ON TABLE public.profiles IS 'Perfiles de usuario extendidos con metadata adicional';
COMMENT ON COLUMN public.profiles.id IS 'Referencia al usuario en auth.users';
COMMENT ON COLUMN public.profiles.partner_id IS 'Referencia al socio (si el usuario es un Socio)';
COMMENT ON COLUMN public.profiles.branch_id IS 'Referencia a la sucursal asignada (si aplica)';

-- ----------------------------------------------------------------------------
-- 2. Habilitar RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Crear políticas RLS
-- ----------------------------------------------------------------------------

-- Todos pueden leer perfiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT USING (true);

-- Solo authenticated puede insertar
DROP POLICY IF EXISTS "profiles_insert_auth" ON public.profiles;
CREATE POLICY "profiles_insert_auth" ON public.profiles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Usuario puede actualizar su propio perfil
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Service role puede hacer todo
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
CREATE POLICY "profiles_service_role_all" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 4. Crear índices
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON public.profiles(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id) WHERE branch_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. Crear trigger para updated_at
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. Crear función handle_new_user()
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 7. Crear trigger para nuevos usuarios
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 8. Sincronizar usuarios existentes
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 9. Verificar resultado
-- ----------------------------------------------------------------------------

-- Mostrar total de usuarios
SELECT
    'auth.users' as source,
    COUNT(*) as total
FROM auth.users

UNION ALL

SELECT
    'public.profiles' as source,
    COUNT(*) as total
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
-- FIN DE MIGRACIÓN
-- ============================================================================

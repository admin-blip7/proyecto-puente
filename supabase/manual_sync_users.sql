-- ============================================================================
-- SCRIPT MANUAL COMPLETO: Crear tabla profiles y sincronizar usuarios
-- Creado: 2026-02-18
--
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu dashboard de Supabase
--    (https://supabase.com/dashboard/project/aaftjwktzpnyjwklroww/sql/new)
-- 2. Copia y pega ESTE script completo (reemplaza el anterior)
-- 3. Ejecuta el script
-- 4. Verifica el resultado en la sección "Results"
--
-- ESTE SCRIPT:
-- - Crea la tabla profiles si no existe
-- - Configura RLS y políticas de seguridad
-- - Crea el trigger para nuevos usuarios
-- - Sincroniza usuarios existentes de auth.users a profiles
-- ============================================================================

-- ============================================================================
-- PARTE 1: CREAR TABLA PROFILES
-- ============================================================================

-- Crear tabla profiles (sin FKs a partners/branches ya que pueden no existir aún)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'Admin' CHECK (role IN ('Admin', 'Cajero', 'Socio')),
    partner_id UUID, -- Se agregará FK cuando exista la tabla partners
    branch_id UUID,  -- Se agregará FK cuando exista la tabla branches
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Perfiles de usuario extendidos con metadata adicional';

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_auth" ON public.profiles;
CREATE POLICY "profiles_insert_auth" ON public.profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
CREATE POLICY "profiles_service_role_all" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON public.profiles(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id) WHERE branch_id IS NOT NULL;

-- Crear trigger para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTE 2: CREAR FUNCIÓN Y TRIGGER PARA NUEVOS USUARIOS
-- ============================================================================

-- Crear función handle_new_user()
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

-- Crear trigger para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PARTE 3: SINCRONIZAR USUARIOS EXISTENTES
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
-- PARTE 4: VERIFICAR RESULTADOS
-- ============================================================================

-- Mostrar total de usuarios en auth.users vs profiles
SELECT
    'auth.users' as source,
    COUNT(*) as total
FROM auth.users

UNION ALL

SELECT
    'public.profiles' as source,
    COUNT(*) as total
FROM public.profiles;

-- Mostrar todos los perfiles creados
SELECT
    p.id,
    p.name,
    p.email,
    p.role,
    p.partner_id,
    p.branch_id,
    p.created_at
FROM public.profiles p
ORDER BY p.created_at DESC;

-- Mostrar usuarios por partner (los que tienen partner_id)
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

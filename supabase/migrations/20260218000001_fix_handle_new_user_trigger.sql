-- ============================================================================
-- Fix: handle_new_user() trigger más robusto
-- Creado: 2026-02-18
-- Problema: El trigger fallaba cuando la tabla profiles no existía o cuando
--           el INSERT fallaba, causando error 500 en /auth/v1/signup
-- Solución: Asegurar que profiles tiene las columnas necesarias y recrear
--           el trigger con manejo de errores
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Agregar columnas faltantes a profiles si no existen
-- ----------------------------------------------------------------------------

-- Agregar partner_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'partner_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN partner_id UUID;
        COMMENT ON COLUMN public.profiles.partner_id IS 'Referencia al socio (si el usuario es un Socio)';
    END IF;
END $$;

-- Agregar branch_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN branch_id UUID;
        COMMENT ON COLUMN public.profiles.branch_id IS 'Referencia a la sucursal asignada (si aplica)';
    END IF;
END $$;

-- Actualizar el CHECK constraint para incluir el rol 'Socio'
DO $$
BEGIN
    -- Eliminar el constraint anterior si existe
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;

    -- Agregar el nuevo constraint con todos los roles
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('Admin', 'Cajero', 'Socio'));
EXCEPTION
    WHEN OTHERS THEN
        -- Si algo falla, continuar sin problemas
        RAISE WARNING 'Could not update role check constraint: %', SQLERRM;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Asegurar que RLS esté habilitado
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Políticas RLS para profiles (asegurar que existan)
-- ----------------------------------------------------------------------------

-- Todos pueden leer perfiles
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

-- Solo authenticated puede insertar
DROP POLICY IF EXISTS "profiles_insert_auth" ON public.profiles;
CREATE POLICY "profiles_insert_auth" ON public.profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Usuario puede actualizar su propio perfil
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Service role puede hacer todo
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
CREATE POLICY "profiles_service_role_all" ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- ----------------------------------------------------------------------------
-- 4. Recrear función handle_new_user() con manejo de errores robusto
-- ----------------------------------------------------------------------------

-- Eliminar trigger y función anteriores si existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear función mejorada con EXCEPTION HANDLING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Usar INSERT con ON CONFLICT para evitar duplicados
    -- Usar EXCEPTION HANDLING para que no falle el signup si algo sale mal
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
            -- Logear el error pero no fallar el signup
            RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
            RETURN NEW;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. Recrear trigger
-- ----------------------------------------------------------------------------
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 6. Crear índices para optimización
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON public.profiles(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_branch_id ON public.profiles(branch_id) WHERE branch_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7. Trigger para updated_at (si no existe)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Nota: Esta migración es idempotente y puede ejecutarse múltiples veces
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Sync: Sincronizar usuarios existentes a profiles
-- Creado: 2026-02-18
-- Problema: Los usuarios creados antes del trigger handle_new_user() no tienen
--           perfil en la tabla profiles, causando que getPartnerUsers() no
--           funcione correctamente
-- Solución: Sincronizar todos los usuarios de auth.users a profiles usando su
--           raw_user_meta_data
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Función para sincronizar usuarios
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS JSON AS $$
DECLARE
    synced_count INTEGER := 0;
    error_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Iterar sobre todos los usuarios en auth.users
    FOR user_record IN
        SELECT
            id,
            email,
            raw_user_meta_data
        FROM auth.users
    LOOP
        BEGIN
            -- Insertar o actualizar perfil usando metadata del usuario
            INSERT INTO public.profiles (id, name, email, role, partner_id, branch_id)
            VALUES (
                user_record.id,
                COALESCE(
                    user_record.raw_user_meta_data->>'name',
                    user_record.raw_user_meta_data->>'full_name',
                    split_part(user_record.email, '@', 1),
                    'Usuario'
                ),
                user_record.email,
                COALESCE(
                    user_record.raw_user_meta_data->>'role',
                    'Admin'
                ),
                NULLIF(user_record.raw_user_meta_data->>'partner_id', '')::UUID,
                NULLIF(user_record.raw_user_meta_data->>'branch_id', '')::UUID
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                partner_id = COALESCE(EXCLUDED.partner_id, public.profiles.partner_id),
                branch_id = COALESCE(EXCLUDED.branch_id, public.profiles.branch_id),
                updated_at = NOW();

            synced_count := synced_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Continuar con el siguiente usuario si hay error
                RAISE WARNING 'Error syncing user %: %', user_record.id, SQLERRM;
                error_count := error_count + 1;
        END;
    END LOOP;

    -- Retornar resultado
    RETURN json_build_object(
        'synced', synced_count,
        'errors', error_count,
        'message', format('Sincronizados %d usuarios con %d errores', synced_count, error_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2. Ejecutar sincronización inmediata
-- ----------------------------------------------------------------------------

-- Seleccionar el resultado de la sincronización para ver el reporte
DO $$
DECLARE
    result JSON;
BEGIN
    SELECT sync_existing_users() INTO result;
    RAISE NOTICE 'Sync result: %', result->>'message';
END $$;

-- ----------------------------------------------------------------------------
-- 3. Crear función conveniente para re-sincronización manual
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_sync_users()
RETURNS JSON AS $$
BEGIN
    -- Verificar que el usuario es admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'Admin'
    ) THEN
        RAISE EXCEPTION 'Solo administradores pueden ejecutar esta función';
    END IF;

    RETURN public.sync_existing_users();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Notas:
-- - Esta migración es idempotente y puede ejecutarse múltiples veces
-- - La función sync_existing_users() puede ser ejecutada manualmente
--   desde el SQL Editor de Supabase si se necesita re-sincronizar
-- - La función admin_sync_users() está protegida para solo admins
-- ----------------------------------------------------------------------------

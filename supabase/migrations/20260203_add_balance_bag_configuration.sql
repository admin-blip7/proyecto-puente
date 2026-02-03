-- Migration para implementar la configuración de bolsa de saldo
-- Esta configuración permite asignar una cuenta específica para mantener el dinero de la bolsa de saldo
-- separado del efectivo disponible en caja.

-- 1. Agregar configuración en la tabla settings para la cuenta de bolsa de saldo de efectivo
INSERT INTO public.settings (id, data, last_updated, created_at) VALUES 
(
    'cash_balance_bag_config',
    jsonb_build_object(
        'balanceBagAccountId', NULL::text,
        'balanceBagEnabled', false,
        'lastUpdated', now()
    )::jsonb,
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE SET
    data = COALESCE(settings.data, '{}'::jsonb) || 
            jsonb_build_object(
                'balanceBagAccountId', 
                COALESCE((settings.data->>'balanceBagAccountId')::text, NULL),
                'balanceBagEnabled', 
                COALESCE((settings.data->>'balanceBagEnabled')::boolean, false),
                'lastUpdated', 
                now()
            ),
    last_updated = now();

-- 2. Agregar columna a cash_sessions para registrar la cuenta de bolsa de saldo utilizada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cash_sessions' 
        AND column_name = 'balance_bag_account_id'
    ) THEN 
        ALTER TABLE public.cash_sessions 
        ADD COLUMN balance_bag_account_id TEXT;
        
        COMMENT ON COLUMN public.cash_sessions.balance_bag_account_id IS 
        'ID de la cuenta de finanzas donde se deposita el dinero de la bolsa de saldo (efectivo dejado en caja)';
    END IF;
END $$;

-- 3. Agregar columna a cash_sessions para registrar el monto de la bolsa de saldo separado
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cash_sessions' 
        AND column_name = 'balance_bag_amount'
    ) THEN 
        ALTER TABLE public.cash_sessions 
        ADD COLUMN balance_bag_amount NUMERIC(10, 2) DEFAULT 0;
        
        COMMENT ON COLUMN public.cash_sessions.balance_bag_amount IS 
        'Monto de efectivo que permanece en la bolsa de saldo (no depositado, solo cambiado de estado)';
    END IF;
END $$;

-- 4. Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_cash_sessions_balance_bag_account 
ON public.cash_sessions(balance_bag_account_id) 
WHERE balance_bag_account_id IS NOT NULL;

-- 5. Crear función auxiliar para obtener la configuración de la bolsa de saldo
CREATE OR REPLACE FUNCTION get_balance_bag_config()
RETURNS TABLE(
    balance_bag_account_id TEXT,
    balance_bag_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (data->>'balanceBagAccountId')::text as balance_bag_account_id,
        COALESCE((data->>'balanceBagEnabled')::boolean, false) as balance_bag_enabled
    FROM public.settings
    WHERE id = 'cash_balance_bag_config';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios explicativos
COMMENT ON FUNCTION get_balance_bag_config() IS 
    'Función auxiliar para obtener la configuración de la bolsa de saldo de efectivo';

-- Script para limpiar sesiones de caja duplicadas y actualizar sus totales
-- Ejecutar en la base de datos de Supabase

-- 1. Eliminar sesiones duplicadas (mantener solo una por sessionId)
WITH duplicates AS (
  SELECT DISTINCT ON ("sessionId") "sessionId", firestore_id
  FROM cash_sessions
  WHERE status = 'Abierto'
  ORDER BY "sessionId", "openedAt" DESC
)
DELETE FROM cash_sessions
WHERE firestore_id NOT IN (SELECT firestore_id FROM duplicates)
  AND status = 'Abierto';

-- 2. Actualizar todos los totales de sesiones abiertas
DO $$
DECLARE
  session_record RECORD;
  v_total_cash_sales NUMERIC;
  v_total_card_sales NUMERIC;
BEGIN
  -- Iterar sobre todas las sesiones abiertas
  FOR session_record IN
    SELECT DISTINCT "sessionId", "startingFloat", "totalCashPayouts"
    FROM cash_sessions
    WHERE status = 'Abierto'
  LOOP
    -- Calcular ventas en efectivo para esta sesión
    SELECT COALESCE(SUM("totalAmount"), 0)
    INTO v_total_cash_sales
    FROM sales
    WHERE "sessionId" = session_record."sessionId"
      AND "paymentMethod" = 'Efectivo'
      AND status = 'completed';

    -- Calcular ventas con tarjeta para esta sesión
    SELECT COALESCE(SUM("totalAmount"), 0)
    INTO v_total_card_sales
    FROM sales
    WHERE "sessionId" = session_record."sessionId"
      AND "paymentMethod" = 'Tarjeta'
      AND status = 'completed';

    -- Actualizar la sesión con los nuevos totales
    UPDATE cash_sessions
    SET
      "totalCashSales" = v_total_cash_sales,
      "totalCardSales" = v_total_card_sales,
      "expectedCashInDrawer" = COALESCE("startingFloat", 0) + v_total_cash_sales - COALESCE("totalCashPayouts", 0)
    WHERE "sessionId" = session_record."sessionId";

    RAISE NOTICE 'Updated session %: cash=%, card=%', session_record."sessionId", v_total_cash_sales, v_total_card_sales;
  END LOOP;
END
$$;

-- 3. Verificar el resultado
SELECT
  "sessionId",
  status,
  "openedByName",
  "startingFloat",
  "totalCashSales",
  "totalCardSales",
  "totalCashPayouts",
  "expectedCashInDrawer"
FROM cash_sessions
WHERE status = 'Abierto'
ORDER BY "openedAt" DESC
LIMIT 10;

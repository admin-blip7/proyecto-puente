-- FUNCIÓN SQL FINAL Y DEFINITIVA
-- Esta función actualiza los totales de una sesión de caja
-- Debe ejecutarse en Supabase SQL Editor

DROP FUNCTION IF EXISTS update_cash_session_totals_by_session(text);

CREATE OR REPLACE FUNCTION update_cash_session_totals_by_session(session_id_param TEXT)
RETURNS VOID AS $$
DECLARE
  v_total_cash_sales NUMERIC := 0;
  v_total_card_sales NUMERIC := 0;
  v_session_id TEXT;
  v_starting_float NUMERIC;
  v_total_payouts NUMERIC;
BEGIN
  -- Obtener datos de la sesión usando firestore_id
  -- NOTA: Las columnas son camelCase
  SELECT "sessionId", "startingFloat", "totalCashPayouts"
  INTO v_session_id, v_starting_float, v_total_payouts
  FROM cash_sessions 
  WHERE firestore_id = session_id_param;

  IF NOT FOUND THEN
    RAISE WARNING 'Session not found with firestore_id: %', session_id_param;
    RETURN; -- No lanzar excepción, solo advertir y salir
  END IF;

  RAISE NOTICE 'Processing session firestore_id=%, sessionId=%', session_id_param, v_session_id;

  -- Calcular ventas en efectivo
  -- NOTA: columnas en sales son "sessionId", "totalAmount", "paymentMethod" (camelCase)
  SELECT COALESCE(SUM("totalAmount"), 0)
  INTO v_total_cash_sales
  FROM sales
  WHERE "sessionId" = v_session_id
    AND "paymentMethod" = 'Efectivo'
    AND (status = 'completed' OR status IS NULL);

  RAISE NOTICE 'Cash sales for sessionId %: %', v_session_id, v_total_cash_sales;

  -- Calcular ventas con tarjeta
  SELECT COALESCE(SUM("totalAmount"), 0)
  INTO v_total_card_sales
  FROM sales
  WHERE "sessionId" = v_session_id
    AND ("paymentMethod" = 'Tarjeta de Crédito' OR "paymentMethod" = 'Tarjeta')
    AND (status = 'completed' OR status IS NULL);

  RAISE NOTICE 'Card sales for sessionId %: %', v_session_id, v_total_card_sales;

  -- Actualizar la sesión
  -- NOTA: columnas en cash_sessions son camelCase (SIN updatedAt porque no existe)
  UPDATE cash_sessions
  SET
    "totalCashSales" = v_total_cash_sales,
    "totalCardSales" = v_total_card_sales,
    "expectedCashInDrawer" = COALESCE(v_starting_float, 0) + v_total_cash_sales - COALESCE(v_total_payouts, 0)
  WHERE firestore_id = session_id_param;

  RAISE NOTICE 'Session % updated: cash=$%, card=$%', session_id_param, v_total_cash_sales, v_total_card_sales;
END;
$$ LANGUAGE plpgsql;

-- Comentario: Esta función se ejecuta automáticamente cada vez que se registra una venta
-- desde el API endpoint /api/sales/route.ts línea 106

-- Función para actualizar los totales de una sesión de caja
-- Versión CORREGIDA con nombres de columnas reales (camelCase)

-- Función principal que usa la relación sessionId en la tabla sales
CREATE OR REPLACE FUNCTION update_cash_session_totals_by_session(session_id_param TEXT)
RETURNS VOID AS $$
DECLARE
  v_total_cash_sales NUMERIC := 0;
  v_total_card_sales NUMERIC := 0;
  v_session_record cash_sessions%ROWTYPE;
BEGIN
  -- Obtener la sesión usando firestore_id
  SELECT * INTO v_session_record FROM cash_sessions WHERE firestore_id = session_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', session_id_param;
  END IF;

  RAISE NOTICE 'Processing session %, sessionId=%', session_id_param, v_session_record.sessionId;

  -- Calcular ventas en efectivo
  -- NOTA: Usar "sessionId" (camelCase) y "totalAmount" (camelCase)
  SELECT COALESCE(SUM("totalAmount"), 0)
  INTO v_total_cash_sales
  FROM sales
  WHERE "sessionId" = v_session_record.sessionId
    AND "paymentMethod" = 'Efectivo'
    AND (status = 'completed' OR status IS NULL);

  RAISE NOTICE 'Cash sales calculated: %', v_total_cash_sales;

  -- Calcular ventas con tarjeta
  SELECT COALESCE(SUM("totalAmount"), 0)
  INTO v_total_card_sales
  FROM sales
  WHERE "sessionId" = v_session_record.sessionId
    AND ("paymentMethod" = 'Tarjeta de Crédito' OR "paymentMethod" = 'Tarjeta')
    AND (status = 'completed' OR status IS NULL);

  RAISE NOTICE 'Card sales calculated: %', v_total_card_sales;

  -- Actualizar la sesión
  UPDATE cash_sessions
  SET
    totalCashSales = v_total_cash_sales,
    totalCardSales = v_total_card_sales,
    expectedCashInDrawer = COALESCE(startingFloat, 0) + v_total_cash_sales - COALESCE(totalCashPayouts, 0),
    updatedAt = NOW()
  WHERE firestore_id = session_id_param;

  RAISE NOTICE 'Session % updated: cash=%, card=%', session_id_param, v_total_cash_sales, v_total_card_sales;
END;
$$ LANGUAGE plpgsql;

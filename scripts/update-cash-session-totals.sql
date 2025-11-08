-- Función para actualizar los totales de una sesión de caja
-- basado en las ventas registradas

CREATE OR REPLACE FUNCTION update_cash_session_totals(p_session_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_total_cash_sales NUMERIC := 0;
  v_total_card_sales NUMERIC := 0;
BEGIN
  -- Calcular ventas en efectivo para esta sesión
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_cash_sales
  FROM sales s
  JOIN cash_sessions cs ON cs.session_id = s.session_id
  WHERE cs.firestore_id = p_session_id
    AND s.payment_method = 'Efectivo'
    AND s.status = 'completed';

  -- Calcular ventas con tarjeta para esta sesión
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_card_sales
  FROM sales s
  JOIN cash_sessions cs ON cs.session_id = s.session_id
  WHERE cs.firestore_id = p_session_id
    AND s.payment_method = 'Tarjeta'
    AND s.status = 'completed';

  -- Actualizar la sesión de caja con los nuevos totales
  UPDATE cash_sessions
  SET
    total_cash_sales = v_total_cash_sales,
    total_card_sales = v_total_card_sales,
    expected_cash_in_drawer = COALESCE(starting_float, 0) + v_total_cash_sales - COALESCE(total_cash_payouts, 0),
    updated_at = NOW()
  WHERE firestore_id = p_session_id;

  RAISE NOTICE 'Updated session %: cash_sales=%, card_sales=%', p_session_id, v_total_cash_sales, v_total_card_sales;
END;
$$ LANGUAGE plpgsql;

-- Función alternativa que usa la relación session_id en la tabla sales
-- Esta es la función principal que se debe usar
CREATE OR REPLACE FUNCTION update_cash_session_totals_by_session(session_id_param TEXT)
RETURNS VOID AS $$
DECLARE
  v_total_cash_sales NUMERIC := 0;
  v_total_card_sales NUMERIC := 0;
  v_session_record cash_sessions%ROWTYPE;
BEGIN
  -- Obtener la sesión
  SELECT * INTO v_session_record FROM cash_sessions WHERE firestore_id = session_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found: %', session_id_param;
  END IF;

  -- Calcular ventas en efectivo
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_cash_sales
  FROM sales
  WHERE session_id = v_session_record.session_id
    AND payment_method = 'Efectivo'
    AND status = 'completed';

  -- Calcular ventas con tarjeta
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_card_sales
  FROM sales
  WHERE session_id = v_session_record.session_id
    AND payment_method = 'Tarjeta'
    AND status = 'completed';

  -- Actualizar la sesión
  UPDATE cash_sessions
  SET
    total_cash_sales = v_total_cash_sales,
    total_card_sales = v_total_card_sales,
    expected_cash_in_drawer = COALESCE(starting_float, 0) + v_total_cash_sales - COALESCE(total_cash_payouts, 0),
    updated_at = NOW()
  WHERE firestore_id = session_id_param;

  RAISE NOTICE 'Session % updated: cash=%, card=%', session_id_param, v_total_cash_sales, v_total_card_sales;
END;
$$ LANGUAGE plpgsql;

-- Create function to collect repair profit
CREATE OR REPLACE FUNCTION collect_repair_profit(p_repair_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_repair_record RECORD;
  v_account_id TEXT;
  v_profit NUMERIC;
  v_updated_repair JSONB;
BEGIN
  -- 1. Get the repair order
  -- Try to find by firestore_id first
  SELECT * INTO v_repair_record
  FROM repair_orders
  WHERE firestore_id = p_repair_id
  LIMIT 1;

  -- If not found, try by id (if p_repair_id is a valid UUID)
  IF v_repair_record IS NULL THEN
    BEGIN
      SELECT * INTO v_repair_record
      FROM repair_orders
      WHERE id = p_repair_id::uuid
      LIMIT 1;
    EXCEPTION WHEN invalid_text_representation THEN
      -- p_repair_id is not a UUID, ignore
      NULL;
    END;
  END IF;

  IF v_repair_record IS NULL THEN
    RAISE EXCEPTION 'Repair order not found';
  END IF;

  -- 2. Check if already completed to avoid double counting profit
  IF v_repair_record.status = 'Completado' THEN
     -- Already completed, just update timestamp and return
     UPDATE repair_orders
     SET "completedAt" = to_jsonb(NOW())
     WHERE id = v_repair_record.id
     RETURNING to_jsonb(repair_orders.*) INTO v_updated_repair;
     
     RETURN v_updated_repair;
  END IF;

  v_profit := COALESCE(v_repair_record.profit, 0);

  -- 3. Update repair order status
  UPDATE repair_orders
  SET status = 'Completado',
      "completedAt" = to_jsonb(NOW())
  WHERE id = v_repair_record.id
  RETURNING to_jsonb(repair_orders.*) INTO v_updated_repair;

  -- 4. Handle 'Repairs' account
  SELECT firestore_id INTO v_account_id
  FROM accounts
  WHERE name = 'Repairs'
  LIMIT 1;

  IF v_account_id IS NULL THEN
    -- Create it if it doesn't exist
    v_account_id := gen_random_uuid()::text;
    INSERT INTO accounts (firestore_id, name, type, current_balance)
    VALUES (v_account_id, 'Repairs', 'Banco', 0);
  END IF;

  -- 5. Update account balance
  UPDATE accounts
  SET current_balance = COALESCE(current_balance, 0) + v_profit
  WHERE firestore_id = v_account_id;

  RETURN v_updated_repair;
END;
$$;

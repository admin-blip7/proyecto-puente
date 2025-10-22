-- Tabla de deduplicación para prevenir ejecuciones múltiples de ventas
CREATE TABLE IF NOT EXISTS sale_deduplication (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  saleId TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completedAt TIMESTAMP WITH TIME ZONE,
  expiresAt TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_sale_deduplication_saleId ON sale_deduplication(saleId);
CREATE INDEX IF NOT EXISTS idx_sale_deduplication_status ON sale_deduplication(status);
CREATE INDEX IF NOT EXISTS idx_sale_deduplication_expiresAt ON sale_deduplication(expiresAt);

-- Tabla de logs de transacciones
CREATE TABLE IF NOT EXISTS transaction_logs (
  transaction_id UUID PRIMARY KEY,
  operation_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para logs de transacciones
CREATE INDEX IF NOT EXISTS idx_transaction_logs_operation_id ON transaction_logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_sale_id ON transaction_logs(sale_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_status ON transaction_logs(status);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_created_at ON transaction_logs(created_at);

-- Función de transacción atómica para ventas
CREATE OR REPLACE FUNCTION execute_sale_transaction(
  p_sale_id TEXT,
  p_operation_id TEXT,
  p_cart_items JSONB,
  p_cashier_id TEXT,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  item_record JSONB;
  product_record RECORD;
  new_stock INTEGER;
  log_id UUID;
  transaction_id UUID DEFAULT gen_random_uuid();
  total_deduction INTEGER := 0;
BEGIN
  -- Insertar registro de transacción
  INSERT INTO transaction_logs (transaction_id, operation_id, sale_id, status, created_at)
  VALUES (transaction_id, p_operation_id, p_sale_id, 'started', NOW());
  
  -- Procesar cada item del carrito
  FOR item_record IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    -- Obtener información del producto con bloqueo
    SELECT * INTO product_record
    FROM products 
    WHERE id = (item_record->>'product_id')::TEXT 
       OR firestore_id = (item_record->>'product_id')::TEXT
    FOR UPDATE;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado: %', item_record->>'product_id';
    END IF;
    
    -- Calcular nuevo stock
    new_stock := product_record.stock - (item_record->>'quantity')::INTEGER;
    
    -- Validar stock suficiente
    IF new_stock < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente para producto: %. Actual: %, Solicitado: %', 
        product_record.name, product_record.stock, (item_record->>'quantity')::INTEGER;
    END IF;
    
    -- Actualizar stock
    UPDATE products 
    SET stock = new_stock, updated_at = NOW()
    WHERE id = product_record.id;
    
    -- Insertar log de inventario
    INSERT INTO inventory_logs (
      productId, 
      productName, 
      change, 
      reason, 
      updatedBy, 
      createdAt, 
      metadata
    ) VALUES (
      product_record.firestore_id,
      product_record.name,
      -(item_record->>'quantity')::INTEGER,
      'Venta',
      p_cashier_id,
      NOW(),
      jsonb_build_object(
        'saleId', p_sale_id,
        'operationId', p_operation_id,
        'transactionId', transaction_id,
        'cost', item_record->>'cost',
        'originalStock', product_record.stock,
        'newStock', new_stock
      )
    );
    
    -- Actualizar consignador si aplica
    IF product_record.ownershipType = 'Consigna' AND product_record.consignorId IS NOT NULL THEN
      UPDATE consignors 
      SET balanceDue = balanceDue + ((item_record->>'cost')::NUMERIC * (item_record->>'quantity')::INTEGER),
          updated_at = NOW()
      WHERE firestore_id = product_record.consignorId;
    END IF;
    
    total_deduction := total_deduction + (item_record->>'quantity')::INTEGER;
  END LOOP;
  
  -- Marcar transacción como completada
  UPDATE transaction_logs 
  SET status = 'completed', completed_at = NOW()
  WHERE transaction_id = transaction_id;
  
  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', transaction_id,
    'total_deduction', total_deduction,
    'items_processed', jsonb_array_length(p_cart_items)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Marcar transacción como fallida
    UPDATE transaction_logs 
    SET status = 'failed', error_message = SQLERRM, completed_at = NOW()
    WHERE transaction_id = transaction_id;
    
    -- Retornar error
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'transaction_id', transaction_id
    );
END;
$$ LANGUAGE plpgsql;
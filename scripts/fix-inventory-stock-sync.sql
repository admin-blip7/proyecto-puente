-- ============================================================================
-- FIX INVENTORY STOCK SYNCHRONIZATION
-- ============================================================================
-- Diagnóstico: Productos con stock desincronizado entre products.stock y kardex
-- Fecha: 2026-02-21
-- Autor: Kilo Code (Automated Fix Script)
-- 
-- PROBLEMA:
-- El stock en products.stock no coincide con los movimientos registrados en kardex
-- Afecta a 178 productos, incluyendo productos de socios/consignación
--
-- CAUSA RAÍZ:
-- 1. No existe trigger que sincronice products.stock cuando se inserta en kardex
-- 2. Transacciones no atómicas permiten que una operación falle y la otra no
-- 3. Algunas operaciones actualizan products.stock sin registrar en kardex
--
-- SOLUCIÓN:
-- 1. Crear tabla de respaldo
-- 2. Sincronizar products.stock con el último stock_nuevo de kardex
-- 3. Crear trigger para mantener sincronización automática
-- 4. Verificar resultados
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR TABLA DE RESPALDO
-- ============================================================================

-- Crear tabla de respaldo con el estado actual antes de cualquier modificación
DROP TABLE IF EXISTS products_stock_backup_20260221;

CREATE TABLE products_stock_backup_20260221 AS
SELECT 
    id,
    name,
    sku,
    stock,
    ownership_type,
    consignor_id,
    created_at,
    updated_at,
    NOW() as backup_timestamp
FROM products;

-- Verificar respaldo
SELECT 'Respaldo creado: ' || COUNT(*) || ' productos' as mensaje
FROM products_stock_backup_20260221;

-- ============================================================================
-- PASO 2: DIAGNÓSTICO PRE-FIX
-- ============================================================================

-- Mostrar productos desincronizados ANTES del fix
CREATE TEMP TABLE desync_before_fix AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.stock as products_stock_before,
    sa.stock_actual as kardex_stock_before,
    p.stock - COALESCE(sa.stock_actual, 0) as diferencia_before,
    p.ownership_type,
    c.name as consignor_name
FROM products p
LEFT JOIN stock_actual sa ON p.id = sa.producto_id
LEFT JOIN consignors c ON p.consignor_id = c.id
WHERE p.stock != COALESCE(sa.stock_actual, 0);

-- Reporte pre-fix
SELECT 
    'ANTES DEL FIX' as estado,
    COUNT(*) as total_desincronizados,
    SUM(CASE WHEN products_stock_before = 0 AND kardex_stock_before > 0 THEN 1 ELSE 0 END) as productos_con_stock_cero_perdido,
    SUM(CASE WHEN products_stock_before > kardex_stock_before THEN 1 ELSE 0 END) as productos_con_stock_sobrestimado,
    SUM(CASE WHEN products_stock_before < kardex_stock_before AND products_stock_before > 0 THEN 1 ELSE 0 END) as productos_con_stock_subestimado
FROM desync_before_fix;

-- Mostrar productos de socios afectados
SELECT 
    'Productos de Socios Afectados' as categoria,
    name,
    sku,
    products_stock_before as stock_actual_en_sistema,
    kardex_stock_before as stock_real_segun_kardex,
    diferencia_before as diferencia
FROM desync_before_fix
WHERE ownership_type = 'Consigna' OR consignor_name IS NOT NULL
ORDER BY ABS(diferencia_before) DESC;

-- ============================================================================
-- PASO 3: SINCRONIZACIÓN DE STOCK
-- ============================================================================

-- OPCIÓN A: Sincronizar TODOS los productos con kardex (RECOMENDADO)
-- Actualiza products.stock al valor más reciente de stock_nuevo en kardex
UPDATE products p
SET 
    stock = sa.stock_actual,
    updated_at = NOW()
FROM stock_actual sa
WHERE p.id = sa.producto_id
AND p.stock != sa.stock_actual;

-- Reporte de productos actualizados
SELECT 'Productos sincronizados con kardex: ' || ROW_COUNT() as mensaje;

-- OPCIÓN B: Sincronizar SOLO productos de socios/consignación
-- (Descomentar si solo se quiere afectar productos de socios)
/*
UPDATE products p
SET 
    stock = sa.stock_actual,
    updated_at = NOW()
FROM stock_actual sa
WHERE p.id = sa.producto_id
AND p.stock != sa.stock_actual
AND (p.ownership_type = 'Consigna' OR p.consignor_id IS NOT NULL);
*/

-- OPCIÓN C: Sincronizar SOLO productos donde products.stock = 0 pero kardex tiene stock
-- (Opción conservadora - solo recuperar stock "perdido")
/*
UPDATE products p
SET 
    stock = sa.stock_actual,
    updated_at = NOW()
FROM stock_actual sa
WHERE p.id = sa.producto_id
AND p.stock = 0 
AND sa.stock_actual > 0;
*/

-- ============================================================================
-- PASO 4: VERIFICACIÓN POST-FIX
-- ============================================================================

-- Verificar productos que quedaron desincronizados
CREATE TEMP TABLE desync_after_fix AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.stock as products_stock_after,
    sa.stock_actual as kardex_stock_after,
    p.stock - COALESCE(sa.stock_actual, 0) as diferencia_after,
    p.ownership_type
FROM products p
LEFT JOIN stock_actual sa ON p.id = sa.producto_id
WHERE p.stock != COALESCE(sa.stock_actual, 0);

-- Reporte post-fix
SELECT 
    'DESPUÉS DEL FIX' as estado,
    COUNT(*) as total_desincronizados,
    SUM(CASE WHEN products_stock_after = 0 AND kardex_stock_after > 0 THEN 1 ELSE 0 END) as productos_con_stock_cero_perdido,
    SUM(CASE WHEN products_stock_after > kardex_stock_after THEN 1 ELSE 0 END) as productos_con_stock_sobrestimado
FROM desync_after_fix;

-- ============================================================================
-- PASO 5: CREAR TRIGGER DE SINCRONIZACIÓN AUTOMÁTICA
-- ============================================================================

-- Función para actualizar products.stock cuando se inserta en kardex
CREATE OR REPLACE FUNCTION update_product_stock_from_kardex()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar el stock del producto con el nuevo stock del kardex
    UPDATE products
    SET 
        stock = NEW.stock_nuevo,
        updated_at = NOW()
    WHERE id = NEW.producto_id;
    
    -- Registrar en log (opcional)
    INSERT INTO inventory_logs (product_id, quantity_change, change_type, created_at, metadata)
    VALUES (
        NEW.producto_id::uuid,
        NEW.stock_nuevo - NEW.stock_anterior,
        'kardex_trigger_sync',
        NOW(),
        jsonb_build_object(
            'kardex_id', NEW.id,
            'tipo', NEW.tipo,
            'concepto', NEW.concepto,
            'stock_anterior', NEW.stock_anterior,
            'stock_nuevo', NEW.stock_nuevo,
            'triggered_at', NOW()
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar si el trigger ya existe y eliminarlo
DROP TRIGGER IF EXISTS sync_product_stock_from_kardex ON kardex;

-- Crear el trigger
CREATE TRIGGER sync_product_stock_from_kardex
AFTER INSERT ON kardex
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_from_kardex();

SELECT 'Trigger de sincronización creado exitosamente' as mensaje;

-- ============================================================================
-- PASO 6: CREAR FUNCIÓN RPC PARA TRANSACCIONES ATÓMICAS
-- ============================================================================

-- Función para procesar movimiento de stock de forma atómica
CREATE OR REPLACE FUNCTION process_stock_movement_atomic(
    p_product_id TEXT,
    p_quantity INTEGER,
    p_movement_type TEXT,
    p_concepto TEXT,
    p_user_id TEXT DEFAULT NULL,
    p_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_kardex_id UUID;
    v_result JSONB;
BEGIN
    -- Obtener stock actual
    SELECT stock INTO v_current_stock
    FROM products
    WHERE id = p_product_id;
    
    IF v_current_stock IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Producto no encontrado',
            'product_id', p_product_id
        );
    END IF;
    
    -- Calcular nuevo stock
    IF p_movement_type = 'INGRESO' THEN
        v_new_stock := v_current_stock + p_quantity;
    ELSIF p_movement_type = 'SALIDA' THEN
        IF v_current_stock < p_quantity THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Stock insuficiente',
                'current_stock', v_current_stock,
                'requested_quantity', p_quantity
            );
        END IF;
        v_new_stock := v_current_stock - p_quantity;
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tipo de movimiento inválido',
            'movement_type', p_movement_type
        );
    END IF;
    
    -- Insertar en kardex (esto disparará el trigger que actualiza products.stock)
    INSERT INTO kardex (
        producto_id,
        tipo,
        concepto,
        cantidad,
        stock_anterior,
        stock_nuevo,
        referencia,
        usuario_id,
        notas,
        created_at
    ) VALUES (
        p_product_id,
        p_movement_type,
        p_concepto,
        p_quantity,
        v_current_stock,
        v_new_stock,
        p_reference,
        p_user_id,
        p_notes,
        NOW()
    ) RETURNING id INTO v_kardex_id;
    
    -- Retornar resultado exitoso
    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock,
        'quantity_changed', p_quantity,
        'movement_type', p_movement_type,
        'kardex_id', v_kardex_id
    );
END;
$$ LANGUAGE plpgsql;

SELECT 'Función RPC process_stock_movement_atomic creada' as mensaje;

-- ============================================================================
-- PASO 7: REPORTE FINAL
-- ============================================================================

-- Comparación antes/después para productos de socios
SELECT 
    'REPORTE FINAL - PRODUCTOS DE SOCIOS' as titulo,
    b.name as producto,
    b.sku,
    b.products_stock_before as stock_antes,
    p.stock as stock_despues,
    b.kardex_stock_before as stock_segun_kardex,
    CASE 
        WHEN p.stock = b.kardex_stock_before THEN '✓ SINCRONIZADO'
        ELSE '⚠ DIFERENCIA'
    END as estado
FROM desync_before_fix b
JOIN products p ON b.id = p.id
WHERE b.ownership_type = 'Consigna' OR b.consignor_name IS NOT NULL
ORDER BY b.name;

-- ============================================================================
-- INSTRUCCIONES DE ROLLBACK (Si es necesario revertir)
-- ============================================================================

/*
-- Para revertir los cambios:
UPDATE products p
SET stock = b.stock
FROM products_stock_backup_20260221 b
WHERE p.id = b.id;

-- Para eliminar el trigger:
DROP TRIGGER IF EXISTS sync_product_stock_from_kardex ON kardex;
DROP FUNCTION IF EXISTS update_product_stock_from_kardex();

-- Para eliminar la función RPC:
DROP FUNCTION IF EXISTS process_stock_movement_atomic(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT);
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

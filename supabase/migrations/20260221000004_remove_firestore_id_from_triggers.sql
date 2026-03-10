CREATE OR REPLACE FUNCTION public.insert_kardex_from_inventory_log()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id TEXT;
    v_product_stock NUMERIC;
    v_delta NUMERIC;
    v_tipo VARCHAR(10);
    v_cantidad NUMERIC;
    v_stock_nuevo NUMERIC;
    v_stock_anterior NUMERIC;
    v_precio_unitario NUMERIC;
    v_valor_total NUMERIC;
    v_concepto TEXT;
    v_created_at TIMESTAMPTZ;
    v_usuario_id UUID;
BEGIN
    SELECT id, stock INTO v_product_id, v_product_stock
    FROM public.products
    WHERE id::text = NEW.product_id::text
    LIMIT 1;

    IF v_product_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_delta := COALESCE(
        NEW.quantity_change::numeric,
        NEW.change::numeric,
        0
    );
    IF v_delta = 0 THEN
        RETURN NEW;
    END IF;

    v_tipo := CASE WHEN v_delta >= 0 THEN 'INGRESO' ELSE 'SALIDA' END;
    v_cantidad := abs(v_delta);
    v_stock_nuevo := COALESCE(NEW.new_stock, v_product_stock, 0);
    v_stock_anterior := COALESCE(NEW.previous_stock, v_stock_nuevo - v_delta, v_stock_nuevo);
    v_stock_nuevo := GREATEST(v_stock_nuevo, 0);
    v_stock_anterior := GREATEST(v_stock_anterior, 0);
    v_concepto := COALESCE(NEW.reason, NEW.change_type, NEW.notes, 'Movimiento');
    v_created_at := COALESCE(NEW.created_at, NOW());

    BEGIN
        v_precio_unitario := NULL;
        IF NEW.metadata ? 'cost' THEN
            v_precio_unitario := (NEW.metadata->>'cost')::numeric;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_precio_unitario := NULL;
    END;

    v_valor_total := CASE
        WHEN v_precio_unitario IS NOT NULL THEN v_precio_unitario * v_cantidad
        ELSE NULL
    END;

    BEGIN
        v_usuario_id := NEW.updated_by::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_usuario_id := NULL;
    END;

    IF EXISTS (
        SELECT 1
        FROM public.kardex
        WHERE producto_id = v_product_id
          AND created_at = v_created_at
          AND cantidad = v_cantidad
          AND tipo = v_tipo
          AND COALESCE(referencia, '') = COALESCE(NEW.reference_id, '')
    ) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.kardex (
        producto_id,
        tipo,
        concepto,
        cantidad,
        stock_anterior,
        stock_nuevo,
        precio_unitario,
        valor_total,
        referencia,
        usuario_id,
        notas,
        created_at
    ) VALUES (
        v_product_id,
        v_tipo,
        v_concepto,
        v_cantidad,
        v_stock_anterior,
        v_stock_nuevo,
        v_precio_unitario,
        v_valor_total,
        NEW.reference_id,
        v_usuario_id,
        NEW.notes,
        v_created_at
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

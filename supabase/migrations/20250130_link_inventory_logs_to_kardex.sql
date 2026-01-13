-- Link inventory_logs to kardex (backfill + trigger)
-- This keeps kardex in sync with inventory_logs inserts.

-- Ensure optional columns exist for legacy schemas
ALTER TABLE public.inventory_logs
ADD COLUMN IF NOT EXISTS change_type TEXT,
ADD COLUMN IF NOT EXISTS quantity_change INTEGER,
ADD COLUMN IF NOT EXISTS previous_stock INTEGER,
ADD COLUMN IF NOT EXISTS new_stock INTEGER,
ADD COLUMN IF NOT EXISTS reference_id TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

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
       OR firestore_id = NEW.product_id::text
    LIMIT 1;

    IF v_product_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_delta := COALESCE(
        NEW.quantity_change::numeric,
        CASE
            WHEN pg_typeof(NEW.change)::text = 'jsonb' THEN
                CASE
                    WHEN jsonb_typeof(NEW.change) IN ('number','string') THEN (NEW.change #>> '{}')::numeric
                    ELSE NULL
                END
            ELSE NEW.change::numeric
        END,
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

DROP TRIGGER IF EXISTS trg_inventory_logs_to_kardex ON public.inventory_logs;
CREATE TRIGGER trg_inventory_logs_to_kardex
AFTER INSERT ON public.inventory_logs
FOR EACH ROW
EXECUTE FUNCTION public.insert_kardex_from_inventory_log();

-- Backfill existing inventory_logs into kardex
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
)
SELECT
    p.id AS producto_id,
    CASE WHEN COALESCE(
        l.quantity_change::numeric,
        CASE
            WHEN pg_typeof(l.change)::text = 'jsonb' THEN
                CASE
                    WHEN jsonb_typeof(l.change) IN ('number','string') THEN (l.change #>> '{}')::numeric
                    ELSE NULL
                END
            ELSE l.change::numeric
        END,
        0
    ) >= 0 THEN 'INGRESO' ELSE 'SALIDA' END AS tipo,
    COALESCE(l.reason, l.change_type, l.notes, 'Movimiento') AS concepto,
    abs(COALESCE(
        l.quantity_change::numeric,
        CASE
            WHEN pg_typeof(l.change)::text = 'jsonb' THEN
                CASE
                    WHEN jsonb_typeof(l.change) IN ('number','string') THEN (l.change #>> '{}')::numeric
                    ELSE NULL
                END
            ELSE l.change::numeric
        END,
        0
    )) AS cantidad,
    GREATEST(COALESCE(
        l.previous_stock,
        COALESCE(l.new_stock, p.stock, 0) - COALESCE(
            l.quantity_change::numeric,
            CASE
                WHEN pg_typeof(l.change)::text = 'jsonb' THEN
                    CASE
                        WHEN jsonb_typeof(l.change) IN ('number','string') THEN (l.change #>> '{}')::numeric
                        ELSE NULL
                    END
                ELSE l.change::numeric
            END,
            0
        ),
        COALESCE(l.new_stock, p.stock, 0)
    ), 0) AS stock_anterior,
    GREATEST(COALESCE(l.new_stock, p.stock, 0), 0) AS stock_nuevo,
    CASE
        WHEN l.metadata ? 'cost' AND (l.metadata->>'cost') ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (l.metadata->>'cost')::numeric
        ELSE NULL
    END AS precio_unitario,
    CASE
        WHEN l.metadata ? 'cost' AND (l.metadata->>'cost') ~ '^[0-9]+(\\.[0-9]+)?$'
            THEN (l.metadata->>'cost')::numeric * abs(COALESCE(
                l.quantity_change::numeric,
                CASE
                    WHEN pg_typeof(l.change)::text = 'jsonb' THEN
                        CASE
                            WHEN jsonb_typeof(l.change) IN ('number','string') THEN (l.change #>> '{}')::numeric
                            ELSE NULL
                        END
                    ELSE l.change::numeric
                END,
                0
            ))
        ELSE NULL
    END AS valor_total,
    l.reference_id,
    CASE
        WHEN l.updated_by::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN l.updated_by::uuid
        ELSE NULL
    END AS usuario_id,
    l.notes,
    COALESCE(l.created_at, NOW()) AS created_at
FROM public.inventory_logs l
JOIN public.products p
  ON p.id::text = l.product_id::text
  OR p.firestore_id = l.product_id::text
WHERE COALESCE(
    l.quantity_change::numeric,
    CASE
        WHEN pg_typeof(l.change)::text = 'jsonb' THEN
            CASE
                WHEN jsonb_typeof(l.change) IN ('number','string') THEN (l.change #>> '{}')::numeric
                ELSE NULL
            END
        ELSE l.change::numeric
    END,
    0
) <> 0
  AND NOT EXISTS (
      SELECT 1
      FROM public.kardex k
      WHERE k.producto_id = p.id
        AND k.created_at = COALESCE(l.created_at, NOW())
        AND k.cantidad = abs(COALESCE(
            l.quantity_change::numeric,
            CASE
                WHEN pg_typeof(l.change)::text = 'jsonb' THEN
                    CASE
                        WHEN jsonb_typeof(l.change) IN ('number','string') THEN (l.change #>> '{}')::numeric
                        ELSE NULL
                    END
                ELSE l.change::numeric
            END,
            0
        ))
        AND k.tipo = CASE WHEN COALESCE(
            l.quantity_change::numeric,
            CASE
                WHEN pg_typeof(l.change)::text = 'jsonb' THEN
                    CASE
                        WHEN jsonb_typeof(l.change) IN ('number','string') THEN (l.change #>> '{}')::numeric
                        ELSE NULL
                    END
                ELSE l.change::numeric
            END,
            0
        ) >= 0 THEN 'INGRESO' ELSE 'SALIDA' END
        AND COALESCE(k.referencia, '') = COALESCE(l.reference_id, '')
  );

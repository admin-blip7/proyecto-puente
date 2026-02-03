-- Migración de datos existentes de tablas antiguas a tablas limpias (_new)

-- 1. Función auxiliar para convertir JSON Firestore Timestamp a Timestamptz
CREATE OR REPLACE FUNCTION public.firestore_ts_to_timestamptz(ts jsonb)
RETURNS timestamptz AS $$
BEGIN
    IF ts IS NULL OR ts = 'null'::jsonb THEN
        RETURN NULL;
    END IF;
    -- Si es el formato {_seconds, _nanoseconds}
    IF ts ? '_seconds' THEN
        RETURN to_timestamp((ts->>'_seconds')::numeric) + ((ts->>'_nanoseconds')::numeric / 1000000000) * interval '1 second';
    END IF;
    -- Si ya es una cadena ISO
    BEGIN
        RETURN ts::text::timestamptz;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql;

-- 2. Migrar Cash Sessions
INSERT INTO public.cash_sessions_new (
    id, firestore_id, status, opened_by_name, opened_at, closed_by_name, closed_at,
    starting_float, total_cash_sales, total_card_sales, total_cash_payouts,
    expected_cash_in_drawer, actual_cash_count, difference, is_balanced
)
SELECT 
    gen_random_uuid(), -- Nueva PK
    "sessionId", -- Usamos sessionId como firestore_id para reconciliación
    status,
    "openedByName",
    public.firestore_ts_to_timestamptz("openedAt"),
    "closedByName",
    public.firestore_ts_to_timestamptz("closedAt"),
    COALESCE("startingFloat", 0),
    COALESCE("totalCashSales", 0),
    COALESCE("totalCardSales", 0),
    COALESCE("totalCashPayouts", 0),
    COALESCE("expectedCashInDrawer", 0),
    "actualCashCount",
    difference,
    is_balanced
FROM public.cash_sessions
ON CONFLICT (firestore_id) DO NOTHING;

-- 3. Migrar Ventas
INSERT INTO public.sales_new (
    id, firestore_id, sale_number, total_amount, payment_method, cashier_id, cashier_name,
    customer_name, customer_phone, customer_email, status, amount_paid, change_given,
    discount_amount, created_at, updated_at
)
SELECT 
    id, -- Mantenemos el ID si ya es UUID
    "saleId", -- Usamos saleId como firestore_id
    "saleId",
    COALESCE("totalAmount"::numeric, 0),
    "paymentMethod",
    "cashierId",
    "cashierName",
    "customerName",
    "customerPhone",
    "customerEmail",
    status,
    COALESCE("amount_paid"::numeric, 0),
    COALESCE("change_given"::numeric, 0),
    COALESCE("discount_amount"::numeric, 0),
    COALESCE(created_at, public.firestore_ts_to_timestamptz("createdAt")),
    COALESCE(updated_at, now())
FROM public.sales
ON CONFLICT (firestore_id) DO NOTHING;

-- 4. Migrar Items de Venta (Explosión del array JSON)
INSERT INTO public.sale_items_new (
    sale_id, product_name, quantity, price_at_sale, metadata
)
SELECT 
    s.id,
    item->>'name',
    (item->>'quantity')::integer,
    (item->>'priceAtSale')::numeric,
    item -- Guardamos el item completo como metadata por si acaso
FROM public.sales s,
LATERAL jsonb_array_elements(s.items) AS item
WHERE s.items IS NOT NULL;

-- 5. Migrar Inventory Logs
INSERT INTO public.inventory_logs_new (
    firestore_id, product_name, change, reason, updated_by, created_at, metadata
)
SELECT 
    COALESCE(firestore_id, gen_random_uuid()::text),
    "productName",
    COALESCE(change, 0),
    reason,
    NULL, -- updatedBy en el origen es un string ID de Firebase
    public.firestore_ts_to_timestamptz("createdAt"),
    metadata
FROM public.inventory_logs
ON CONFLICT (firestore_id) DO NOTHING;

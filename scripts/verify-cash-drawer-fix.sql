-- Script para verificar que el fix del corte de caja funciona correctamente
-- Muestra las ventas del día y los totales de la sesión de caja

-- 1. Verificar las ventas de hoy (8 de noviembre de 2025)
\echo '=== VENTAS DE HOY (2025-11-08) ==='
SELECT
  "saleId",
  "totalAmount",
  "paymentMethod",
  "cashierName",
  "sessionId",
  "createdAt"
FROM sales
WHERE "createdAt"::text LIKE '%2025-11-08%'
  AND status = 'completed'
ORDER BY "createdAt" DESC;

-- 2. Verificar la sesión de caja activa más reciente
\echo ''
\echo '=== SESIÓN DE CAJA ACTIVA ==='
SELECT DISTINCT ON ("sessionId")
  "sessionId",
  status,
  "openedByName",
  "startingFloat",
  "totalCashSales",
  "totalCardSales",
  "totalCashPayouts",
  "expectedCashInDrawer",
  "openedAt"
FROM cash_sessions
WHERE status = 'Abierto'
ORDER BY "sessionId", "openedAt" DESC;

-- 3. Calcular totales manualmente para verificar
\echo ''
\echo '=== VERIFICACIÓN MANUAL DE TOTALES ==='
SELECT
  'Efectivo' as metodo_pago,
  COALESCE(SUM("totalAmount"), 0) as total
FROM sales
WHERE "sessionId" = 'CS-7E55BD39'
  AND "paymentMethod" = 'Efectivo'
  AND status = 'completed'
UNION ALL
SELECT
  'Tarjeta' as metodo_pago,
  COALESCE(SUM("totalAmount"), 0) as total
FROM sales
WHERE "sessionId" = 'CS-7E55BD39'
  AND "paymentMethod" = 'Tarjeta'
  AND status = 'completed';

-- 4. Resumen del fix
\echo ''
\echo '=== RESUMEN ==='
\echo '✅ Ventas encontradas para hoy:'
SELECT COUNT(*) as total_ventas
FROM sales
WHERE "createdAt"::text LIKE '%2025-11-08%'
  AND status = 'completed';

\echo '✅ Total en ventas en efectivo del día:'
SELECT COALESCE(SUM("totalAmount"), 0) as total_efectivo
FROM sales
WHERE "createdAt"::text LIKE '%2025-11-08%'
  AND "paymentMethod" = 'Efectivo'
  AND status = 'completed';

\echo '✅ Sesión CS-7E55BD39 muestra en corte de caja:'
SELECT
  "totalCashSales",
  "totalCardSales",
  "expectedCashInDrawer"
FROM cash_sessions
WHERE "sessionId" = 'CS-7E55BD39'
LIMIT 1;

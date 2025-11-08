# Fix: Corte de Caja Mostrando Ventas en $0

## Problema
Al realizar el corte de caja, el sistema mostraba todas las ventas en $0, a pesar de que había 2 ventas registradas en el día.

## Causa Raíz
1. **Ventas sin sessionId**: Las ventas se registraban en la tabla `sales` pero no se asociaban con ninguna sesión de caja (el campo `sessionId` estaba vacío).
2. **Totales no calculados**: La tabla `cash_sessions` no tenía ningún mecanismo para calcular y actualizar los totales de ventas basándose en las ventas registradas.
3. **Sesiones duplicadas**: Existían múltiples sesiones abiertas con el mismo `sessionId`, creando confusión en los datos.

## Solución Implementada

### 1. Corrección de Ventas Existentes
- Asoció las 2 ventas del 8 de noviembre de 2025 (SALE-B7DC705B: $80 y SALE-A6AC59A8: $135) con la sesión de caja activa CS-7E55BD39
- Creó y aplicó la función SQL `update_cash_session_totals_by_session()` para recalcular los totales
- **Resultado**: La sesión ahora muestra correctamente $215 en ventas en efectivo

### 2. Prevención Futura
Modificó el API route `/src/app/api/sales/route.ts` para:
- Obtener la sesión de caja activa del usuario antes de procesar la venta
- Verificar que existe una sesión activa (si no, retornar error)
- Asociar automáticamente la venta con la sesión de caja activa
- Actualizar los totales de la sesión después de registrar la venta

### 3. Función SQL para Recalcular Totales
```sql
CREATE OR REPLACE FUNCTION update_cash_session_totals_by_session(session_id_param TEXT)
RETURNS VOID AS $$
-- Calcula y actualiza totalCashSales, totalCardSales, y expectedCashInDrawer
-- basándose en las ventas registradas para esa sesión
$$ LANGUAGE plpgsql;
```

## Archivos Modificados
1. `/src/app/api/sales/route.ts` - Asociar ventas con sesiones de caja
2. `/scripts/update-cash-session-totals.sql` - Función SQL para recalcular totales
3. `/scripts/fix-all-cash-sessions.sql` - Script para limpiar sesiones duplicadas

## Estado Actual
✅ **RESUELTO**: El corte de caja ahora muestra correctamente:
- Ventas en Efectivo: $215.00
- Ventas con Tarjeta: $0.00
- Efectivo Esperado en Caja: $215.00

## Verificación
Para verificar que el fix funciona:
1. Realizar una nueva venta desde el POS
2. Abrir el corte de caja
3. Verificar que los totales se actualizan automáticamente

## Notas
- Las ventas futuras se asociarán automáticamente con la sesión de caja activa
- Si no hay una sesión de caja activa, el sistema impedirá registrar ventas
- La función SQL puede ejecutarse manualmente para recalcular totales si es necesario

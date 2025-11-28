# Solución: Totales en $0.00 en Corte de Caja

## Problema Identificado

Los totales de la sesión de caja (ventas en efectivo, tarjeta, etc.) aparecen en $0.00 a pesar de tener ventas registradas.

**Causa raíz**: La función SQL `update_cash_session_totals_by_session` estaba buscando el método de pago como `'Tarjeta'` pero el sistema usa `'Tarjeta de Crédito'`. Además, la función solo buscaba ventas con `status = 'completed'` pero algunas ventas tienen `status IS NULL`.

## Solución Aplicada

Se corrigió el archivo [update-cash-session-totals.sql](file:///Users/brayan/Documents/proyecto-puente-firebase/scripts/update-cash-session-totals.sql) con los siguientes cambios:

### Cambios Realizados

1. **Método de pago de tarjeta**: Cambiado de `payment_method = 'Tarjeta'` a:
   ```sql
   (payment_method = 'Tarjeta de Crédito' OR payment_method = 'Tarjeta')
   ```

2. **Status flexible**: Cambi ado de `status = 'completed'` a:
   ```sql
   (status = 'completed' OR status IS NULL)
   ```

Estos cambios se aplicaron en **ambas funciones** del script:
- `update_cash_session_totals(p_session_id TEXT)`
- `update_cash_session_totals_by_session(session_id_param TEXT)` ← **Esta es la que usa el sistema**

## Instrucciones de Despliegue

### Opción 1: Desplegar via Supabase Dashboard (MÁS FÁCIL)

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/gapocwtsbwtmpmffkmrk
2. En el menú lateral, haz clic en **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido completo del archivo [update-cash-session-totals.sql](file:///Users/brayan/Documents/proyecto-puente-firebase/scripts/update-cash-session-totals.sql)
5. Haz clic en **Run** (o presiona Ctrl+Enter / Cmd+Enter)
6. Deberías ver un mensaje de éxito

### Opción 2: Desplegar via CLI

```bash
# Desde el directorio del proyecto
psql $DATABASE_URL < scripts/update-cash-session-totals.sql
```

## Verificación de la Solución

### Paso 1: Verificar que la función fue desplegada

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que la función existe
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%cash_session_totals%'
  AND routine_schema = 'public';
```

Deberías ver las dos funciones listadas.

### Paso 2: Actualizar totales de sesión activa

Si ya tienes una sesión de caja abierta con ventas, ejecuta esto para recalcular los totales:

```sql
-- Primero, encuentra el ID de tu sesión activa
SELECT firestore_id, session_id, status, total_cash_sales, total_card_sales
FROM cash_sessions
WHERE status = 'Abierto'
ORDER BY opened_at DESC
LIMIT 5;

-- Luego, actualiza los totales usando el firestore_id que encontraste
-- Reemplaza 'TU_FIRESTORE_ID_AQUI' con el valor real
SELECT update_cash_session_totals_by_session('TU_FIRESTORE_ID_AQUI');

-- Verifica que los totales se actualizaron
SELECT firestore_id, session_id, total_cash_sales, total_card_sales, expected_cash_in_drawer
FROM cash_sessions
WHERE firestore_id = 'TU_FIRESTORE_ID_AQUI';
```

### Paso 3: Probar con una nueva venta

1. Desde el POS, realiza una venta de prueba
2. Al completar la venta, verifica los logs del navegador (F12 → Console)
3. Deberías ver:
   ```
   Session {session_id} totals updated successfully
   ```
4. Intenta cerrar el turno y verifica que ahora los totales aparecen correctamente

## Explicación Técnica

Cuando se procesa una venta en el POS:

1. **CheckoutDialog** llama a `/api/sales/route.ts`
2. El API procesa la venta y la guarda en la tabla `sales`
3. Luego llama a `update_cash_session_totals_by_session()`
4. Esta función SQL:
   - Lee todas las ventas asociadas a la sesión
   - Suma las ventas en efectivo
   - Suma las ventas con tarjeta
   - Actualiza los campos `total_cash_sales` y `total_card_sales` en `cash_sessions`
   - Recalcula `expected_cash_in_drawer`

El problema era que la función no encontraba las ventas con tarjeta porque buscaba 'Tarjeta' pero el sistema usa 'Tarjeta de Crédito'.

## Próximos Pasos

Una vez desplegada la función corregida:
1. Realiza una venta de prueba
2. Intenta cerrar el turno
3. Verifica que los totales ahora aparecen correctamente
4. Si todavía hay problemas, verifica los logs del navegador y comparte el mensaje de error

## Notas Importantes

> [!WARNING]
> Si tienes sesiones de caja ya cerradas con totales en $0.00, puedes recalcular sus totales ejecutando la función SQL para cada sesión (usa el query del Paso 2 arriba).

> [!NOTE]
> A partir de ahora, todas las ventas nuevas actualizarán correctamente los totales de la sesión de caja automáticamente.

# 🚨 SOLUCIÓN URGENTE: Totales en $0.00 - Problema de Nombres de Columnas

## Problema Raíz Identificado

**DOS problemas críticos encontrados**:

1. ❌ **Las ventas NO tienen `sessionId` asignado**
   - Output del diagnóstico muestra "SessionID: NO ASIGNADO" para TODAS las ventas
   - Esto significa que el código en `/api/sales/route.ts` NO está asignando correctamente el sessionId

2. ❌ **La función SQL usa nombres de columnas INCORRECTOS**
   - La BD usa **camelCase**: `sessionId`, `totalAmount`, `paymentMethod`, `createdAt`
   - La función SQL usaba **snake_case**: `session_id`, `total_amount`, `payment_method`, `created_at`
   - Por eso la función falla con error: `column "total_amount" does not exist`

## Solución en 2 Pasos

### PASO 1: Actualizar la Función SQL

He  creado un nuevo archivo con la función corregida:
📄 [update-cash-session-totals-FIXED.sql](file:///Users/brayan/Documents/proyecto-puente-firebase/scripts/update-cash-session-totals-FIXED.sql)

**Debes ejecutar este script en Supabase SQL Editor**:

1. Ve a: https://supabase.com/dashboard/project/gapocwtsbwtmpmffkmrk/sql
2. Copia y pega el contenido del archivo `update-cash-session-totals-FIXED.sql`
3. Click en **Run**

### PASO 2: Verificar el Código de Ventas

El código en `src/app/api/sales/route.ts` (líneas 94-97) debe asignar el sessionId así:

```typescript
const { error: updateError } = await supabase
  .from("sales")
  .update({ sessionId: activeSession.sessionId })  // ← DEBE ser "sessionId" (camelCase)
  .eq("id", result.id);
```

**Verificar que en la línea 96 dice `sessionId` y NO `session_id`**

## Diagnóstico Actual

Basado en el script de diagnóstico, tu estado actual es:

✅ Tienes 2 sesiones activas  
❌ Las 5 ventas recientes NO tienen sessionId asignado  
❌ La función SQL no puede calcular porque usa nombres de columnas incorrectos

### Ejemplo de venta sin sessionId:
```
Venta: SALE-49EAF177
Total: $2800
Método: Efectivo
SessionID: NO ASIGNADO  ← 🚨 PROBLEMA
Status: completed
```

## Instrucciones de Verificación

### 1. Después de ejecutar el script SQL FIXED

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que la función ahora funciona (usa tu firestore_id real)
SELECT update_cash_session_totals_by_session('295e45e5-18d9-4856-91a9-90313c2e809a');
```

### 2. Verificar el código de ventas

Revisa el archivo:
```
file:///Users/brayan/Documents/proyecto-puente-firebase/src/app/api/sales/route.ts
```

Línea 96 debe ser:
```typescript
.update({ sessionId: activeSession.sessionId })
```

### 3. Hacer una venta de prueba

1. Realiza una venta pequeña desde el POS
2. Ejecuta el script de diagnóstico:
   ```bash
   DOTENV_CONFIG_PATH=.env.local node --env-file=.env.local diagnose-cash-session.mjs
   ```
3. Ver if ahora la venta tiene SessionID asignado

### 4. Recalcular totales de ventas existentes

Si las ventas antiguas tienen sessionId pero los totales no se calcularon, ejecuta:

```sql
-- Ver cuál sesión tiene ventas
SELECT sessionId, COUNT(*), SUM("totalAmount") 
FROM sales 
WHERE "sessionId" IS NOT NULL
GROUP BY "sessionId";

-- Si encuentras un sessionId, obtén el firestore_id
SELECT firestore_id, sessionId FROM cash_sessions WHERE sessionId = 'TU_SESSION_ID_AQUI';

-- Luego recalcula
SELECT update_cash_session_totals_by_session('EL_FIRESTORE_ID_AQUI');
```

## ¿Por Qué Pasó Esto?

Supabase por defecto crea columnas en **camelCase** cuando se insertan datos desde JavaScript, pero PostgeSQL normalmente usa **snake_case**. El mismatch causó que la función SQL no pudiera leer las columnas correctamente.

## Próximos Pasos

1. ✅ Ejecutar `update-cash-session-totals-FIXED.sql` en Supabase
2. ✅ Verificar que `/api/sales/route.ts` usa `sessionId` (camelCase)
3. ✅ Hacer una venta de prueba
4. ✅ Ejecutar script de diagnóstico para verificar

Una vez completados estos pasos, los totales deberían actualizarse correctamente.

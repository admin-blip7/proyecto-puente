# Solución: Separación del Dinero de Cambio de las Ventas

## Problema Identificado

El sistema estaba mezclando el dinero dejado para el siguiente turno (dinero de cambio) con los ingresos operativos, lo que causaba confusión en los reportes financieros.

### Síntomas
- Los depósitos de "Bolsa de Saldo" aparecían en la tabla `incomes` con la categoría "Corte de Caja"
- Los ingresos de "Corte de Caja" y "Bolsa de Saldo" se contaban como "Otros Ingresos" en el tablero financiero
- No había una distinción clara entre:
  - **Efectivo Operativo**: Dinero proveniente de ventas que se deposita en cuentas bancarias
  - **Dinero de Cambio**: Dinero reservado en la caja para el siguiente turno (bolsa de saldo)

### Causa Raíz

En [`closeCashSession()`](src/lib/services/cashSessionService.ts:273), al cerrar una sesión de caja:

1. Se calcula el dinero a dejar para el siguiente turno: `cashLeftForNextSession`
2. Se hace un depósito en la cuenta de bolsa de saldo con el monto `balanceBagAmount`
3. Se hace un depósito en la cuenta operativa con el monto `amountToDeposit`

Ambos depósitos usaban la misma función [`depositToAccount()`](src/lib/services/cashSessionService.ts:546), que hardcodeaba la categoría como "Corte de Caja":

```typescript
await addIncome({
  description: `Depósito de Corte de Caja (Sesión: ${sessionId}) ${notes ? `- ${notes}` : ''}`,
  category: "Corte de Caja",  // ← PROBLEMA: Siempre usa "Corte de Caja"
  amount: depositAmount,
  destinationAccountId: targetAccountId,
  source: "Caja",
  sessionId: sessionId
});
```

## Solución Implementada

### 1. Modificación de la función `depositToAccount()`

**Archivo**: [`src/lib/services/cashSessionService.ts`](src/lib/services/cashSessionService.ts:546)

Se agregó un parámetro opcional `category` a la función para permitir categorías personalizadas:

```typescript
export const depositToAccount = async (
  sessionId: string,
  accountId: string,
  depositAmount: number,
  notes?: string,
  category?: string  // ← NUEVO: Parámetro opcional para categoría personalizada
): Promise<void> => {
  // ...
  await addIncome({
    description: `Depósito de Corte de Caja (Sesión: ${sessionId}) ${notes ? `- ${notes}` : ''}`,
    category: category || "Corte de Caja",  // ← CORRECCIÓN: Usa categoría personalizada o "Corte de Caja" por defecto
    amount: depositAmount,
    destinationAccountId: targetAccountId,
    source: "Caja",
    sessionId: sessionId
  });
};
```

### 2. Uso de categoría "Bolsa de Saldo" para depósitos de bolsa de saldo

**Archivo**: [`src/lib/services/cashSessionService.ts`](src/lib/services/cashSessionService.ts:429)

Al depositar en la cuenta de bolsa de saldo, ahora se usa la categoría "Bolsa de Saldo":

```typescript
// 6. Deposit to Balance Bag Account (if enabled and has amount)
if (activeBalanceBagAccountId && balanceBagAmount > 0) {
  console.log(`[closeCashSession] Depositing ${balanceBagAmount} to balance bag account ${activeBalanceBagAccountId}...`);
  try {
    // Deposit to balance bag account - this is a transfer of cash to a designated account
    // CRITICAL FIX: Use "Bolsa de Saldo" category to separate from operational cash deposits
    await depositToAccount(
      session.sessionId,
      activeBalanceBagAccountId,
      balanceBagAmount,
      "Bolsa de Saldo - Efectivo Reservado para Siguiente Turno",
      "Bolsa de Saldo" // ← CORRECCIÓN: Categoría distinta para depósitos de bolsa de saldo
    );
    console.log(`[closeCashSession] Balance bag deposit successful.`);
  } catch (balanceBagError) {
    console.error(`[closeCashSession] Balance bag deposit failed:`, balanceBagError);
    log.error("Error depositing to balance bag account during session close", balanceBagError);
  }
}
```

### 3. Filtro actualizado en el tablero financiero

**Archivo**: [`src/components/admin/finance/cash-history/CashHistoryClient.tsx`](src/components/admin/finance/cash-history/CashHistoryClient.tsx:82)

Se actualizó el filtro para excluir tanto "Corte de Caja" como "Bolsa de Saldo" de los "Otros Ingresos":

```typescript
// Filter out "Corte de Caja" and "Bolsa de Saldo" from Incomes to prevent double counting
// These are just transfers of sales money and balance bag deposits, not new income.
const filteredIncomes = incomesData.filter((inc: any) =>
  inc.category !== 'Corte de Caja' &&
  inc.category !== 'Bolsa de Saldo' &&  // ← NUEVO: También filtra "Bolsa de Saldo"
  !inc.description?.toLowerCase().includes('depósito de corte de caja') &&
  !inc.description?.toLowerCase().includes('bolsa de saldo')  // ← NUEVO: Filtra por descripción
);

setIncomes(filteredIncomes);
```

### 4. Migración de base de datos

**Archivo**: [`supabase/migrations/20260203_add_balance_bag_income_category.sql`](supabase/migrations/20260203_add_balance_bag_income_category.sql)

Se agregó la categoría "Bolsa de Saldo" a la tabla `income_categories`:

```sql
INSERT INTO public.income_categories (firestore_id, name, "isActive") VALUES
(
    uuid_generate_v4()::text,
    'Bolsa de Saldo',
    true
)
ON CONFLICT (firestore_id) DO NOTHING;
```

## Impacto de la Solución

### Antes
```
┌─────────────────────────────────────────────┐
│  Tablero Financiero                │
├─────────────────────────────────────────────┤
│  Ventas Totales:      $10,000    │
│  Otros Ingresos:      $12,500    │  ← INCORRECTO: Incluye bolsa de saldo + operativo
└─────────────────────────────────────────────┘

Detalle de Incomes:
- Corte de Caja: $10,000  ← ¿Es operativo o bolsa de saldo?
- Corte de Caja: $2,500   ← ¿Es operativo o bolsa de saldo?
```

### Después
```
┌─────────────────────────────────────────────┐
│  Tablero Financiero                │
├─────────────────────────────────────────────┤
│  Ventas Totales:      $10,000    │
│  Otros Ingresos:      $7,500     │  ← CORRECTO: Solo incluye ingresos operativos
└─────────────────────────────────────────────┘

Detalle de Incomes:
- Corte de Caja: $7,500  ← Claramente operativo
- Bolsa de Saldo: $2,500   ← Claramente dinero de cambio
```

## Flujo de Datos Corregido

### Cierre de Sesión de Caja

```
actualCashCount: $12,500
cashLeftForNextSession: $2,500

┌──────────────────────────────────────────────────────────┐
│  Balance Bag Amount (Dinero de Cambio): $2,500      │
│  → Depósito con categoría "Bolsa de Saldo"          │
├──────────────────────────────────────────────────────────┤
│  Deposit Amount (Efectivo Operativo): $10,000        │
│  → Depósito con categoría "Corte de Caja"            │
└──────────────────────────────────────────────────────────┘
```

### Tablero Financiero

```
┌──────────────────────────────────────────────────────────┐
│  Filtro de Incomes:                                │
│  - Excluir "Corte de Caja" ✓                    │
│  - Excluir "Bolsa de Saldo" ✓                    │
│  - Excluir descripciones con "depósito de corte..." ✓  │
│  - Excluir descripciones con "bolsa de saldo" ✓     │
└──────────────────────────────────────────────────────────┘

→ totalIncomes: Solo ingresos reales (NO incluye depósitos de caja)
```

## Pasos para Aplicar la Solución

### 1. Ejecutar la migración de base de datos

```bash
# Aplicar la migración en Supabase
supabase db push --db-url $DATABASE_URL
```

O desde el dashboard de Supabase:
- Ir a SQL Editor
- Ejecutar el contenido de [`supabase/migrations/20260203_add_balance_bag_income_category.sql`](supabase/migrations/20260203_add_balance_bag_income_category.sql)

### 2. Verificar que los archivos modificados estén correctos

Los siguientes archivos ya han sido modificados:
- [`src/lib/services/cashSessionService.ts`](src/lib/services/cashSessionService.ts)
- [`src/components/admin/finance/cash-history/CashHistoryClient.tsx`](src/components/admin/finance/cash-history/CashHistoryClient.tsx)

### 3. Probar el flujo completo

1. Abrir una nueva sesión de caja
2. Realizar ventas en efectivo
3. Cerrar la sesión indicando:
   - Monto total en caja
   - Monto a dejar para el siguiente turno (dinero de cambio)
   - Cuenta de bolsa de saldo seleccionada
4. Verificar que:
   - El depósito de bolsa de saldo tenga categoría "Bolsa de Saldo"
   - El depósito operativo tenga categoría "Corte de Caja"
   - El tablero financiero NO incluya los depósitos de bolsa de saldo en "Otros Ingresos"

## Beneficios de la Solución

### Claridad en Reportes
- Los ingresos operativos y el dinero de cambio ahora están claramente separados
- Los reportes financieros reflejan correctamente solo los ingresos verdaderos
- El historial de transacciones muestra claramente la naturaleza de cada movimiento

### Prevención de Errores
- Elimina la confusión entre dinero operativo y dinero reservado
- Facilita la auditoría y reconciliación de cuentas
- Permite un seguimiento más preciso del flujo de caja

### Mantenibilidad
- La solución usa categorías existentes en lugar de crear nuevas tablas
- La migración es simple y no afecta la estructura existente
- El cambio es compatible con el código existente

## Resumen

| Aspecto | Antes | Después |
|----------|---------|----------|
| Categoría de depósito de bolsa de saldo | "Corte de Caja" | "Bolsa de Saldo" |
| Filtro en tablero financiero | Solo "Corte de Caja" | "Corte de Caja" + "Bolsa de Saldo" |
| Claridad en reportes | Confuso (mezcla de tipos de dinero) | Claro (separación explícita) |
| Trazabilidad | Difícil de identificar tipo de dinero | Fácil (categorías distintivas) |

---

**Fecha de implementación**: 3 de febrero de 2026
**Archivos modificados**: 3
**Líneas de código modificadas**: ~15
**Nueva categoría agregada**: 1

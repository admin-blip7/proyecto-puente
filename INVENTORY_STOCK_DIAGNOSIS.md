# Diagnóstico de Inconsistencia de Inventario - Productos de Socios

## Fecha de Diagnóstico
2026-02-21

## Resumen Ejecutivo

Se ha detectado una **desincronización crítica** entre el stock registrado en la tabla `products.stock` y los movimientos registrados en el Kardex. Esto afecta a **178 productos** del inventario.

## Síntoma Reportado

El stock actual de los "productos de socios" (productos en consignación) muestra un valor de **0** a pesar de que la mercancía fue ingresada y los movimientos de entrada se registran correctamente en el Kardex.

## Análisis Técnico

### 1. Arquitectura de Datos

El sistema utiliza múltiples fuentes para el stock:

| Componente | Tipo | Descripción |
|------------|------|-------------|
| `products.stock` | Columna (tabla) | **Fuente principal** - Stock actual del producto |
| `kardex` | Tabla | Registro de movimientos (INGRESO/SALIDA) |
| `stock_actual` | Vista | Vista derivada del último `stock_nuevo` en kardex |
| `branch_stock` | Tabla | Stock de socios por sucursal |

### 2. Definición de la Vista `stock_actual`

```sql
SELECT DISTINCT ON (producto_id) 
    producto_id,
    stock_nuevo AS stock_actual,
    created_at AS ultima_actualizacion
FROM kardex
ORDER BY producto_id, created_at DESC;
```

**Problema**: Esta vista solo lee de `kardex`, NO actualiza `products.stock`.

### 3. Hallazgos de la Investigación

#### Magnitud del Problema
```
Total de productos desincronizados: 178
├── Productos con stock=0 en products pero kardex tiene stock: 48
├── Productos con más stock en tabla que en kardex: 17
└── Productos con menos stock en tabla que en kardex: 111
```

#### Ejemplos Específicos (Productos de Socios)

| Producto | SKU | products.stock | kardex.stock_actual | Consignador |
|----------|-----|----------------|---------------------|-------------|
| Redmi A3 | 918461 | 3 | 5 | Tecnología Del Itsmo |
| Redmi a5 | 363561 | **0** | **1** | Tecnología Del Itsmo |
| ZtE A54 | 552283 | **0** | **1** | Tecnología Del Itsmo |
| ZTE blade A35 | 630324 | 5 | 5 | Tecnología Del Itsmo |

## Causas Raíz Identificadas

### 1. **Falta de Trigger de Sincronización** ⚠️ CRÍTICO

**No existe un trigger** en la tabla `kardex` que actualice automáticamente `products.stock` cuando se registra un movimiento.

```sql
-- Triggers existentes en products:
-- ✓ products_audit_trigger - Para logging
-- ✓ update_products_updated_at - Para timestamp

-- Triggers existentes en kardex:
-- ❌ NINGUNO - No hay trigger que sincronice con products.stock
```

### 2. **Lógica de Aplicación Inconsistente**

En [`productService.ts`](src/lib/services/productService.ts):

- **`processStockEntry()`**: Actualiza `products.stock` Y registra en kardex ✅
- **`registerKardexMovement()`** (en kardexService): SOLO inserta en kardex, NO actualiza `products.stock` ❌

```typescript
// kardexService.ts línea 115-119
const { data, error } = await supabase
  .from(KARDEX_TABLE)
  .insert(payload)
  .select("*")
  .maybeSingle();
// ❌ NO actualiza products.stock
```

### 3. **Problemas de Tipos de Datos**

| Tabla | Columna | Tipo |
|-------|---------|------|
| products | id | TEXT |
| kardex | producto_id | TEXT |
| inventory_logs | product_id | UUID |
| sale_items | product_id | UUID |
| branch_stock | product_id | TEXT |

La inconsistencia entre TEXT y UUID puede causar problemas en joins y requiere casts explícitos.

### 4. **Transacciones No Atómicas**

El flujo de actualización de stock no es atómico:

```
1. Actualizar products.stock ← Puede fallar independientemente
2. Registrar en kardex ← Puede fallar independientemente
3. Actualizar branch_stock ← Puede fallar independientemente
```

Si cualquiera falla, los datos quedan inconsistentes.

### 5. **Ventana de Caché/Visualización**

El sistema muestra `products.stock` en el POS, NO la vista `stock_actual`. Si `products.stock` no se actualiza, el usuario ve 0 aunque el kardex tenga el movimiento correcto.

## Flujo del Problema

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INGRESO DE MERCANCÍA                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Usuario ingresa producto → processStockEntry()                  │
│                                                                     │
│  2. ┌─────────────────────────────────────────────────────────┐    │
│     │ SE ACTUALIZA products.stock ✅                           │    │
│     │ UPDATE products SET stock = stock + cantidad             │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│  3. ┌─────────────────────────────────────────────────────────┐    │
│     │ SE REGISTRA EN KARDEX ✅                                 │    │
│     │ INSERT INTO kardex (stock_nuevo = stock_actual)          │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    VENTA DE PRODUCTO                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Usuario vende producto → salesService.createSale()              │
│                                                                     │
│  2. ┌─────────────────────────────────────────────────────────┐    │
│     │ SE ACTUALIZA products.stock ✅                           │    │
│     │ UPDATE products SET stock = stock - cantidad             │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│  3. ┌─────────────────────────────────────────────────────────┐    │
│     │ SE REGISTRA EN KARDEX (con try-catch silencioso) ⚠️      │    │
│     │ Si falla, products.stock quedó actualizado               │    │
│     │ pero kardex no tiene el registro                         │    │
│     └─────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    ESCENARIO DE DESINCRONIZACIÓN                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CAUSA 1: Venta registra kardex pero update de stock falla          │
│  → kardex muestra stock correcto, products.stock desactualizado     │
│                                                                     │
│  CAUSA 2: rollback parcial de transacción                           │
│  → Una operación se revierte, la otra no                            │
│                                                                     │
│  CAUSA 3: Edición manual directa en BD                              │
│  → Actualizan products.stock sin registrar kardex                   │
│                                                                     │
│  CAUSA 4: Error de red/timeout durante la transacción               │
│  → El commit de una tabla funciona, el otro no                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Solución Propuesta

### Paso 1: Sincronización Inmediata (Script SQL)

Ejecutar script para alinear `products.stock` con el último estado del kardex:

```sql
-- Ver INVENTORY_STOCK_FIX.sql
```

### Paso 2: Implementación de Trigger (Prevención)

Crear trigger que mantenga la sincronización automática:

```sql
CREATE TRIGGER sync_product_stock_from_kardex
AFTER INSERT ON kardex
FOR EACH ROW
EXECUTE FUNCTION update_product_stock_from_kardex();
```

### Paso 3: Transacciones Atómicas

Modificar el código de la aplicación para usar transacciones PostgreSQL nativas:

```typescript
// Usar RPC de Supabase para operaciones atómicas
await supabase.rpc('process_stock_movement_atomic', {
  p_product_id: productId,
  p_quantity: quantity,
  p_type: 'INGRESO',
  p_concepto: 'Ingreso de mercancía'
});
```

### Paso 4: Verificación Post-Fix

```sql
-- Verificar que no haya diferencias
SELECT COUNT(*) FROM products p
LEFT JOIN stock_actual sa ON p.id = sa.producto_id
WHERE p.stock != COALESCE(sa.stock_actual, 0);
-- Debe retornar 0
```

## Recomendaciones

1. **Inmediato**: Ejecutar script de sincronización
2. **Corto plazo**: Implementar trigger de sincronización
3. **Mediano plazo**: Refactorizar a transacciones atómicas con RPC
4. **Largo plazo**: Unificar tipos de datos (TEXT vs UUID)

## Archivos Relacionados

- [`src/lib/services/kardexService.ts`](src/lib/services/kardexService.ts) - Servicio de Kardex
- [`src/lib/services/productService.ts`](src/lib/services/productService.ts) - Servicio de Productos
- [`src/lib/services/salesService.ts`](src/lib/services/salesService.ts) - Servicio de Ventas
- [`src/lib/services/branchService.ts`](src/lib/services/branchService.ts) - Servicio de Stock por Sucursal

## Próximos Pasos

1. Revisar y aprobar el script `INVENTORY_STOCK_FIX.sql`
2. Ejecutar en ambiente de prueba
3. Validar resultados
4. Ejecutar en producción
5. Implementar trigger preventivo

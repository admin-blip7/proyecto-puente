# Auditoría del Sistema de Inventario (Kardex) - Supabase

**Fecha de auditoría:** 2026-02-15  
**Proyecto:** admin-blip7's Project (ID: aaftjwktzpnyjwklroww)  
**Realizado por:** Kilo Code (Agente de Auditoría)

---

## Resumen Ejecutivo

Se ha identificado el **problema principal**: Las salidas de productos (ventas) no se están registrando correctamente en el sistema de kardex. Las últimas ventas registradas como SALIDA en la tabla `kardex` fueron del **2026-01-24**, mientras que existen ventas desde el **2026-02-12 hasta 2026-02-15** que NO tienen su correspondiente registro de SALIDA en kardex.

---

## 1. Estado Actual de la Tabla de Movimientos de Inventario (Kardex)

### 1.1 Registros encontrados
- **Total de registros en kardex:** ~50 registros
- **Registros de tipo INGRESO:** La mayoría (creación de productos e ingresos de mercancía)
- **Registros de tipo SALIDA:** Solo 15 registros aproximadamente
- **Último registro de SALIDA:** 2026-01-24 (hace 22 días)
- **Último registro de INGRESO:** 2026-02-11 (hace 4 días)

### 1.2 Consulta SQL ejecutada
```sql
SELECT id, producto_id, tipo, concepto, cantidad, stock_anterior, stock_nuevo, 
       precio_unitario, valor_total, referencia, usuario_id, notas, created_at
FROM kardex
ORDER BY created_at DESC
LIMIT 50;
```

### 1.3 Hallazgos
- ✅ Los registros tienen timestamps correctos
- ✅ No hay registros marcados como eliminados o inactivos (no existen columnas para esto)
- ⚠️ Hay algunos registros con `producto_id` NULL (2 registros)
- ✅ Los registros de SALIDA existentes tienen `referencia` con el ID de la venta (ej: "SALE-0A951DDD")

---

## 2. Disparadores (Triggers) y Funciones

### 2.1 Triggers encontrados

| Trigger | Tabla | Evento | Función | Estado |
|---------|-------|--------|---------|--------|
| `trg_inventory_logs_to_kardex` | inventory_logs | INSERT | insert_kardex_from_inventory_log() | ✅ Activo |

### 2.2 Funciones encontradas

| Función | Tipo | Descripción |
|---------|------|-------------|
| `insert_kardex_from_inventory_log` | Trigger | Crea registros en kardex desde inventory_logs |
| `add_product_stock` | Función | Agrega stock a productos |

### 2.3 Análisis de la función `insert_kardex_from_inventory_log`

La función actual:
1. Busca el producto en la tabla `products` usando `id` o `firestore_id`
2. Si no encuentra el producto, retorna sin hacer nada
3. Calcula el tipo (INGRESO o SALIDA) basado en el signo del cambio
4. Inserta el registro en `kardex` si no existe un duplicado

### 2.4 ❌ PROBLEMA IDENTIFICADO: No hay trigger en la tabla `sales`

**No existe un trigger en la tabla `sales` que genere automáticamente:**
- Registros en `inventory_logs` O
- Registros directos en `kardex`

Esto significa que cuando se Procesa una venta:
1. Se crea el registro en `sales` ✅
2. Se crean los registros en `sale_items` ✅
3. **NO se genera ningún registro en `kardex`** ❌

---

## 3. Políticas de Row Level Security (RLS)

### 3.1 Estado de RLS por tabla

| Tabla | RLS Habilitado | Políticas |
|-------|----------------|-----------|
| `kardex` | ❌ NO | N/A |
| `inventory_logs` | ❌ NO | N/A |
| `inventory_movements` | ✅ SÍ | "Enable all access for all users" |
| `products` | ✅ SÍ | SELECT: todos, INSERT/UPDATE/DELETE: solo autenticados |
| `sales` | ❌ NO | N/A |
| `sale_items` | ❌ NO | N/A |

### 3.2 Análisis
- Las tablas principales **NO tienen RLS habilitado**, por lo que no hay restricciones de acceso
- Esto **NO es la causa** del problema de registro de salidas

---

## 4. Logs de Supabase

### 4.1 Logs revisados
- **PostgreSQL:** Solo muestra conexiones normales, sin errores
- **API:** Sin errores recientes

### 4.2 Conclusión
- **No hay errores** en los logs que indiquen fallos durante el procesamiento de ventas
- El problema no es un error de ejecución, sino **ausencia de lógica**

---

## 5. Consultas de Integridad Referencial

### 5.1 Verificación de registros huérfanos en kardex
```sql
SELECT k.id, k.producto_id, k.tipo, k.concepto, k.created_at
FROM kardex k
WHERE k.producto_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id::text = k.producto_id 
       OR p.uuid_id::text = k.producto_id
  )
```
**Resultado:** ✅ Sin registros huérfanos

### 5.2 Ventas sin registro de SALIDA en kardex
```sql
SELECT s.id as sale_id, s.sale_number, s.created_at as sale_date,
       si.product_id, si.product_name, si.quantity
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
WHERE s.created_at >= '2026-02-01'
  AND NOT EXISTS (
    SELECT 1 FROM kardex k 
    WHERE k.referencia = s.sale_number
      AND k.tipo = 'SALIDA'
  )
```

**Resultado:** ❌ **20+ ventas SIN registro de SALIDA** (todas las ventas desde 2026-02-12)

### 5.3 Estado de inventory_logs
- La tabla tiene registros, pero la mayoría tiene:
  - `product_id` = NULL
  - `created_at` = NULL
- Estos registros no pueden generar kardex porque la función requiere `product_id`

---

## 6. Diagnóstico Final

### Causa Raíz
**No existe un mecanismo automático para registrar las SALIDAS de inventario cuando se procesa una venta.**

El sistema actual:
1. ✅ Registra ventas en `sales`
2. ✅ Registra items en `sale_items`  
3. ❌ **NO genera registro de SALIDA en `kardex`**

### Flujo esperado vs. Actual

| Paso | Flujo Esperado | Flujo Actual |
|------|----------------|--------------|
| 1 | Se procesa una venta | ✅ Se procesa |
| 2 | Se deduce stock del producto | ✅ Se deduce |
| 3 | Se crea registro en `inventory_logs` | ❌ NO se crea |
| 4 | Trigger crea registro en `kardex` | ❌ NO se crea |

### Impacto
- **20+ ventas** desde el 2026-02-12 no tienen registro de SALIDA
- El kardex muestra un estado de inventario incorrecto
- No hay trazabilidad completa de movimientos

---

## 7. Recomendaciones

### 7.1 Solución Inmediata (Opción A - Recomendada)

**Crear un trigger en la tabla `sales` que genere registros de SALIDA en `kardex`:**

```sql
-- Crear función para generar salida de kardex desde venta
CREATE OR REPLACE FUNCTION public.generate_kardex_from_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesamos ventas completadas
  IF NEW.status = 'completed' THEN
    -- Insertar registro de SALIDA para cada item
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
      si.product_id,
      'SALIDA'::varchar,
      'sale'::varchar,
      si.quantity,
      COALESCE(
        (SELECT p.stock FROM products p WHERE p.id = si.product_id) + si.quantity,
        si.quantity
      ),
      COALESCE(
        (SELECT p.stock FROM products p WHERE p.id = si.product_id),
        0
      ),
      si.price_at_sale,
      si.price_at_sale * si.quantity,
      NEW.sale_number,
      NEW.user_id,
      'Venta: ' || si.product_name || ' x' || si.quantity,
      NEW.created_at
    FROM sale_items si
    WHERE si.sale_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trg_sales_to_kardex
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_kardex_from_sale();
```

### 7.2 Solución Alternativa (Opción B)

**Modificar la aplicación para que insertar en `inventory_logs` después de cada venta:**

```typescript
// En el código de procesamiento de ventas
await supabase.from('inventory_logs').insert({
  product_id: productId,
  change: -quantity,  // Negativo para SALIDA
  reason: 'sale',
  reference_id: saleNumber,
  created_at: new Date().toISOString()
});
```

### 7.3 Corrección de datos históricos

**Para corregir las ventas pasadas que no tienen registro en kardex:**

```sql
-- Generar registros de SALIDA para ventas desde 2026-02-01
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
  si.product_id,
  'SALIDA'::varchar,
  'sale'::varchar,
  si.quantity,
  COALESCE(
    (SELECT p.stock FROM products p WHERE p.id = si.product_id) + si.quantity,
    si.quantity
  ),
  COALESCE(
    (SELECT p.stock FROM products p WHERE p.id = si.product_id),
    0
  ),
  si.price_at_sale,
  si.price_at_sale * si.quantity,
  s.sale_number,
  s.user_id,
  'Venta: ' || si.product_name || ' x' || si.quantity,
  s.created_at
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
WHERE s.created_at >= '2026-02-01'
  AND s.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM kardex k 
    WHERE k.referencia = s.sale_number
      AND k.tipo = 'SALIDA'
  );
```

---

## 8. Plan de Acción

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 1 | Implementar trigger en `sales` | Alta | Pendiente |
| 2 | Ejecutar corrección de datos históricos | Alta | Pendiente |
| 3 | Verificar funcionamiento con nueva venta | Media | Pendiente |
| 4 | Monitorear kardex por 48 horas | Baja | Pendiente |

---

## Anexo: Consultas SQL Útiles

### Ver todas las ventas sin kardex
```sql
SELECT s.sale_number, s.created_at, COUNT(si.id) as items
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
WHERE NOT EXISTS (
  SELECT 1 FROM kardex k WHERE k.referencia = s.sale_number AND k.tipo = 'SALIDA'
)
GROUP BY s.id, s.sale_number, s.created_at
ORDER BY s.created_at DESC;
```

### Ver movimientos de kardex por producto
```sql
SELECT k.producto_id, p.name, k.tipo, k.cantidad, k.created_at
FROM kardex k
JOIN products p ON p.id::text = k.producto_id OR p.uuid_id::text = k.producto_id
WHERE k.created_at >= '2026-02-01'
ORDER BY k.created_at DESC;
```

### Ver stock actual vs último kardex
```sql
SELECT 
  p.id,
  p.name,
  p.stock as stock_actual,
  COALESCE(
    (SELECT k.stock_nuevo FROM kardex k 
     WHERE k.producto_id = p.id::text OR k.producto_id = p.uuid_id::text
     ORDER BY k.created_at DESC LIMIT 1),
    0
  ) as stock_kardex
FROM products p
WHERE p.stock != COALESCE(
  (SELECT k.stock_nuevo FROM kardex k 
   WHERE k.producto_id = p.id::text OR k.producto_id = p.uuid_id::text
   ORDER BY k.created_at DESC LIMIT 1),
  0
);
```

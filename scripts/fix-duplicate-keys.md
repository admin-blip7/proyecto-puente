# Solución para Keys Duplicadas en React

## Problema Identificado
Los errores de keys duplicadas en React son causados por:
1. Productos con IDs vacíos o nulos en la base de datos
2. Componentes que usan IDs como keys sin verificar si son válidos

## Soluciones Implementadas

### 1. Corrección en ConsignorClient.tsx
- Se agregó verificación de IDs vacíos
- Se genera key alternativa usando índice y nombre si no hay ID
- Se agrega log para detectar consignadores sin ID

### 2. Corrección en RepairClient.tsx  
- Se agregó verificación de IDs vacíos
- Se genera key alternativa usando índice y orderId si no hay ID
- Se agrega log para detectar órdenes sin ID

### 3. Mejoras en ProductService.ts
- Se agregaron logs detallados para detectar productos con IDs vacíos
- Se mejoró la validación en la creación de productos
- Se agregó verificación de IDs válidos en processStockEntry

## Pasos Adicionales Recomendados

### 1. Ejecutar Script de Base de Datos
Ejecutar el script `scripts/fix-database-schema.sql` en Supabase para:
- Crear tablas faltantes con estructura correcta
- Corregir productos sin IDs
- Agregar índices para mejorar rendimiento

### 2. Limpiar Datos Existentes
```sql
-- Eliminar productos con IDs inválidos
DELETE FROM products WHERE id IS NULL OR id = '';

-- Actualizar productos sin nombre o SKU
UPDATE products SET name = 'Producto sin nombre' WHERE name IS NULL OR name = '';
UPDATE products SET sku = 'SIN-SKU' WHERE sku IS NULL OR sku = '';
```

### 3. Verificar Componentes Adicionales
Revisar otros componentes que usan lists y keys:
- InventoryClient.tsx
- CreditClient.tsx
- SuppliersClient.tsx
- Cualquier otro componente con .map()

## Prevención Futura

### 1. Validación en Componentes
Siempre verificar IDs antes de usarlos como keys:
```tsx
{items.map((item, index) => {
  const key = item.id || `${itemType}-${index}-${item.name}`;
  return <Component key={key} {...item} />;
})}
```

### 2. Validación en Servicios
Asegurar que todos los registros creados tengan IDs válidos:
```typescript
if (!newId || newId === "") {
  throw new Error("Failed to generate valid ID");
}
```

### 3. Logs de Monitoreo
Mantener logs para detectar problemas temprano:
```typescript
if (!item.id) {
  console.warn("Item without ID detected", { item });
}
```

## Verificación
Después de aplicar las soluciones:
1. Reiniciar el servidor de desarrollo
2. Revisar la consola para ver si los errores de keys duplicadas desaparecen
3. Verificar que los logs muestren datos correctos
4. Probar la creación de nuevos productos y consignadores
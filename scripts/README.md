# Solución de Problemas de Consignadores

Este directorio contiene scripts para solucionar los problemas de visibilidad de nombres de productos y cálculo de costos de consignadores.

## 🎯 Problemas Resueltos

1. **Productos sin visibilidad de nombres**: Productos que no se muestran correctamente en la interfaz
2. **Balances de consignadores en 0**: Consignadores con productos pero balance incorrecto en $0
3. **Asignación incorrecta de consignor_id**: Productos de consignación sin o con consignor_id inválido
4. **Ventas sin consignorId**: Items de venta que no tienen asignado el consignorId correspondiente

## 📋 Scripts Disponibles

### 1. Verificación y Diagnóstico

#### `verify-products-before-fix.js`
- **Propósito**: Verifica la configuración actual de productos y consignadores
- **Cuándo usar**: Antes de aplicar cualquier solución para entender el estado actual
- **Resultados**: Lista de problemas encontrados y recomendaciones

#### `debug-consignor-zero-balance.js`
- **Propósito**: Diagnostica por qué un consignador específico tiene balance en 0
- **Cuándo usar**: Cuando un consignador específico reporta problemas de balance
- **Resultados**: Análisis detallado del flujo de datos del consignador

### 2. Pruebas y Simulaciones

#### `test-fix-with-samples.js`
- **Propósito**: Prueba la solución con datos de ejemplo
- **Cuándo usar**: Para verificar que la solución funciona antes de aplicarla en producción
- **Resultados**: Venta de prueba y actualización de balance verificada

#### `simulate-consignor-sale.js`
- **Propósito**: Simula un flujo completo de venta de consignación
- **Cuándo usar**: Para probar el flujo completo sin modificar datos reales
- **Resultados**: Simulación paso a paso del proceso

### 3. Solución Completa

#### `fix-all-consignor-balances.js`
- **Propósito**: Aplica todas las correcciones necesarias
- **Cuándo usar**: Cuando se han identificado los problemas y se desea aplicar la solución completa
- **Resultados**: 
  - Asigna consignor_id a productos sin asignar
  - Corrige consignor_id inválidos
  - Recalcula y actualiza balances de consignadores
  - Actualiza ventas con items sin consignorId

#### `run-fix-sequentially.js`
- **Propósito**: Ejecuta todos los scripts en el orden correcto
- **Cuándo usar**: Para una solución completa automatizada
- **Resultados**: Proceso guiado paso a paso

## 🚀 Cómo Usar los Scripts

### Opción 1: Solución Completa Automatizada

```bash
# Configurar variables de entorno primero
export NEXT_PUBLIC_SUPABASE_URL="https://aaftjwktzpnyjwklroww.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZnRqd2t0enBueWp3a2xyb3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk4MjE1NCwiZXhwIjoyMDc1NTU4MTU0fQ.cmciC1BWaWavlcLQpZ1mkKiaLLSXC1FD3JogmBCo3HU"

# Ejecutar la solución completa
node scripts/run-fix-sequentially.js
```

### Opción 2: Proceso Manual Paso a Paso

```bash
# 1. Verificar estado actual
node scripts/verify-products-before-fix.js

# 2. Probar con datos de ejemplo
node scripts/test-fix-with-samples.js

# 3. Aplicar solución completa
node scripts/fix-all-consignor-balances.js

# 4. Verificar resultados
node scripts/verify-products-before-fix.js
```

### Opción 3: Solución Específica

```bash
# Para diagnosticar un consignador específico
node scripts/debug-consignor-zero-balance.js

# Para simular flujos sin modificar datos
node scripts/simulate-consignor-sale.js
```

## ⚙️ Requisitos

### Variables de Entorno

```bash
# Configuración de Supabase (obligatorio)
export NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="tu-clave-de-servicio"

# Opcional: Configuración de entorno
export NODE_ENV="development"  # o "production"
```

### Permisos de Base de Datos

El script requiere permisos de:
- Lectura y escritura en tabla `products`
- Lectura y escritura en tabla `consignors`
- Lectura y escritura en tabla `sales`
- Lectura en tabla `logs` (opcional)

## 📊 Resultados Esperados

Después de ejecutar la solución:

### Productos
- ✅ Todos los productos de consignación tienen `consignor_id` válido
- ✅ No hay productos con `consignor_id` inválido
- ✅ Los nombres de productos son visibles en la interfaz

### Consignadores
- ✅ Los balances reflejan correctamente los costos de los productos vendidos
- ✅ Los consignadores con productos ya no tienen balance en $0
- ✅ Las actualizaciones de balance funcionan en tiempo real

### Ventas
- ✅ Todos los items de venta con productos de consignación tienen `consignorId`
- ✅ Las ventas se procesan correctamente con la lógica de consignación

## 🔍 Monitoreo y Mantenimiento

### Verificación Regular

```bash
# Verificar estado semanalmente
node scripts/verify-products-before-fix.js
```

### Alertas

Configurar alertas para:
- Consignadores con balance en $0 y productos asignados
- Productos de consignación sin consignor_id
- Ventas con items de consignación sin consignorId

### Logs

Los scripts generan logs detallados que se pueden revisar en:
- Consola durante la ejecución
- Tabla `logs` en Supabase (si está configurada)

## 🛠️ Solución de Problemas

### Error: "Configura las variables de entorno de Supabase"

```bash
# Verificar variables configuradas
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Configurar si faltan
export NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="tu-clave"
```

### Error: "Conexión a Supabase fallida"

- Verificar que las credenciales sean correctas
- Verificar que la red permita conexiones a Supabase
- Probar con `psql` o herramienta similar

### Error: "No hay consignadores registrados"

- Crear consignadores manualmente en la interfaz
- O usar el script para crear consignadores de prueba

### Balance sigue en 0 después de la solución

1. Verificar que los productos tengan `ownership_type: 'Consigna'`
2. Verificar que los productos tengan `consignor_id` válido
3. Verificar que las ventas tengan items con `consignorId`
4. Revisar el flujo de `salesService.ts` para asegurar que se procesan correctamente

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs detallados de los scripts
2. Verifica la configuración de Supabase
3. Ejecuta los scripts de diagnóstico
4. Consulta los archivos de logs en la base de datos

## 🎉 Éxito

Cuando todo funcione correctamente:
- Los nombres de productos serán visibles en todas las interfaces
- Los balances de consignadores se actualizarán automáticamente después de cada venta
- No habrá productos de consignación sin asignar a consignadores
- El sistema será resiliente y mantendrá la integridad de los datos
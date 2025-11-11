# Sistema de Garantías y Cambios - Guía de Implementación

## ✅ Archivos Creados

### 1. Base de Datos
- ✅ `/supabase/migrations/20250111000000_create_warranties_system.sql`
  - Tablas: warranties, product_exchanges, damaged_products
  - Modificaciones a tabla sales
  - Funciones SQL para generación de folios
  - Vista de estadísticas
  - Políticas RLS

### 2. Tipos TypeScript
- ✅ `/src/types/warranty.ts`
  - Interfaces completas para todo el sistema
  - Tipos para validación y cálculos

### 3. Servicios
- ✅ `/src/lib/services/warrantyService.ts`
  - 15+ funciones para gestión completa
  - Validaciones de garantías
  - Cálculos de diferencias de precio
  - Gestión de cambios y productos dañados

## 📋 Próximos Pasos - Componentes UI

### Componentes Necesarios

#### 1. Módulo Principal de Garantías
```
/src/app/admin/warranties/
├── page.tsx                    # Lista principal de garantías
├── [id]/
│   └── page.tsx               # Detalle de garantía individual
├── new/
│   └── page.tsx               # Crear nueva garantía
└── components/
    ├── WarrantyList.tsx       # Lista con filtros
    ├── WarrantyCard.tsx       # Tarjeta de garantía
    ├── WarrantyFilters.tsx    # Filtros y búsqueda
    ├── WarrantyDetail.tsx     # Vista detallada
    ├── CreateWarrantyForm.tsx # Formulario de creación
    ├── ApproveWarrantyDialog.tsx
    ├── RejectWarrantyDialog.tsx
    └── ExchangeProductDialog.tsx
```

#### 2. Componentes de Cambio de Productos
```
/src/components/warranties/
├── ProductExchangeForm.tsx    # Formulario de cambio
├── ProductSelector.tsx         # Selector de producto nuevo
├── PriceDifferenceCalculator.tsx
├── PaymentMethodSelector.tsx
└── ExchangeSummary.tsx
```

#### 3. Integración con Ventas
```
/src/components/admin/sales/
├── SaleDetailWithWarranty.tsx  # Vista con botón garantía
└── RegisterWarrantyButton.tsx  # Botón en productos
```

#### 4. Panel de Productos Dañados
```
/src/app/admin/damaged-products/
├── page.tsx
└── components/
    ├── DamagedProductsList.tsx
    └── DamagedProductActions.tsx
```

### Rutas API Necesarias

```
/src/app/api/warranties/
├── route.ts                    # GET, POST warranties
├── [id]/
│   ├── route.ts               # GET, PUT, DELETE warranty
│   ├── approve/
│   │   └── route.ts           # POST aprobar
│   ├── reject/
│   │   └── route.ts           # POST rechazar
│   └── exchange/
│       └── route.ts           # POST crear cambio
├── statistics/
│   └── route.ts               # GET estadísticas
└── validate/
    └── route.ts               # POST validar elegibilidad
```

## 🔧 Funciones SQL Adicionales Necesarias

### Función para actualizar stock (si no existe)
```sql
CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id UUID,
  p_quantity_change INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = stock + p_quantity_change,
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
```

## 📊 Reportes a Implementar

### 1. Reporte de Garantías
```typescript
interface WarrantyReport {
  period: string;
  total_warranties: number;
  by_status: {
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
  };
  by_reason: {
    damaged: number;
    defective: number;
    wrong_product: number;
    other: number;
  };
  top_defective_products: Array<{
    product_name: string;
    warranty_count: number;
    percentage: number;
  }>;
  financial_impact: {
    total_refunded: number;
    total_charged: number;
    net_impact: number;
  };
}
```

### 2. Dashboard de Garantías
- Gráficas de tendencias
- KPIs principales
- Alertas de productos con muchas garantías

## 🎨 Componentes UI Base Sugeridos

### WarrantyStatusBadge
```tsx
interface WarrantyStatusBadgeProps {
  status: WarrantyStatus;
}

const statusConfig = {
  pending: { label: 'Pendiente', color: 'yellow' },
  approved: { label: 'Aprobada', color: 'blue' },
  completed: { label: 'Completada', color: 'green' },
  rejected: { label: 'Rechazada', color: 'red' },
};
```

### WarrantyReasonBadge
```tsx
const reasonConfig = {
  damaged: { label: 'Dañado', icon: '💥' },
  defective: { label: 'Defectuoso', icon: '⚠️' },
  wrong_product: { label: 'Producto Incorrecto', icon: '🔄' },
  other: { label: 'Otro', icon: '📝' },
};
```

## 🔐 Permisos y Roles

### Acciones por Rol
```
Cajero:
- Crear garantías
- Ver garantías propias
- Ver productos dañados

Supervisor:
- Todo lo del cajero
- Aprobar/Rechazar garantías
- Procesar cambios
- Ver todas las garantías

Admin:
- Todo lo anterior
- Ver reportes
- Modificar configuración
- Gestionar productos dañados
```

## 📱 Flujo de Usuario Completo

### 1. Registrar Garantía
```
Cliente presenta producto → 
Cajero busca venta → 
Selecciona producto → 
Llena formulario (motivo, descripción, foto) → 
Sistema valida (tiempo, duplicados) → 
Genera folio → 
Imprime comprobante de garantía
```

### 2. Aprobar Garantía
```
Supervisor revisa garantía → 
Verifica evidencia → 
Aprueba o rechaza → 
Si aprueba: habilita cambio → 
Si rechaza: devuelve producto al inventario
```

### 3. Procesar Cambio
```
Cliente selecciona producto nuevo → 
Sistema calcula diferencia → 
Si hay cobro: procesa pago → 
Si hay devolución: genera nota de crédito → 
Actualiza inventarios → 
Genera ticket de cambio → 
Marca garantía como completada
```

## 🧪 Testing Recomendado

### Unit Tests
```typescript
// warrantyService.test.ts
describe('Warranty Service', () => {
  test('should validate warranty eligibility', async () => {
    // Test validación de tiempo
    // Test producto en venta
    // Test garantías duplicadas
  });

  test('should calculate price difference correctly', () => {
    // Test diferencia positiva
    // Test diferencia negativa
    // Test sin diferencia
  });

  test('should create warranty with valid data', async () => {
    // Test creación exitosa
    // Test validaciones
  });
});
```

### Integration Tests
```typescript
describe('Warranty Flow', () => {
  test('complete warranty and exchange flow', async () => {
    // Crear venta
    // Crear garantía
    // Aprobar garantía
    // Crear cambio
    // Completar cambio
    // Verificar inventarios
  });
});
```

## 📝 Configuración Recomendada

### Variables de Entorno
```env
# Garantías
MAX_WARRANTY_DAYS=30
AUTO_APPROVE_THRESHOLD=1000  # Auto-aprobar si diferencia < $1000
REQUIRE_EVIDENCE=true
ALLOW_PARTIAL_REFUNDS=true
```

### Configuración en Base de Datos
```sql
CREATE TABLE IF NOT EXISTS warranty_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO warranty_settings (key, value) VALUES
  ('max_warranty_days', '30'),
  ('require_supervisor_approval', 'true'),
  ('require_evidence_photo', 'false'),
  ('auto_approve_threshold', '1000');
```

## 📈 Métricas a Monitorear

### KPIs Principales
1. **Tasa de Garantías**: (Garantías / Ventas Totales) * 100
2. **Tiempo Promedio de Resolución**: Promedio de horas desde creación hasta resolución
3. **Tasa de Aprobación**: (Aprobadas / Total) * 100
4. **Productos con Más Garantías**: Top 10
5. **Impacto Financiero**: Total perdido vs ganado en cambios

### Alertas Automáticas
- Producto con >5 garantías en 30 días
- Garantía pendiente >48 horas
- Cliente con >3 garantías en el año

## 🚀 Orden de Implementación Sugerido

### Fase 1: Core (Alta Prioridad) ✅
- [x] Migraciones de BD
- [x] Tipos TypeScript
- [x] Servicio de garantías

### Fase 2: UI Básica (Alta Prioridad)
- [ ] Página principal de garantías
- [ ] Formulario de creación
- [ ] Vista de detalle
- [ ] Botón en ventas para registrar garantía

### Fase 3: Cambios (Alta Prioridad)
- [ ] Formulario de cambio
- [ ] Selector de productos
- [ ] Cálculo de diferencias
- [ ] Proceso de pago

### Fase 4: Gestión (Media Prioridad)
- [ ] Panel de productos dañados
- [ ] Aprobar/Rechazar garantías
- [ ] Historial y búsqueda

### Fase 5: Reportes (Media Prioridad)
- [ ] Dashboard de estadísticas
- [ ] Reportes por periodo
- [ ] Productos defectuosos

### Fase 6: Optimizaciones (Baja Prioridad)
- [ ] Notificaciones automáticas
- [ ] Integración con proveedores
- [ ] Exportación de reportes

## 💡 Mejoras Futuras

1. **Integración con Proveedores**
   - Enviar garantías automáticamente
   - Tracking de RMAs

2. **Portal de Cliente**
   - Consultar estado de garantía
   - Subir evidencias
   - Programar citas para cambios

3. **Analytics Avanzados**
   - ML para detectar patrones de fraude
   - Predicción de productos con problemas
   - Optimización de inventario de reemplazos

4. **Integración con ERP**
   - Sincronización con contabilidad
   - Reporte automático a fabricantes
   - Gestión de costos de garantía

## 📞 Soporte

Para continuar la implementación:
1. Ejecutar migración de BD
2. Implementar componentes UI según prioridad
3. Crear rutas API
4. Agregar tests
5. Deploy y monitoreo

---

**Status**: Base implementada ✅  
**Siguiente**: Implementar componentes UI de Fase 2  
**Estimación**: 2-3 días para completar Fases 2 y 3

# Plan: Sistema de Gestión de Rutas y Entregas de Pedidos

## Fecha de Creación
2026-02-21

## Objetivo
Implementar un sistema completo para gestionar las rutas de entrega y el seguimiento detallado de pedidos que se realizan a clientes, permitiendo controlar:
- Qué productos se entregan
- A qué cliente se le entrega cada producto
- Qué ruta/repartidor lleva cada entrega
- Estado detallado de cada entrega

---

## Estado Actual del Sistema

### Tablas Existentes Relevantes
1. **`sales`** - Ventas/Pedidos con:
   - `shipping_info` (JSONB): address, city, state, zipCode, phone
   - `delivery_status`: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
   - `tracking_number`: número de guía
   - `partner_id`, `branch_id`: multi-tenant

2. **`sale_items`** - Items de cada venta:
   - `product_id`, `product_name`, `quantity`
   - `price_at_sale`, `cost_at_sale`

3. **`crm_clients`** - Clientes con:
   - `address`, `city`, `province` (state), `phone`
   - `email`, `first_name`, `last_name`

4. **`branches`** - Sucursales (para envíos desde diferentes puntos)

### Servicios Existentes
- `salesService.ts` - Gestión de ventas con shipping_info
- `crmClientService.ts` - Gestión de clientes
- `CheckoutForm.tsx` - Formulario de checkout con dirección de envío

### Limitaciones Actuales
1. **No hay gestión de rutas** - No se sabe qué repartidor lleva qué pedidos
2. **No hay agrupación de entregas** - Cada pedido se procesa individualmente
3. **No hay seguimiento geográfico** - No se organizan las entregas por zona
4. **No hay control de mercancía por ruta** - No se sabe qué productos lleva cada repartidor
5. **No hay confirmación de entrega** - No hay firma o foto de entrega
6. **No hay optimización de rutas** - No se calculan rutas eficientes

---

## Plan de Implementación

### FASE 1: Base de Datos y Modelo de Datos

#### 1.1 Nueva Tabla: `delivery_routes`
Definir las rutas de entrega diarias/semanales.

```sql
CREATE TABLE delivery_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_code TEXT UNIQUE NOT NULL, -- Ej: RUTA-2026-02-21-01
  route_name TEXT, -- Ej: "Ruta Centro - Norte", "Ruta Repartidor Juan"

  -- Configuración de ruta
  route_type TEXT DEFAULT 'standard', -- 'standard', 'express', 'pickup'
  assigned_to TEXT, -- Nombre del repartidor
  driver_id UUID REFERENCES auth.users(id), -- Usuario asignado
  branch_id UUID REFERENCES branches(id), -- Sucursal de origen

  -- Fechas
  delivery_date DATE NOT NULL,
  departure_time TIME,
  estimated_return_time TIME,

  -- Estado
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Métricas
  total_orders INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  total_failed_deliveries INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,

  -- Notas
  notes TEXT,
  internal_notes TEXT,

  -- Multi-tenant
  partner_id UUID REFERENCES partners(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.2 Nueva Tabla: `delivery_route_stops`
Paradas de cada ruta (clientes/lugares donde se entrega).

```sql
CREATE TABLE delivery_route_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES delivery_routes(id) ON DELETE CASCADE,

  -- Orden y secuenciación
  stop_sequence INTEGER NOT NULL, -- 1, 2, 3... orden de visita
  stop_type TEXT DEFAULT 'delivery', -- 'delivery', 'pickup', 'warehouse'

  -- Información del cliente/destino
  crm_client_id UUID REFERENCES crm_clients(id),
  customer_name TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,

  -- Geolocalización
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  estimated_arrival TIME,
  estimated_departure TIME,

  -- Estado de la parada
  status TEXT DEFAULT 'pending', -- 'pending', 'en_route', 'arrived', 'completed', 'failed', 'skipped'
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  -- Notas
  delivery_notes TEXT,
  special_instructions TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.3 Nueva Tabla: `delivery_items`
Items individuales que se entregan en cada parada.

```sql
CREATE TABLE delivery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_stop_id UUID REFERENCES delivery_route_stops(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id),
  sale_item_id UUID REFERENCES sale_items(id),

  -- Producto
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL,

  -- Confirmación de entrega
  delivered_quantity INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'delivered', 'returned', 'damaged'
  delivery_photo_url TEXT,
  recipient_signature TEXT, -- Base64 o URL de imagen
  recipient_name TEXT,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.4 Actualización a tabla `sales`
Agregar campos para relacionar con rutas:

```sql
ALTER TABLE sales ADD COLUMN route_id UUID REFERENCES delivery_routes(id);
ALTER TABLE sales ADD COLUMN route_stop_id UUID REFERENCES delivery_route_stops(id);
```

#### 1.5 Nueva Tabla: `delivery_confirmations`
Confirmaciones fotográficas de entrega.

```sql
CREATE TABLE delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_stop_id UUID REFERENCES delivery_route_stops(id),
  delivery_item_id UUID REFERENCES delivery_items(id),

  photo_url TEXT NOT NULL,
  photo_public_url TEXT,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  taken_by UUID REFERENCES auth.users(id),

  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),

  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.6 Índices y RLS
Crear índices para optimizar consultas y políticas de seguridad.

---

### FASE 2: Servicios Backend

#### 2.1 `deliveryRouteService.ts`
Servicios para gestión de rutas:

```typescript
// Funciones principales:
- createRoute(data): Crear nueva ruta
- getRoutes(filters): Listar rutas con filtros (fecha, estado, repartidor)
- getRouteById(id): Obtener ruta con paradas y items
- updateRoute(id, data): Actualizar ruta
- deleteRoute(id): Eliminar ruta
- assignDriver(routeId, driverId): Asignar repartidor
- startRoute(routeId): Iniciar ruta (cambiar status a 'in_progress')
- completeRoute(routeId): Completar ruta
- getRouteManifest(routeId): Obtener manifiesto de entrega (lista detallada)
- optimizeRoute(routeId): Optimizar orden de paradas (integración con API de mapas)
```

#### 2.2 `deliveryStopService.ts`
Servicios para gestión de paradas:

```typescript
// Funciones principales:
- addStopToRoute(routeId, stopData): Agregar parada a ruta
- updateStop(id, data): Actualizar parada
- updateStopStatus(id, status): Cambiar estado (arrived, completed, failed)
- getStopsByRoute(routeId): Obtener paradas de una ruta
- markStopArrived(id): Registrar llegada
- markStopCompleted(id): Registrar completado
- recordDeliveryConfirmation(stopId, data): Registrar confirmación (foto, firma)
```

#### 2.3 `deliveryItemService.ts`
Servicios para gestión de items de entrega:

```typescript
// Funciones principales:
- getItemsByStop(stopId): Obtener items de una parada
- updateItemDeliveryStatus(id, status, quantity): Actualizar estado de entrega
- recordItemConfirmation(itemId, data): Registrar confirmación individual
- getUndeliveredItems(routeId): Reporte de items no entregados
```

#### 2.4 `deliveryManifestService.ts`
Servicios para generar manifiestos:

```typescript
// Funciones principales:
- generateRouteManifest(routeId): Generar PDF con manifiesto completo
- generateDriverManifest(routeId): Generar versión simplificada para repartidor
- generateReturnManifest(routeId): Generar reporte de devoluciones
```

---

### FASE 3: Interfaz de Usuario - Admin

#### 3.1 Página: `/admin/delivery/routes`
Dashboard principal de rutas:

**Componentes:**
- `DeliveryRoutesDashboard.tsx` - Vista principal
  - Filtros: Fecha, Estado, Repartidor, Sucursal
  - Cards: Rutas activas, Pendientes, Completadas hoy
  - Botón: "Nueva Ruta"

**Datos a mostrar:**
- Lista de rutas del día
- Estado de cada ruta (badge con color)
- Repartidor asignado
- Número de paradas
- Progreso (X/Y entregas completadas)
- Total de pedidos y monto

#### 3.2 Componente: `CreateRouteDialog.tsx`
Diálogo para crear nueva ruta:

**Campos:**
- Fecha de entrega
- Repartidor (dropdown de usuarios)
- Sucursal de origen
- Tipo de ruta (Estándar, Express, Recolección)
- Hora de salida estimada

**Funcionalidad:**
- Seleccionar pedidos pendientes de la fecha
- Agrupar automáticamente por zona/dirección (opcional)
- Crear paradas iniciales

#### 3.3 Componente: `RouteDetailPanel.tsx`
Panel detallado de una ruta:

**Pestañas:**
1. **Resumen**: Info general, progreso, métricas
2. **Paradas**: Lista de paradas con mapa
3. **Items**: Lista de todos los items a entregar
4. **Manifiesto**: Vista previa e impresión

**Funcionalidades:**
- Arrastrar y soltar para reordenar paradas
- Ver mapa con ruta optimizada
- Agregar/remover paradas
- Marcar paradas como completadas
- Ver fotos de confirmación

#### 3.4 Página: `/admin/delivery/route/[id]`
Página de detalle de ruta:

**Layout:**
- Header con info de ruta y acciones (Imprimir, Optimizar, Iniciar, Completar)
- Mapa con paradas visualizadas
- Lista de paradas expandible
- Panel lateral con items de la parada seleccionada

#### 3.5 Componente: `RouteStopCard.tsx`
Tarjeta de parada en ruta:

**Contenido:**
- Secuencia (1, 2, 3...)
- Nombre del cliente
- Dirección completa
- Teléfono
- Items a entregar (resumen)
- Estado actual
- Acciones rápidas (Llamar, Ver mapa, Confirmar entrega)

#### 3.6 Componente: `DeliveryConfirmationDialog.tsx`
Diálogo para confirmar entrega:

**Campos:**
- Foto de entrega (cámara o subir)
- Firma del cliente (canvas touch)
- Nombre del recibidor
- Cantidad entregada (si diferente a lo planeado)
- Notas de entrega
- Incidencias (producto dañado, rechazado, etc.)

#### 3.7 Componente: `UndeliveredItemsReport.tsx`
Reporte de items no entregados:

**Funcionalidad:**
- Lista de items que no pudieron entregarse
- Razón de no entrega
- Acción: Reagendar, Devolver a almacén, Cancelar

---

### FASE 4: Interfaz de Usuario - Móvil (Repartidor)

#### 4.1 Página: `/mobile/delivery/[routeId]`
Vista móvil para repartidor:

**Diseño móvil-first:**
- Pantalla grande con siguiente parada
- Navegación intuitiva (siguiente/anterior)
- Botones grandes para acciones principales

**Funcionalidades:**
- Ver lista de paradas del día
- Navegar a parada (integración con maps)
- Marcar llegada
- Confirmar entrega con foto
- Llamar al cliente
- Ver detalles de items a entregar

#### 4.2 Componente: `MobileStopCard.tsx`
Tarjeta de parada optimizada para móvil:

**Contenido simplificado:**
- Dirección destacada
- Botón "Navegar" (abre Google Maps/Waze)
- Resumen de items
- Botón grande "Confirmar Entrega"

#### 4.3 Componente: `PhotoCapture.tsx`
Componente para capturar fotos:

**Funcionalidades:**
- Acceso a cámara del dispositivo
- Vista previa de foto
- Opción de reintentar
- Comprimir imagen antes de subir

#### 4.4 Componente: `SignatureCanvas.tsx`
Canvas para firma digital:

**Funcionalidades:**
- Dibujar firma con touch/mouse
- Botón "Limpiar" para reintentar
- Botón "Confirmar" para guardar
- Guardar como imagen base64

---

### FASE 5: Integraciones

#### 5.1 Integración con Mapas
Optimización de rutas usando Google Maps API o similar:

```typescript
// Funciones:
- geocodeAddress(address): Obtener lat/lng de dirección
- optimizeRoute(stops[]): Ordenar paradas por ruta más corta
- getRouteDistance(origin, destination): Calcular distancia
- getEstimatedTime(origin, destination): Calcular tiempo estimado
```

#### 5.2 Integración con WhatsApp
Notificaciones al cliente:

```typescript
// Funciones:
- sendDeliveryNotification(phone, orderId, estimatedTime): Avisar que viene el repartidor
- sendDeliveryConfirmation(phone, orderId): Confirmar entrega exitosa
- sendFailedDeliveryNotification(phone, reason): Avisar que no se pudo entregar
```

#### 5.3 Impresión de Manifiestos
Generación de PDF:

```typescript
// Funciones:
- generateRouteManifestPDF(routeId): PDF con toda la info de ruta
- generateDriverCopy(routeId): Copia simplificada para repartidor
- generateReturnSheet(routeId): Hoja de devoluciones
```

---

### FASE 6: Actualización de Componentes Existentes

#### 6.1 Actualizar `CheckoutForm.tsx`
Agregar opción de tipo de entrega:
- [ ] Recoger en tienda
- [ ] Entrega a domicilio (surge costo adicional)
- Mostrar fecha de entrega estimada
- Mostrar pista de seguimiento

#### 6.2 Actualizar `salesService.ts`
Integrar pedidos con sistema de rutas:
- Al crear venta, crear `delivery_route_stops` si hay envío
- Actualizar `delivery_status` según progreso de ruta
- Vincular `sale` con `route_id` y `route_stop_id`

#### 6.3 Actualizar `LeftSidebar.tsx`
Agregar sección de "Rutas y Entregas":
```typescript
{
  label: "Rutas",
  href: "/admin/delivery/routes",
  icon: Truck, // Icono de camión
  badge: routesToday.length // Número de rutas hoy
}
```

---

### FASE 7: Reportes y Analíticas

#### 7.1 Página: `/admin/delivery/reports`
Dashboard de reportes de entregas:

**Métricas:**
- Entregas totales por período
- Tasa de entrega exitosa (%)
- Entregas falladas por razón
- Rendimiento por repartidor
- Tiempo promedio por ruta
- Costo de entrega por pedido

**Gráficos:**
- Entregas por día (gráfico de barras)
- Tasa de éxito (gráfico de dona)
- Mapa de calor de entregas

#### 7.2 Reportes exportables:
- Reporte diario de entregas (CSV/PDF)
- Reporte de devoluciones
- Reporte de rendimiento de repartidores
- Reporte de zonas con más entregas fallidas

---

## FASE 8: Cronograma de Implementación

| Fase | Tareas Estimadas | Duración |
|------|------------------|----------|
| FASE 1: Base de Datos | 8 tareas | 1-2 días |
| FASE 2: Servicios Backend | 4 servicios | 2-3 días |
| FASE 3: UI Admin | 7 componentes | 3-4 días |
| FASE 4: UI Móvil | 4 componentes | 2-3 días |
| FASE 5: Integraciones | 3 integraciones | 2 días |
| FASE 6: Actualizaciones | 3 componentes | 1 día |
| FASE 7: Reportes | 1 página + métricas | 2 días |
| **TOTAL** | **30 tareas** | **13-18 días** |

---

## Especificaciones Técnicas

### Tipos de TypeScript a Agregar

```typescript
// types/index.ts

export type DeliveryRouteStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type DeliveryStopStatus = 'pending' | 'en_route' | 'arrived' | 'completed' | 'failed' | 'skipped';
export type DeliveryItemType = 'pending' | 'delivered' | 'returned' | 'damaged';
export type RouteType = 'standard' | 'express' | 'pickup';

export interface DeliveryRoute {
  id: string;
  routeCode: string;
  routeName: string;
  routeType: RouteType;
  assignedTo?: string;
  driverId?: string;
  branchId?: string;
  deliveryDate: Date;
  departureTime?: string;
  estimatedReturnTime?: string;
  status: DeliveryRouteStatus;
  startedAt?: Date;
  completedAt?: Date;
  totalOrders: number;
  totalDeliveries: number;
  totalFailedDeliveries: number;
  totalAmount: number;
  notes?: string;
  internalNotes?: string;
  partnerId?: string;
  createdAt: Date;
  updatedAt: Date;
  stops?: DeliveryRouteStop[];
}

export interface DeliveryRouteStop {
  id: string;
  routeId: string;
  stopSequence: number;
  stopType: 'delivery' | 'pickup' | 'warehouse';
  crmClientId?: string;
  customerName?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  estimatedArrival?: string;
  estimatedDeparture?: string;
  status: DeliveryStopStatus;
  arrivedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  deliveryNotes?: string;
  specialInstructions?: string;
  items?: DeliveryItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryItem {
  id: string;
  routeStopId: string;
  saleId?: string;
  saleItemId?: string;
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  deliveredQuantity: number;
  status: DeliveryItemType;
  deliveryPhotoUrl?: string;
  recipientSignature?: string;
  recipientName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryConfirmation {
  id: string;
  routeStopId: string;
  deliveryItemId?: string;
  photoUrl: string;
  photoPublicUrl?: string;
  takenAt: Date;
  takenBy: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt: Date;
}
```

---

## Consideraciones de Seguridad

1. **RLS (Row Level Security)**: Todas las tablas deben tener políticas por `partner_id`
2. **Fotos de entrega**: Subir a Supabase Storage con bucket protegido
3. **Firmas digitales**: Guardar en Storage con acceso restringido
4. **Ubicación de repartidor**: Solo durante horario laboral, con consentimiento

---

## Requisitos Adicionales a Considerar

1. **Offline mode**: La app móvil debe funcionar sin conexión
2. **Sincronización**: Cuando recupere conexión, sincronizar datos
3. **Notificaciones push**: Avisar al repartidor de nuevas rutas asignadas
4. **Códigos QR**: Generar QR para cada entrega para escaneo rápido
5. **Reimpresión de manifiestos**: Permitir reimprimir si se pierde

---

## Notas para el Usuario

Este plan está diseñado para ser **modular**. Se puede implementar por fases:

- **MVP (Fases 1-3)**: Sistema básico de rutas sin móvil
- **V1 (Fases 1-5)**: Sistema completo con app móvil
- **V2 (Todas las fases)**: Sistema completo con optimización y analíticas

¿Quieres que comience con alguna fase específica o tienes preguntas sobre el plan?

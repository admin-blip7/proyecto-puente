# Guía de Sincronización de Base de Datos y Frontend

## Regla de Oro

**SIEMPRE** que se realicen modificaciones en las estructuras de datos (types, interfaces, servicios), se deben crear y aplicar las migraciones correspondientes en Supabase inmediatamente.

## Flujo de Trabajo Obligatorio

### 1. Al agregar nuevos campos a una interfaz

```typescript
// Ejemplo: Agregar campo a Product
interface Product {
  // ... campos existentes
  nuevoCampo: string; // Nuevo campo
}
```

**Inmediatamente después:**
```bash
npx supabase migration new add_nuevo_campo_to_products
```

```sql
-- migrations/XXXX_add_nuevo_campo_to_products.sql
ALTER TABLE products
ADD COLUMN nuevo_campo text;
```

```bash
npx supabase db push
```

### 2. Al crear nuevas interfaces que representan tablas

```typescript
// Nueva interfaz
interface NuevaTabla {
  id: string;
  campo1: string;
  campo2: number;
  createdAt: Date;
}
```

**Inmediatamente después:**
1. Crear la tabla con todas las columnas necesarias
2. Crear índices si es necesario
3. Aplicar la migración

### 3. Al modificar el servicio

Si se agrega una nueva propiedad en el `payload` del servicio:
```typescript
// productService.ts
const payload = {
  // ... campos existentes
  nuevoCampo: productData.nuevoCampo, // Nuevo
};
```

**Verificar que la columna exista en la base de datos antes de continuar.**

## Checklist Antes de Commits

Antes de hacer un commit de cambios que afecten la base de datos:

- [ ] ¿Se creó una migración para cada cambio estructural?
- [ ] ¿Se aplicó la migración con `npx supabase db push`?
- [ ] ¿Se reinició el servidor de desarrollo para limpiar el cache?
- [ ] ¿Se probaron los cambios en la aplicación?

## Comandos Esenciales

```bash
# Crear nueva migración
npx supabase migration new nombre_descriptivo_de_la_migracion

# Aplicar migraciones pendientes
npx supabase db push

# Verificar estado de las migraciones
npx supabase migration list

# Reiniciar servidor de desarrollo (importante después de cambios en DB)
npm run dev
```

## Errores Comunes y Soluciones

### Error: `Could not find the 'column_name' column in the schema cache`

**Causa:** La columna no existe en la base de datos o el schema cache está desactualizado.

**Solución:**
1. Crear y aplicar la migración para la columna faltante
2. Reiniciar el servidor de desarrollo

### Error: `PGRST204`

**Causa:** PostgREST (el API de Supabase) no encuentra la columna en su cache interno.

**Solución:**
1. Verificar que la migración se aplicó correctamente
2. Reiniciar el servidor Next.js
3. Si persiste, reiniciar el proyecto de Supabase local

## Estructura de Migraciones

Usar nombres descriptivos con fecha:
- `20251015_add_attributes_column_to_products.sql`
- `20251015_create_inventory_logs_table.sql`
- `20251015_add_category_to_products.sql`

## Buenas Prácticas

1. **SIEMPRE** revisar los tipos en `src/types/index.ts` antes de crear migraciones
2. Mantener las migraciones atómicas (una sola tarea por migración)
3. Nunca modificar migraciones ya aplicadas
4. Probar las migraciones en un entorno de desarrollo primero
5. Documentar cambios complejos en comentarios SQL

## Ejemplo Completo

```typescript
// 1. Modificar el tipo
interface Product {
  // ...
  nuevaPropiedad: string;
}

// 2. Crear migración
npx supabase migration new add_nueva_propiedad

// 3. Escribir SQL
ALTER TABLE products
ADD COLUMN nueva_propiedad text DEFAULT '';

// 4. Aplicar migración
npx supabase db push

// 5. Actualizar servicio
const payload = {
  // ...
  nueva_propiedad: productData.nuevaPropiedad,
};

// 6. Reiniciar servidor
npm run dev

// 7. Probar la funcionalidad
```

## ESTRUCTURA DE LA BASE DE DATOS

### Tablas Principales

#### 1. `products`
Almacena todos los productos del inventario.

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firestore_id text UNIQUE NOT NULL,
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'Venta', -- 'Venta' | 'Refacción'
  ownership_type text NOT NULL DEFAULT 'Propio', -- 'Propio' | 'Consigna' | 'Familiar'
  consignor_id uuid REFERENCES consignors(id),
  reorder_point integer DEFAULT 0,
  combo_product_ids text[] DEFAULT '{}',
  compatibility_tags text[] DEFAULT '{}',
  search_keywords text[] DEFAULT '{}',
  category text, -- 'celular-seminuevo' | 'mica' | NULL
  attributes jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

**Campos especiales:**
- `category`: Para productos especiales (celulares seminuevos, micas)
- `attributes`: JSON con atributos específicos por categoría
  - Celular Seminuevo: `{color, memoria, bateria, estetica}`
  - Mica: `{alto, ancho}` (en cm)
- `combo_product_ids`: Array de IDs para productos combo
- `compatibility_tags`: Tags de compatibilidad
- `search_keywords`: Palabras clave para búsqueda mejorada

#### 2. `inventory_logs`
Registra todos los movimientos de inventario.

```sql
CREATE TABLE inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  product_name text NOT NULL,
  change integer NOT NULL, -- positivo para entradas, negativo para salidas
  reason text NOT NULL, -- 'Venta' | 'Venta a Crédito' | 'Ingreso de Mercancía' | 'Ajuste Manual' | 'Devolución' | 'Creación de Producto' | 'Uso en Reparación'
  updated_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);
```

#### 3. `consignors`
Proveedores de productos en consigna.

```sql
CREATE TABLE consignors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_info text,
  balance_due numeric DEFAULT 0
);
```

#### 4. `sales`
Registro de todas las ventas.

```sql
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id text UNIQUE NOT NULL,
  items jsonb NOT NULL, -- Array de SaleItem
  total_amount numeric NOT NULL,
  payment_method text NOT NULL, -- 'Efectivo' | 'Tarjeta de Crédito' | 'Crédito'
  cashier_id uuid NOT NULL,
  cashier_name text,
  customer_name text,
  customer_phone text,
  created_at timestamptz DEFAULT now(),
  session_id text,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled'))
);
```

#### 5. `cash_sessions`
Control de cajas diarias.

```sql
CREATE TABLE cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'Abierto', -- 'Abierto' | 'Cerrado'
  opened_by uuid NOT NULL,
  opened_by_name text NOT NULL,
  opened_at timestamptz DEFAULT now(),
  starting_float numeric NOT NULL DEFAULT 0,
  closed_by uuid,
  closed_by_name text,
  closed_at timestamptz,
  total_cash_sales numeric DEFAULT 0,
  total_card_sales numeric DEFAULT 0,
  total_cash_payouts numeric DEFAULT 0,
  expected_cash_in_drawer numeric,
  actual_cash_count numeric,
  difference numeric
);
```

#### 6. `clients`
Datos de los clientes del sistema.

```sql
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  address text,
  curp text,
  employment_info jsonb DEFAULT '{}',
  social_media jsonb DEFAULT '{}',
  documents jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

#### 7. `credit_accounts`
Cuentas de crédito para clientes.

```sql
CREATE TABLE credit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text UNIQUE NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id),
  credit_limit numeric NOT NULL,
  current_balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Al Corriente', -- 'Al Corriente' | 'Atrasado' | 'Pagado'
  payment_due_date timestamptz NOT NULL,
  interest_rate numeric,
  created_at timestamptz DEFAULT now()
);
```

#### 8. `repair_orders`
Órdenes de reparación.

```sql
CREATE TABLE repair_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'Recibido',
  customer_name text NOT NULL,
  customer_phone text,
  device_brand text NOT NULL,
  device_model text NOT NULL,
  device_serial_imei text,
  reported_issue text,
  technician_notes text,
  parts_used jsonb DEFAULT '{}',
  labor_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
```

#### 9. `settings`
Configuraciones del sistema.

```sql
CREATE TABLE settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Ejemplos de configuraciones:**
- `label_design_product`: Configuración de etiquetas para productos
- `label_design_repair`: Configuración de etiquetas para reparaciones
- `ticket_settings`: Configuración de tickets de venta
- `contract_template`: Plantilla de contratos

### Relaciones Importantes

1. **products ↔ consignors**: Un producto puede tener un consignador (ownership_type = 'Consigna')
2. **products ↔ inventory_logs**: Cada movimiento de inventario se registra en inventory_logs
3. **clients ↔ credit_accounts**: Un cliente puede tener una cuenta de crédito
4. **cash_sessions ↔ sales**: Las ventas se asocian a una sesión de caja

### Convenciones de Nomenclatura

1. **IDs**: Todas las tablas usan UUID como primary key
2. **firestore_id**: Campo adicional para compatibilidad con migración desde Firebase
3. **created_at/updated_at**: Timestamps automáticos con timestamptz
4. **jsonb**: Para datos estructurados variables (attributes, metadata, settings)
5. **text[]**: Arrays de PostgreSQL para listas simples

### Índices Importantes

```sql
-- Búsqueda de productos
CREATE INDEX idx_products_search_keywords ON products USING gin(search_keywords);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_ownership_type ON products(ownership_type);

-- Logs de inventario
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);

-- Búsqueda por compatibilidad
CREATE INDEX idx_products_compatibility_tags ON products USING gin(compatibility_tags);
```

### Conexión con Frontend (TypeScript)

Las interfaces de TypeScript reflejan exactamente la estructura de las tablas:

```typescript
// src/types/index.ts
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  createdAt: Date;
  type: 'Venta' | 'Refacción';
  ownershipType: OwnershipType;
  consignorId?: string;
  reorderPoint?: number;
  comboProductIds?: string[];
  compatibilityTags?: string[];
  searchKeywords?: string[];
  category?: string;
  attributes?: Record<string, any>;
}
```

### Servicio de Base de Datos

Se usa Supabase Client con Row Level Security (RLS):

```typescript
// src/lib/supabaseServerClient.ts
export const getSupabaseServerClient = () => {
  const cookieStore = cookies();
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  return supabase;
};
```

### Tipos de OwnershipType

```typescript
export type OwnershipType = 'Propio' | 'Consigna' | 'Familiar';
```

- **Propio**: Producto propio del negocio
- **Consigna**: Producto de un consignador (requiere consignorId)
- **Familiar**: Producto para venta a familiares (precio = costo)

## IMPORTANTE

Esta regla no es opcional. **SIEMPRE** se deben sincronizar los cambios de la base de datos con el frontend inmediatamente para evitar errores de ejecución y mantener la consistencia del sistema.
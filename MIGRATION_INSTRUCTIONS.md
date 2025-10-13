# Migración de Base de Datos - Agregar Columna 'orientation'

## Problema Identificado

La funcionalidad de guardado de configuración de etiquetas está fallando porque la tabla `settings` en Supabase no tiene la columna `orientation` requerida.

**Error:** `Database error: Could not find the 'orientation' column of 'settings' in the schema cache`

## Solución

Necesitas agregar la columna `orientation` a la tabla `settings` en tu base de datos Supabase.

### Opción 1: Usando el SQL Editor de Supabase (Recomendado)

1. Ve a tu dashboard de Supabase
2. Navega a **SQL Editor**
3. Ejecuta el siguiente comando SQL:

```sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS orientation TEXT;
```

### Opción 2: Usando el Table Editor de Supabase

1. Ve a tu dashboard de Supabase
2. Navega a **Table Editor**
3. Selecciona la tabla `settings`
4. Haz clic en **Add Column**
5. Configura la nueva columna:
   - **Name:** `orientation`
   - **Type:** `text`
   - **Nullable:** ✅ (marcado)
   - **Default value:** (dejar vacío)
6. Haz clic en **Save**

## Verificación

Después de agregar la columna, puedes verificar que se agregó correctamente ejecutando:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'settings' AND column_name = 'orientation';
```

## Estructura Actual de la Tabla

La tabla `settings` actualmente tiene estas columnas:
- `default_product_image_url`
- `logo_url`
- `lastUpdated`
- `firestore_id`
- `content`
- `canvasWidth`
- `elements`
- `canvasHeight`
- `updatedAt`
- `margin`
- `gap`
- `logoUrl`
- `fontSize`
- `width`
- `height`
- `includeLogo`
- `storeName`
- `barcodeHeight`
- `visualLayout`
- `footer`
- `header`
- `body`

Después de la migración, también tendrá:
- `orientation` (TEXT, nullable)

## Próximos Pasos

Una vez que hayas agregado la columna `orientation`, la funcionalidad de guardado de configuración de etiquetas debería funcionar correctamente.
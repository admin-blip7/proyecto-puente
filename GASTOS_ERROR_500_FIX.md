# Fix: Error 500 al Agregar Gastos

## 🔍 Diagnóstico del Problema

### Errores Reportados:
1. **ERR_BLOCKED_BY_CLIENT** (Bugsnag, Segment) - ❌ No es el problema (bloqueador de ads)
2. **Error 500 en `/api/cash-sessions/upload-ticket`** - ✅ Este es el problema real
3. **Server Components render error** - Consecuencia del error 500

## 🎯 Causa Raíz

El endpoint `/api/cash-sessions/upload-ticket` está fallando con error 500 porque:

1. **El bucket de Supabase Storage no existe**: `cash-session-tickets`
2. El código intenta subir PDFs a un bucket que no ha sido creado

### ¿Por qué falla al agregar gastos?

El error NO debería ocurrir al agregar gastos, ya que ese endpoint solo se usa al **cerrar sesiones de caja**. Sin embargo, puede aparecer en la consola si:
- Hay un cierre de sesión previo que falló
- El estado del componente mantiene referencia a intentos anteriores
- Error de caché del navegador

## ✅ Soluciones

### Solución 1: Crear el Bucket de Supabase Storage (REQUERIDO)

**Ejecutar este script en el SQL Editor de Supabase:**

```sql
-- Archivo: scripts/setup-cash-session-tickets-bucket.sql

-- Create storage bucket for cash session tickets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('cash-session-tickets', 'cash-session-tickets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload tickets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cash-session-tickets');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to read tickets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'cash-session-tickets');

CREATE POLICY IF NOT EXISTS "Allow public read access to tickets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'cash-session-tickets');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to update tickets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'cash-session-tickets');

CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete tickets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cash-session-tickets');
```

### Solución 2: Crear Tablas de Gastos (SI AÚN NO EXISTEN)

**Ejecutar estos scripts en Supabase:**

#### Tabla de Categorías:
```bash
# Archivo: scripts/setup-expense-categories-table.sql
```
Ver contenido completo en el archivo del repositorio.

#### Tabla de Gastos:
```bash
# Archivo: scripts/setup-expenses-table.sql
```
Ver contenido completo en el archivo del repositorio.

### Solución 3: Limpiar Caché del Navegador

Para el usuario que reporta el error:

1. **Abrir DevTools** (F12)
2. **Clic derecho en el botón de Recargar**
3. **Seleccionar "Vaciar caché y recargar de forma forzada"**
4. O usar: `Ctrl + Shift + Delete` y borrar caché

## 🔧 Verificación Paso a Paso

### Paso 1: Verificar que las tablas existen

```sql
-- Verificar tabla de categorías
SELECT * FROM information_schema.tables 
WHERE table_name = 'expense_categories';

-- Verificar tabla de gastos
SELECT * FROM information_schema.tables 
WHERE table_name = 'expenses';
```

### Paso 2: Verificar que el bucket existe

```sql
-- Verificar bucket de storage
SELECT * FROM storage.buckets 
WHERE id = 'cash-session-tickets';
```

### Paso 3: Probar agregar un gasto

1. Ir al POS
2. Abrir sesión de caja
3. Clic en "Gastos" o botón de gastos rápidos
4. Agregar un gasto con:
   - Monto: 100
   - Descripción: Prueba
   - Categoría: Cualquiera
5. Verificar que se guarda sin error 500

### Paso 4: Probar cerrar sesión (para verificar tickets)

1. Cerrar sesión de caja
2. Ingresar conteo de efectivo
3. Confirmar cierre
4. Verificar que se genera y descarga el PDF

## 📋 Checklist de Implementación

### En Supabase (Requiere acceso de admin):
- [ ] Ejecutar `setup-cash-session-tickets-bucket.sql`
- [ ] Ejecutar `setup-expense-categories-table.sql`
- [ ] Ejecutar `setup-expenses-table.sql`
- [ ] Verificar que las tablas tienen datos de prueba

### En el Navegador (Usuario final):
- [ ] Limpiar caché del navegador
- [ ] Recargar la aplicación (Ctrl + F5)
- [ ] Probar agregar un gasto

## 🐛 Debugging Adicional

Si el error persiste después de crear el bucket:

1. **Verificar logs del servidor:**
```bash
# En la terminal del servidor
tail -f /var/log/app.log
```

2. **Verificar en el navegador:**
```javascript
// Abrir DevTools > Console
// Ver el log detallado
console.log('Session state:', localStorage);
```

3. **Verificar políticas de storage:**
```sql
-- Ver políticas del bucket
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

## 📝 Notas Importantes

1. **Los errores de Bugsnag y Segment** son normales si tienes bloqueadores de ads/trackers - puedes ignorarlos.

2. **El error 500 en upload-ticket** solo afecta el cierre de sesiones de caja, no debería impedir agregar gastos.

3. **Si el error persiste** después de crear el bucket, verifica que:
   - Las credenciales de Supabase son correctas
   - El usuario tiene permisos de escritura
   - La sesión de autenticación es válida

## 🚀 Orden de Ejecución Recomendado

1. ✅ **Primero**: Ejecutar scripts SQL en Supabase
2. ✅ **Segundo**: Desplegar el código actualizado (ya está en el repo)
3. ✅ **Tercero**: Limpiar caché del navegador
4. ✅ **Cuarto**: Probar funcionalidad

## 📞 Si Nada Funciona

Si después de aplicar todos los pasos el error persiste:

1. Capturar el **log completo del servidor** (no solo la consola del navegador)
2. Verificar la **configuración de variables de entorno** de Supabase
3. Revisar los **logs de Supabase** en el dashboard
4. Verificar que el **service role key** tiene permisos suficientes

---

**Última Actualización**: 2024-11-12  
**Estado**: Solución lista para implementar  
**Prioridad**: Alta - Afecta funcionalidad crítica

# CRM Cliente Loading Debug Guide

## Diagnóstico Inicial ✅

Los datos **SÍ existen** en Supabase:
- ✓ 1 cliente guardado correctamente
- ✓ 5 tags por defecto presentes
- ✓ Todas las tablas son accesibles

El problema está en el **frontend** - no se está mostrando el cliente en la interfaz.

---

## Cómo Debuggear

### Paso 1: Abre Developer Tools

```
Mac: Cmd + Option + I
Windows/Linux: F12
```

### Paso 2: Ve a la Pestaña "Console"

Verás los logs del navegador. Busca errores como:

```
❌ Error loading clients: ...
❌ [crmClientService] Error getting CRM clients
```

---

## Problemas Comunes y Soluciones

### Problema 1: "User not authenticated"

**Síntoma en consola:**
```
Error loading clients: User not authenticated
```

**Solución:**
- Refresca la página (Cmd+R o Ctrl+R)
- Cierra sesión y vuelve a iniciar sesión
- Limpia cookies del navegador

---

### Problema 2: "Supabase client not initialized"

**Síntoma en consola:**
```
Error getting CRM clients: Supabase client not initialized
```

**Solución:**
1. Verifica que `.env.local` tenga:
   - `NEXT_PUBLIC_SUPABASE_URL` 
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   
2. Reinicia el servidor Next.js:
   ```bash
   npm run dev
   ```

---

### Problema 3: "Network Error" o 403/406

**Síntoma en consola:**
```
Failed to load resource: the server responded with a status of 403 (Forbidden)
```

**Significa:** Problemas de RLS aún presentes

**Solución:**
1. Abre Supabase Dashboard → SQL Editor
2. Ejecuta:
```sql
SELECT table_name, count(*) as policy_count
FROM pg_policies
WHERE tablename IN ('crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents')
GROUP BY table_name;
```

Si hay policies:
```sql
DROP POLICY IF EXISTS "Users can view crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can insert crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can update crm_clients" ON crm_clients;
DROP POLICY IF EXISTS "Users can delete crm_clients" ON crm_clients;

ALTER TABLE crm_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents DISABLE ROW LEVEL SECURITY;
```

---

### Problema 4: "No clients shown" (pero sin errores)

**Síntoma:** La página carga sin errores pero la tabla está vacía

**Causas posibles:**
1. El estado `loading` nunca se cambia a `false`
2. `paginatedClients` es vacío aunque hay datos
3. El filtro está ocultando los resultados

**Debug:**
1. En Console, ejecuta:
```javascript
// Check if component state is updated
console.log('Check Network tab - look for requests to crm_clients');
```

2. Abre la pestaña **Network**
3. Refresca la página
4. Busca una llamada a `crm_clients`
5. Revisa la respuesta (Response tab)

Si la respuesta está vacía pero sabemos que hay 1 cliente, el filtro está mal.

---

## Verificación Manual Rápida

### En la consola del navegador, ejecuta:

```javascript
// Test connection
const { data, error } = await fetch(
  'https://aaftjwktzpnyjwklroww.supabase.co/rest/v1/crm_clients?select=*',
  {
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('sb-token'),
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  }
).then(r => r.json())

console.log(data)
```

Si ves 1 cliente, el problema es en el React component.

---

## Pasos para Resolver (Orden recomendado)

### 1. Refresca el navegador
```
Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)
```

### 2. Verifica F12 → Console
- ¿Hay errores rojos?
- Copia el error exacto

### 3. Verifica F12 → Network
- Busca requests a `crm_clients`
- ¿Responden con 200 o error?
- ¿La respuesta tiene datos?

### 4. Si aún no funciona
- Ejecuta `npm run dev` nuevamente
- Recarga el navegador
- Limpia cache: Cmd+Option+E (Mac) o Ctrl+Shift+Delete (Windows)

### 5. Si sigue sin funcionar
Copia el error de la consola y reporta.

---

## Verificación en Supabase Dashboard

Ve a: **Table Editor** → `crm_clients`

¿Ves 1 fila con datos del cliente "antonio mohameht"?

**Sí:** ✅ Los datos están en la BD. Problema es frontend.
**No:** ❌ Hay problema con la migración o datos.

---

## Próximos Pasos

1. Abre el navegador y ve a CRM
2. Abre F12 → Console
3. Reporta:
   - ¿Hay errores? ¿Cuál es el mensaje exacto?
   - ¿Se muestra el cliente o está vacío?

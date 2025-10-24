# URGENTE: Aplicar esquema CRM en Supabase

## ⚠️ Estado Actual
Las tablas CRM (`crm_clients`, `crm_interactions`, `crm_tags`, `crm_tasks`, `crm_documents`) **NO EXISTEN** en Supabase y por eso el CRM no funciona.

## ✅ Solución: Ejecutar SQL en Supabase Dashboard

### Paso 1: Abre el SQL Editor de Supabase
1. Abre https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a la sección **SQL Editor** en el menú izquierdo
4. Haz clic en **New Query**

### Paso 2: Copia el SQL de reparación
Abre el archivo: `supabase/migrations/20251024080000_repair_and_create_crm_tables.sql`

Copia TODO su contenido (desde `-- CRM Module Repair Migration` hasta el final).

### Paso 3: Pega en el editor de Supabase
- Haz clic en el editor de texto en blanco en Supabase
- Pega TODO el SQL
- Haz clic en el botón **Run** (verde, en la parte superior derecha)

### Paso 4: Verifica que funcionó
Deberías ver un mensaje como: `Query executed successfully`

## 🔍 Verificar que las tablas se crearon

Después de ejecutar, abre otra consulta y ejecuta:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'crm_%'
ORDER BY table_name;
```

Deberías ver 5 tablas:
- crm_clients
- crm_documents
- crm_interactions
- crm_tags
- crm_tasks

## ❌ Si encuentras errores

### Error: "relation already exists"
Esto es normal si la tabla ya fue creada parcialmente. El SQL tiene `CREATE TABLE IF NOT EXISTS`, así que puede ejecutarse múltiples veces sin problemas.

### Error: "function does not exist"
Significa que la función `update_updated_at_column()` no se creó. Intenta ejecutar solo esta parte primero:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

Luego ejecuta el SQL completo nuevamente.

## 🚀 Una vez listo

Después que las tablas existan:
1. Recarga la página web del CRM
2. Intenta crear un cliente nuevamente
3. Debería funcionar sin errores

## 📋 Resumen de lo que hace el SQL

1. ✅ Crea función `update_updated_at_column()`  
2. ✅ Crea tabla `crm_clients` - almacena información de clientes
3. ✅ Crea tabla `crm_interactions` - registra interacciones con clientes
4. ✅ Crea tabla `crm_tags` - etiquetas para clasificar clientes
5. ✅ Crea tabla `crm_tasks` - tareas y recordatorios del CRM
6. ✅ Crea tabla `crm_documents` - documentos y archivos de clientes
7. ✅ Crea índices para optimizar queries
8. ✅ Habilita Row Level Security (RLS) 
9. ✅ Crea políticas RLS para seguridad
10. ✅ Crea triggers para actualización automática de timestamps
11. ✅ Inserta 5 tags por defecto

## 💡 Nota técnica

El problema fue que las migraciones anteriores fueron registradas como ejecutadas pero fallaron silenciosamente porque faltaba la función `update_updated_at_column()`. Esta migración de reparación soluciona todo.

# Aplicar Migraciones CRM en Supabase

Las tablas CRM necesitan ser creadas en Supabase para que el sistema funcione correctamente.

## Método 1: Usar Supabase Dashboard (Recomendado)

1. Abre https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Haz clic en "New Query"
5. Copia y pega el contenido de este archivo en el editor
6. Haz clic en "Run"

**Archivo SQL a ejecutar:**
`supabase/migrations/20251024053805_create_crm_tables_v2.sql`

## Método 2: Usar Supabase CLI

```bash
# Conectar con tu proyecto
supabase link --project-ref [project-ref]

# Ejecutar migraciones
supabase db push
```

## Método 3: Copiar y pegar el SQL en dashboard

Abre el archivo `supabase/migrations/20251024053805_create_crm_tables_v2.sql` y copia TODO su contenido en el SQL Editor de Supabase.

---

## SQL a Ejecutar

Si ejecutas manualmente, asegúrate de ejecutar en este orden:

1. Crear función `update_updated_at_column()` (si no existe)
2. Crear tabla `crm_clients`
3. Crear tabla `crm_interactions`
4. Crear tabla `crm_tags`
5. Crear tabla `crm_tasks`
6. Crear tabla `crm_documents`
7. Crear índices
8. Habilitar RLS en todas las tablas
9. Crear políticas RLS
10. Crear triggers

**Función requerida (ejecutar primero):**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## Verificar que las migraciones se aplicaron

```sql
-- Ver todas las tablas CRM
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'crm_%';

-- Debería mostrar:
-- crm_clients
-- crm_interactions
-- crm_tags
-- crm_tasks
-- crm_documents
```

Si ves estas 5 tablas, las migraciones fueron exitosas.

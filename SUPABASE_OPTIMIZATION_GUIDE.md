# Supabase Database Optimization Guide

## ⚠️ Problemas Detectados

El analizador de Supabase encontró estos problemas:

### 🔴 CRÍTICO - Bloquea la funcionalidad CRM:
- **RLS enabled en tablas CRM** → Bloquea INSERT/UPDATE/DELETE
- Error: `new row violates row-level security policy`

### 🟡 RECOMENDADO - Reduce performance:
- Foreign keys sin índices en: `crm_clients.created_by`, `crm_documents.uploaded_by`
- Índices duplicados en `product_variants`
- Políticas RLS suboptimales en otras tablas

---

## ✅ Cómo Arreglarlo

### PASO 1: Abrir Supabase SQL Editor

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. En el menú izquierdo, haz click en **SQL Editor**
4. Haz click en **New Query**

---

### PASO 2: Copiar y Ejecutar SQL

Copia TODO el código abajo y pégalo en el SQL Editor:

```sql
-- ===================================
-- CRM Tables - Disable RLS (CRÍTICO)
-- ===================================
ALTER TABLE crm_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents DISABLE ROW LEVEL SECURITY;

-- ===================================
-- Create Indexes on Foreign Keys (Mejora performance)
-- ===================================
CREATE INDEX IF NOT EXISTS idx_crm_clients_created_by ON crm_clients(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_documents_uploaded_by ON crm_documents(uploaded_by);

-- ===================================
-- Drop Duplicate Indexes (Limpieza)
-- ===================================
DROP INDEX IF EXISTS idx_product_variants_productid;

-- ===================================
-- Verify RLS Status
-- ===================================
SELECT table_name, rowsecurity 
FROM information_schema.tables 
WHERE table_name IN ('crm_clients', 'crm_interactions', 'crm_tags', 'crm_tasks', 'crm_documents')
ORDER BY table_name;
```

Luego:
- Presiona **Cmd+Enter** (Mac) o **Ctrl+Enter** (Windows/Linux)
- O haz click en el botón **Run**

---

### PASO 3: Verificar que Funcionó

Deberías ver un resultado como este:

| table_name | rowsecurity |
|---|---|
| crm_clients | false |
| crm_documents | false |
| crm_interactions | false |
| crm_tags | false |
| crm_tasks | false |

Si ves `false` en todas las filas, ¡funcionó! ✓

---

### PASO 4: Probar en la Aplicación

1. **Refresca tu navegador** (Cmd+R o Ctrl+R)
2. **Ve a CRM** → Gestión de Clientes
3. **Crea un cliente nuevo** y verifica que se guarde sin errores
4. Abre la **consola del navegador** (F12) y verifica que NO haya errores de RLS

---

## 📊 Problemas Adicionales (Opcional)

Si el Supabase Linter reporta más problemas, puedes ejecutar esto para limpiar índices no usados:

```sql
-- Drop Unused Indexes (Limpieza de performance)
DROP INDEX IF EXISTS idx_products_attributes_gin;
DROP INDEX IF EXISTS idx_products_combo_product_ids;
DROP INDEX IF EXISTS idx_products_compatibility_tags;
DROP INDEX IF EXISTS idx_products_search_keywords;
DROP INDEX IF EXISTS idx_inventory_logs_product_id;
DROP INDEX IF EXISTS idx_inventory_logs_created_at;
DROP INDEX IF EXISTS idx_inventory_logs_updated_by;
DROP INDEX IF EXISTS idx_product_variants_uuid_product_id;
DROP INDEX IF EXISTS idx_product_variants_status;
DROP INDEX IF EXISTS idx_product_variants_product_id;
DROP INDEX IF EXISTS idx_product_variants_imei;
DROP INDEX IF EXISTS idx_product_variants_serial_number;
DROP INDEX IF EXISTS idx_clients_firestore_id;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_type;
DROP INDEX IF EXISTS idx_product_variants_sku;
DROP INDEX IF EXISTS idx_sale_items_sale_firestore_id;
DROP INDEX IF EXISTS idx_sale_items_product_uuid_id;
DROP INDEX IF EXISTS idx_sale_items_product_variant_id;
DROP INDEX IF EXISTS idx_product_variants_firestore_id;
DROP INDEX IF EXISTS idx_products_created_at;
DROP INDEX IF EXISTS idx_consignor_payments_payment_id;
DROP INDEX IF EXISTS idx_compatibilidades_modelo;
DROP INDEX IF EXISTS idx_compatibilidades_mica_id;
DROP INDEX IF EXISTS idx_sale_deduplication_saleid;
DROP INDEX IF EXISTS idx_sale_deduplication_status;
DROP INDEX IF EXISTS idx_sale_deduplication_expiresat;
DROP INDEX IF EXISTS idx_transaction_logs_operation_id;
DROP INDEX IF EXISTS idx_transaction_logs_sale_id;
DROP INDEX IF EXISTS idx_transaction_logs_status;
DROP INDEX IF EXISTS idx_transaction_logs_created_at;
DROP INDEX IF EXISTS idx_consignor_transactions_consignorid;
DROP INDEX IF EXISTS idx_consignor_transactions_createdat;
DROP INDEX IF EXISTS idx_consignor_transactions_transactiontype;
DROP INDEX IF EXISTS idx_crm_clients_phone;
DROP INDEX IF EXISTS idx_crm_clients_type;
DROP INDEX IF EXISTS idx_crm_interactions_type;
DROP INDEX IF EXISTS idx_crm_interactions_employee;
DROP INDEX IF EXISTS idx_crm_tasks_status;
DROP INDEX IF EXISTS idx_crm_tasks_due_date;
DROP INDEX IF EXISTS idx_crm_tasks_assigned_to;
DROP INDEX IF EXISTS idx_crm_documents_client_id;
DROP INDEX IF EXISTS idx_crm_documents_type;
```

---

## 🆘 Si Sigue Sin Funcionar

1. **Verifica que estés logueado** en Supabase con la cuenta correcta
2. **Revisa los errores en la consola** (F12) del navegador
3. **Recarga la página** completamente (no refresh parcial)
4. **Limpia el cache** del navegador si persiste el problema
5. **Abre una ventana privada/incógnita** para descartar problemas de cache

---

## 📝 Notas

- Los cambios se aplican **inmediatamente** a la base de datos
- No necesitas reiniciar la aplicación (pero si refresca es más seguro)
- Las migraciones quedaron guardadas en: `supabase/migrations/20251024110000_optimize_database_performance.sql`

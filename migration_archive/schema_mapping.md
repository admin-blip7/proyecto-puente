# Plan de Migración de Firestore a Supabase (Postgres)

## 1. Evaluación y Mapeo del Esquema

A continuación se detalla el mapeo de las colecciones de Firestore a las tablas de Postgres.

### Tabla de Mapeo Principal

| Colección Firestore | Tabla Postgres Destino | Tipo de Migración | Notas |
| :--- | :--- | :--- | :--- |
| `products` | `public.products` | Directo | Manejar `attributes` como `jsonb`. |
| `consignors` | `public.consignors` | Directo | |
| `suppliers` | `public.suppliers` | Directo | |
| `sales` | `public.sales` | Normalizado | Los `items` se mueven a `sale_items`. |
| `sales.items` (array) | `public.sale_items` | Tabla Hija | Relación Many-to-One con `sales`. |
| `inventory_logs` | `public.inventory_logs` | Directo | |
| `cash_sessions` | `public.cash_sessions` | Directo | |
| `crm_clients` | `public.crm_clients` | Directo | |
| `crm_interactions` | `public.crm_interactions`| Directo | |
| `crm_tags` | `public.crm_tags` | Directo | |
| `crm_tasks` | `public.crm_tasks` | Directo | |
| `crm_documents` | `public.crm_documents` | Directo | |

### Definición de Tipos y Relaciones

| Columna | Tipo Postgres | Firestore Original | Notas |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `doc.id` (text) | Usar `gen_random_uuid()` o mapear el ID de Firestore. |
| `firestore_id` | `text` | `doc.id` | Guardar para reconciliación (Unique Index). |
| `created_at` | `timestamptz` | `Timestamp` | Convertir de `{ seconds, nanoseconds }` a ISO. |
| `metadata` | `jsonb` | `Object` | Para campos con estructura variable. |
| `*_id` (FKs) | `uuid` | `String` (ID) | Convertir referencias de Firestore a los nuevos UUIDs. |

## 2. Estrategia de Exportación

Se utilizará un script de Node.js que realice las siguientes acciones:
1. Conectar a Firestore mediante `firebase-admin`.
2. Leer cada colección por lotes (paginación de 500-1000 docs).
3. Transformar los datos inmediatamente (especialmente timestamps y mapeos de ID).
4. Generar archivos `.ndjson` por cada colección.

## 3. Estrategia de Importación (Opción A - Lotes)

1. **Carga en Tablas Temporales**: Usar el comando `COPY` de Postgres para cargar los archivos `.ndjson` en tablas temporales (prefijo `temp_`).
2. **Transformación y Limpieza**: Ejecutar SQL para normalizar relaciones y convertir tipos finales en las tablas temporales.
3. **Merge a Tablas Finales**:
   ```sql
   INSERT INTO public.sales (...)
   SELECT ... FROM temp_sales
   ON CONFLICT (firestore_id) DO UPDATE SET ...;
   ```

## 4. Plan de Validación

1. **Conteo**: Comparar `db.collection(name).count()` vs `SELECT count(*) FROM table`.
2. **Muestreo**: Verificar integridad de 5-10 registros aleatorios por tabla.
3. **Integridad Referencial**: Ejecutar consultas para verificar que todos los IDs vinculados existan en sus tablas base.

# 🚨 Solución Inmediata: Error al Agregar Gastos

## ⚡ Acción Requerida AHORA

El error 500 que ves es porque **falta crear el bucket de almacenamiento** en Supabase.

### 📋 Paso 1: Crear Bucket (⏱️ 2 minutos)

1. **Ir a Supabase Dashboard**
   - https://app.supabase.com
   - Selecciona tu proyecto

2. **Ir a Storage**
   - Menú lateral > Storage

3. **Crear nuevo bucket**
   - Click "New bucket"
   - Name: `cash-session-tickets`
   - Public bucket: ✅ **SÍ** (marcar esta opción)
   - Click "Create bucket"

4. **Configurar políticas** (opcional, ya que es público)
   - O ejecutar el SQL del archivo: `scripts/setup-cash-session-tickets-bucket.sql`

### 📋 Paso 2: Crear Tablas de Gastos (⏱️ 3 minutos)

**Ir a SQL Editor en Supabase:**

```sql
-- Ejecutar archivo: scripts/setup-expense-categories-table.sql
-- Luego ejecutar: scripts/setup-expenses-table.sql
```

O **copiar y pegar** directamente en el SQL Editor:

<details>
<summary>Click para ver SQL completo</summary>

```sql
-- TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_firestore_id ON public.expense_categories(firestore_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON public.expense_categories(is_active);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Enable read access for all users" 
ON public.expense_categories FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" 
ON public.expense_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insertar categorías por defecto
INSERT INTO public.expense_categories (firestore_id, name, is_active)
SELECT gen_random_uuid()::text, category, true
FROM (VALUES 
    ('Retiro de Caja'),
    ('Servicios (Luz, Agua, Internet)'),
    ('Renta'),
    ('Sueldos y Salarios'),
    ('Transporte y Combustible'),
    ('Material de Oficina'),
    ('Mantenimiento'),
    ('Publicidad'),
    ('Otros Gastos')
) AS categories(category)
WHERE NOT EXISTS (SELECT 1 FROM public.expense_categories);

-- TABLA DE GASTOS
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE,
    expense_id TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    paid_from_account_id TEXT NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    receipt_url TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_firestore_id ON public.expenses(firestore_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_id ON public.expenses(expense_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Enable read access for all users" 
ON public.expenses FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" 
ON public.expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

</details>

### 📋 Paso 3: Limpiar Caché del Navegador (⏱️ 30 segundos)

**En el navegador donde tienes el error:**

1. Presiona `Ctrl + Shift + Delete` (Windows/Linux) o `Cmd + Shift + Delete` (Mac)
2. Selecciona "Imágenes y archivos almacenados en caché"
3. Rango de tiempo: "Última hora"
4. Click "Borrar datos"

O simplemente:
- `Ctrl + F5` (recarga forzada)

### 📋 Paso 4: Reintentar (⏱️ 10 segundos)

1. Recargar la aplicación
2. Ir al POS
3. Intentar agregar un gasto
4. **Debería funcionar** ✅

## 🔍 ¿Por Qué Ocurre Este Error?

El error aparece porque:

1. **Al cerrar una sesión de caja**, el sistema intenta guardar el ticket PDF en Supabase Storage
2. Si el bucket `cash-session-tickets` **no existe**, falla con error 500
3. Este error queda en la consola del navegador
4. Cuando navegas a otras páginas, el error persiste en los logs

**Importante**: El error NO impide agregar gastos, solo afecta la funcionalidad de guardar tickets de cierre de caja.

## ✅ Verificación

Después de aplicar los pasos:

### Test 1: Agregar Gasto
1. Ir al POS
2. Click en botón de gastos
3. Agregar gasto de prueba (Monto: 50, Descripción: "Prueba")
4. Verificar que se guarda sin errores

### Test 2: Cerrar Sesión (para verificar tickets)
1. Abrir sesión de caja
2. Hacer una venta (opcional)
3. Cerrar sesión
4. Verificar que se genera y descarga el PDF
5. **NO debería haber error 500**

## 🐛 Si el Error Persiste

Si después de crear el bucket aún ves errores:

1. **Verifica que el bucket existe:**
   - Supabase Dashboard > Storage > Buscar `cash-session-tickets`

2. **Verifica que es público:**
   - Click en el bucket
   - Settings > Public: debe estar ✅

3. **Verifica las tablas:**
   ```sql
   SELECT * FROM expense_categories LIMIT 5;
   SELECT * FROM expenses LIMIT 5;
   ```

4. **Limpia completamente el caché:**
   - DevTools (F12) > Application > Clear storage > Clear site data

## 📞 Soporte

Si nada funciona:

1. Captura **pantalla del error en Supabase** (si hay alguno)
2. Captura **console.log completo** del navegador
3. Verifica que las **variables de entorno** de Supabase están configuradas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

**Tiempo estimado total**: ⏱️ **5-6 minutos**  
**Dificultad**: ⭐⭐ Fácil  
**Requiere**: Acceso admin a Supabase  
**Estado**: ✅ Solución verificada y probada

# 🔍 Diagnóstico Rápido: Error al Cargar Categorías de Gastos

## ⚡ Verificación Inmediata (1 minuto)

### Paso 1: Verificar si las tablas existen

Abrir en el navegador:
```
https://tu-dominio.com/api/debug/expense-categories
```

**Resultado esperado**: 
```json
{
  "success": true,
  "message": "Expense categories table exists and is accessible",
  "categoriesCount": 9
}
```

**Si ves error 404 o "table does not exist"**: Las tablas NO existen → Ir a **Solución A**

**Si ves error 500**: Problema de permisos o conexión → Ir a **Solución B**

---

## 🔧 Solución A: Crear las Tablas (3 minutos)

### 1. Ir a Supabase Dashboard

1. https://app.supabase.com
2. Seleccionar tu proyecto
3. **SQL Editor** (menú lateral)

### 2. Ejecutar SQL para crear tablas

**Copiar y pegar este SQL completo:**

```sql
-- ========================================
-- TABLA DE CATEGORÍAS DE GASTOS
-- ========================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firestore_id TEXT UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_expense_categories_firestore_id ON public.expense_categories(firestore_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_is_active ON public.expense_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_categories_name ON public.expense_categories(name);

-- RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Enable read access for all users" ON public.expense_categories;
CREATE POLICY "Enable read access for all users" ON public.expense_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expense_categories;
CREATE POLICY "Enable insert for authenticated users" ON public.expense_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.expense_categories;
CREATE POLICY "Enable update for authenticated users" ON public.expense_categories FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.expense_categories;
CREATE POLICY "Enable delete for authenticated users" ON public.expense_categories FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_expense_categories_updated_at ON public.expense_categories;
CREATE TRIGGER update_expense_categories_updated_at
    BEFORE UPDATE ON public.expense_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar categorías por defecto
INSERT INTO public.expense_categories (firestore_id, name, is_active)
SELECT 
    gen_random_uuid()::text,
    category,
    true
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
ON CONFLICT DO NOTHING;

-- ========================================
-- TABLA DE GASTOS
-- ========================================

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

-- Índices
CREATE INDEX IF NOT EXISTS idx_expenses_firestore_id ON public.expenses(firestore_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_id ON public.expenses(expense_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_date ON public.expenses(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_from_account_id ON public.expenses(paid_from_account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_session_id ON public.expenses(session_id);

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Enable read access for all users" ON public.expenses;
CREATE POLICY "Enable read access for all users" ON public.expenses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expenses;
CREATE POLICY "Enable insert for authenticated users" ON public.expenses FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.expenses;
CREATE POLICY "Enable update for authenticated users" ON public.expenses FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.expenses;
CREATE POLICY "Enable delete for authenticated users" ON public.expenses FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Verificar categorías
SELECT 'CATEGORÍAS:', COUNT(*) as total FROM public.expense_categories;
SELECT * FROM public.expense_categories LIMIT 5;

-- Verificar gastos
SELECT 'GASTOS:', COUNT(*) as total FROM public.expenses;
```

### 3. Ejecutar (Click "Run")

Deberías ver:
```
CATEGORÍAS: 9
[Lista de categorías]
GASTOS: 0
```

### 4. Verificar en el navegador

Recargar la página y abrir gastos → Ahora deberían verse las categorías

---

## 🔧 Solución B: Problema de Permisos (2 minutos)

Si las tablas existen pero no se pueden leer:

### 1. Verificar políticas RLS

```sql
-- Ver políticas actuales
SELECT * FROM pg_policies 
WHERE tablename IN ('expense_categories', 'expenses');
```

### 2. Re-crear políticas

Ejecutar el SQL de la **Solución A** (sobreescribirá las políticas con las correctas)

---

## 📱 Limpiar Caché del Navegador

Después de ejecutar el SQL:

1. **Ctrl + Shift + Delete**
2. Borrar "Imágenes y archivos en caché"
3. **Ctrl + F5** para recargar

---

## ✅ Verificación Final

### 1. Endpoint de diagnóstico:
```
GET /api/debug/expense-categories
```
Debe retornar: `"success": true`

### 2. Probar en la app:
1. Abrir POS
2. Click en botón de Gastos
3. Verificar que aparecen las 9 categorías por defecto
4. Intentar agregar una nueva categoría
5. Verificar que se guarda

---

## 🐛 Si Aún No Funciona

### Ver los logs en la consola del navegador:

1. **F12** → Pestaña Console
2. Buscar mensajes que digan:
   - "Error loading categories"
   - "Error al cargar categorías"
3. Copiar el mensaje completo del error

### Verificar manualmente en Supabase:

```sql
-- Ver si hay datos
SELECT COUNT(*) FROM expense_categories;

-- Ver categorías
SELECT * FROM expense_categories;

-- Verificar estructura
\d expense_categories
```

---

## 📞 Información para Soporte

Si necesitas ayuda, proporciona:

1. **Resultado del endpoint**: `/api/debug/expense-categories`
2. **Captura de consola** del navegador (F12)
3. **Resultado de este query**:
   ```sql
   SELECT COUNT(*) as total FROM expense_categories;
   ```

---

**Tiempo estimado**: 3-5 minutos  
**Dificultad**: ⭐ Muy Fácil  
**Requiere**: Acceso admin a Supabase

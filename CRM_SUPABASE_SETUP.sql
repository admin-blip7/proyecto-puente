-- =======================================================
-- CONFIGURACIÓN DE TABLAS CRM PARA SUPABASE
-- Ejecutar este SQL en el Editor SQL de Supabase Studio
-- =======================================================

-- 1. Crear función para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Crear tabla crm_clients
CREATE TABLE IF NOT EXISTS crm_clients (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    firestore_id TEXT UNIQUE NOT NULL,
    client_code TEXT UNIQUE NOT NULL,
    identification_type TEXT NOT NULL CHECK (identification_type IN ('cedula', 'ruc', 'pasaporte')),
    identification_number TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    company_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    secondary_phone TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    client_type TEXT NOT NULL DEFAULT 'particular' CHECK (client_type IN ('particular', 'empresa', 'recurrente')),
    client_status TEXT NOT NULL DEFAULT 'active' CHECK (client_status IN ('active', 'inactive', 'pending', 'blacklisted')),
    registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_contact_date TIMESTAMPTZ,
    total_purchases DECIMAL(12, 2) DEFAULT 0.00,
    outstanding_balance DECIMAL(12, 2) DEFAULT 0.00,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Crear tabla crm_interactions
CREATE TABLE IF NOT EXISTS crm_interactions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    firestore_id TEXT UNIQUE NOT NULL,
    client_id BIGINT REFERENCES crm_clients(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('sale', 'repair', 'credit_payment', 'warranty', 'contact', 'consignment', 'follow_up')),
    related_id UUID,
    related_table TEXT,
    interaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    amount DECIMAL(12, 2),
    status TEXT,
    employee_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Crear tabla crm_tags
CREATE TABLE IF NOT EXISTS crm_tags (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    firestore_id TEXT UNIQUE NOT NULL,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6B7280',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Crear tabla crm_tasks
CREATE TABLE IF NOT EXISTS crm_tasks (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    firestore_id TEXT UNIQUE NOT NULL,
    client_id BIGINT REFERENCES crm_clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Crear tabla crm_documents
CREATE TABLE IF NOT EXISTS crm_documents (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    firestore_id TEXT UNIQUE NOT NULL,
    client_id BIGINT REFERENCES crm_clients(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('identification', 'contract', 'warranty', 'invoice', 'other')),
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size DECIMAL(10, 2),
    mime_type TEXT,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_crm_clients_identification ON crm_clients(identification_number);
CREATE INDEX IF NOT EXISTS idx_crm_clients_email ON crm_clients(email);
CREATE INDEX IF NOT EXISTS idx_crm_clients_phone ON crm_clients(phone);
CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON crm_clients(client_status);
CREATE INDEX IF NOT EXISTS idx_crm_clients_type ON crm_clients(client_type);
CREATE INDEX IF NOT EXISTS idx_crm_clients_registration_date ON crm_clients(registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_clients_firestore_id ON crm_clients(firestore_id);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_client_id ON crm_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_date ON crm_interactions(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_firestore_id ON crm_interactions(firestore_id);

CREATE INDEX IF NOT EXISTS idx_crm_tags_name ON crm_tags(name);
CREATE INDEX IF NOT EXISTS idx_crm_tags_firestore_id ON crm_tags(firestore_id);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_client_id ON crm_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_firestore_id ON crm_tasks(firestore_id);

CREATE INDEX IF NOT EXISTS idx_crm_documents_client_id ON crm_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_documents_type ON crm_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_crm_documents_firestore_id ON crm_documents(firestore_id);

-- 8. Habilitar Row Level Security (RLS)
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;

-- 9. Crear políticas de RLS para usuarios autenticados
CREATE POLICY "Users can view crm_clients" ON crm_clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_clients" ON crm_clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_clients" ON crm_clients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_clients" ON crm_clients
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view crm_interactions" ON crm_interactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_interactions" ON crm_interactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_interactions" ON crm_interactions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_interactions" ON crm_interactions
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view crm_tags" ON crm_tags
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_tags" ON crm_tags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_tags" ON crm_tags
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_tags" ON crm_tags
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view crm_tasks" ON crm_tasks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_tasks" ON crm_tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_tasks" ON crm_tasks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_tasks" ON crm_tasks
    FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view crm_documents" ON crm_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_documents" ON crm_documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_documents" ON crm_documents
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_documents" ON crm_documents
    FOR DELETE USING (auth.role() = 'authenticated');

-- 10. Crear triggers para updated_at
DROP TRIGGER IF EXISTS update_crm_clients_updated_at ON crm_clients;
CREATE TRIGGER update_crm_clients_updated_at
    BEFORE UPDATE ON crm_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_interactions_updated_at ON crm_interactions;
CREATE TRIGGER update_crm_interactions_updated_at
    BEFORE UPDATE ON crm_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_tags_updated_at ON crm_tags;
CREATE TRIGGER update_crm_tags_updated_at
    BEFORE UPDATE ON crm_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_tasks_updated_at ON crm_tasks;
CREATE TRIGGER update_crm_tasks_updated_at
    BEFORE UPDATE ON crm_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Insertar tags por defecto
INSERT INTO crm_tags (firestore_id, name, color, description) VALUES
    (gen_random_uuid()::text, 'VIP', '#FFD700', 'Cliente VIP con beneficios especiales'),
    (gen_random_uuid()::text, 'Moroso', '#EF4444', 'Cliente con pagos pendientes'),
    (gen_random_uuid()::text, 'Preferencial', '#10B981', 'Cliente preferencial con descuentos'),
    (gen_random_uuid()::text, 'Nuevo', '#3B82F6', 'Cliente reciente en el negocio'),
    (gen_random_uuid()::text, 'Inactivo', '#6B7280', 'Cliente sin actividad reciente')
ON CONFLICT (name) DO NOTHING;

-- 12. Verificar que las tablas se crearon correctamente
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name LIKE 'crm_%'
ORDER BY table_name;
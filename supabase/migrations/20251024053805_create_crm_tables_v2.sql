-- ===================================
-- CRM Module Migration v2
-- Complete CRM System for Client Management
-- ===================================

-- Create crm_clients table
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

-- Create crm_interactions table
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

-- Create crm_tags table for custom tags
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

-- Create crm_tasks table
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

-- Create crm_documents table for client documents
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_clients_identification ON crm_clients(identification_number);
CREATE INDEX IF NOT EXISTS idx_crm_clients_email ON crm_clients(email);
CREATE INDEX IF NOT EXISTS idx_crm_clients_phone ON crm_clients(phone);
CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON crm_clients(client_status);
CREATE INDEX IF NOT EXISTS idx_crm_clients_type ON crm_clients(client_type);
CREATE INDEX IF NOT EXISTS idx_crm_clients_registration_date ON crm_clients(registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_clients_total_purchases ON crm_clients(total_purchases DESC);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_client_id ON crm_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON crm_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_date ON crm_interactions(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_employee ON crm_interactions(employee_id);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_client_id ON crm_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_date ON crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON crm_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_crm_documents_client_id ON crm_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_documents_type ON crm_documents(document_type);

-- Enable RLS on all tables
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for crm_clients
CREATE POLICY "Users can view crm_clients" ON crm_clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_clients" ON crm_clients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_clients" ON crm_clients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_clients" ON crm_clients
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for crm_interactions
CREATE POLICY "Users can view crm_interactions" ON crm_interactions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_interactions" ON crm_interactions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_interactions" ON crm_interactions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_interactions" ON crm_interactions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for crm_tags
CREATE POLICY "Users can view crm_tags" ON crm_tags
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_tags" ON crm_tags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_tags" ON crm_tags
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_tags" ON crm_tags
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for crm_tasks
CREATE POLICY "Users can view crm_tasks" ON crm_tasks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_tasks" ON crm_tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_tasks" ON crm_tasks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_tasks" ON crm_tasks
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for crm_documents
CREATE POLICY "Users can view crm_documents" ON crm_documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert crm_documents" ON crm_documents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update crm_documents" ON crm_documents
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete crm_documents" ON crm_documents
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
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

-- Insert default tags
INSERT INTO crm_tags (firestore_id, name, color, description) VALUES
    (gen_random_uuid()::text, 'VIP', '#FFD700', 'Cliente VIP con beneficios especiales'),
    (gen_random_uuid()::text, 'Moroso', '#EF4444', 'Cliente con pagos pendientes'),
    (gen_random_uuid()::text, 'Preferencial', '#10B981', 'Cliente preferencial con descuentos'),
    (gen_random_uuid()::text, 'Nuevo', '#3B82F6', 'Cliente reciente en el negocio'),
    (gen_random_uuid()::text, 'Inactivo', '#6B7280', 'Cliente sin actividad reciente')
ON CONFLICT (name) DO NOTHING;
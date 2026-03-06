-- Migration para Sistema RBAC
-- Nombre: 20260221000005_rbac_system.sql

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '[]'::jsonb,
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permisos específicos por usuario
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id),
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas de Roles
CREATE POLICY "Roles are viewable by everyone"
    ON public.roles FOR SELECT
    USING (true);

CREATE POLICY "Master admin can manage all roles"
    ON public.roles FOR ALL
    USING (auth.jwt() ->> 'email' = 'admin@22electronicgroup.com');

CREATE POLICY "Partners can manage their own roles"
    ON public.roles FOR ALL
    USING (partner_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid()));

-- Políticas de User Permissions
CREATE POLICY "Users can read their own permissions"
    ON public.user_permissions FOR SELECT
    USING (auth.uid() = user_id OR auth.jwt() ->> 'email' = 'admin@22electronicgroup.com' OR 
          EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Socio' AND partner_id = (SELECT partner_id FROM public.profiles WHERE p.id = user_id)));

CREATE POLICY "Master admin can do all on user_permissions"
    ON public.user_permissions FOR ALL
    USING (auth.jwt() ->> 'email' = 'admin@22electronicgroup.com');

CREATE POLICY "Partners can manage their users permissions"
    ON public.user_permissions FOR ALL
    USING (EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Socio' AND partner_id = (SELECT partner_id FROM public.profiles WHERE id = user_id)));

-- Insertar roles del sistema base
INSERT INTO public.roles (name, description, is_system, permissions) VALUES
('Master Admin', 'Acceso total al sistema', true, '[]'::jsonb),
('Socio', 'Administrador de partner', true, '[]'::jsonb),
('Admin de Tienda', 'Administrador de una sucursal específica', true, '[]'::jsonb),
('Cajero', 'Ventas y operaciones básicas', true, '[]'::jsonb)
ON CONFLICT DO NOTHING;

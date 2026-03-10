-- ============================================================================
-- Sistema de Rutas y Entregas (Fase 1)
-- Creado: 2026-02-22
-- Descripción: Modelo base para rutas, paradas, items y confirmaciones de entrega
-- ============================================================================

-- Reusar helper global para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper de autorización tenant-aware para políticas RLS
CREATE OR REPLACE FUNCTION public.can_access_partner_branch(
  row_partner_id UUID,
  row_branch_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_branch TEXT;
  jwt_partner TEXT;
BEGIN
  -- backend/service role: acceso total
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- admin master (sin partner_id): acceso total
  IF auth.jwt()->>'role' = 'Admin' AND (auth.jwt()->>'partner_id' IS NULL OR auth.jwt()->>'partner_id' = '') THEN
    RETURN TRUE;
  END IF;

  jwt_partner := auth.jwt()->>'partner_id';
  IF jwt_partner IS NULL OR row_partner_id IS NULL OR row_partner_id::TEXT <> jwt_partner THEN
    RETURN FALSE;
  END IF;

  current_branch := current_setting('app.current_branch_id', true);
  IF current_branch IS NULL OR current_branch = '' THEN
    RETURN TRUE;
  END IF;

  -- si la fila no tiene branch explícita, se permite dentro del partner
  IF row_branch_id IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN row_branch_id::TEXT = current_branch;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1) Tabla principal de rutas de entrega
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_code TEXT NOT NULL,
  route_name TEXT,

  route_type TEXT NOT NULL DEFAULT 'standard' CHECK (route_type IN ('standard', 'express', 'pickup')),
  assigned_to TEXT,
  driver_id UUID REFERENCES auth.users(id),
  branch_id UUID REFERENCES public.branches(id),

  delivery_date DATE NOT NULL,
  departure_time TIME,
  estimated_return_time TIME,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  total_orders INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  total_failed_deliveries INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,

  notes TEXT,
  internal_notes TEXT,

  partner_id UUID NOT NULL REFERENCES public.partners(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT delivery_routes_metrics_non_negative CHECK (
    total_orders >= 0
    AND total_deliveries >= 0
    AND total_failed_deliveries >= 0
    AND total_amount >= 0
  ),
  CONSTRAINT delivery_routes_route_code_partner_unique UNIQUE (partner_id, route_code)
);

COMMENT ON TABLE public.delivery_routes IS 'Rutas de entrega por fecha y repartidor';

-- ----------------------------------------------------------------------------
-- 2) Paradas por ruta
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.delivery_routes(id) ON DELETE CASCADE,

  stop_sequence INTEGER NOT NULL CHECK (stop_sequence > 0),
  stop_type TEXT NOT NULL DEFAULT 'delivery' CHECK (stop_type IN ('delivery', 'pickup', 'warehouse')),

  crm_client_id BIGINT, -- BIGINT para compatibilidad con crm_clients.id
  customer_name TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,

  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  estimated_arrival TIME,
  estimated_departure TIME,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'en_route', 'arrived', 'completed', 'failed', 'skipped')),
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,

  delivery_notes TEXT,
  special_instructions TEXT,

  partner_id UUID NOT NULL REFERENCES public.partners(id),
  branch_id UUID REFERENCES public.branches(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT delivery_route_stops_sequence_unique UNIQUE (route_id, stop_sequence)
);

COMMENT ON TABLE public.delivery_route_stops IS 'Paradas secuenciadas de una ruta de entrega';

-- ----------------------------------------------------------------------------
-- 3) Items por parada
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_stop_id UUID NOT NULL REFERENCES public.delivery_route_stops(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.delivery_routes(id) ON DELETE CASCADE,

  sale_id UUID REFERENCES public.sales(id),
  sale_item_id UUID,

  product_id TEXT,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  delivered_quantity INTEGER NOT NULL DEFAULT 0 CHECK (delivered_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'returned', 'damaged')),
  delivery_photo_url TEXT,
  recipient_signature TEXT,
  recipient_name TEXT,
  notes TEXT,

  partner_id UUID NOT NULL REFERENCES public.partners(id),
  branch_id UUID REFERENCES public.branches(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT delivery_items_qty_consistency CHECK (delivered_quantity <= quantity)
);

COMMENT ON TABLE public.delivery_items IS 'Items de venta asociados a una parada de ruta';

-- ----------------------------------------------------------------------------
-- 4) Evidencias de entrega (foto / geolocalización)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_stop_id UUID NOT NULL REFERENCES public.delivery_route_stops(id) ON DELETE CASCADE,
  delivery_item_id UUID REFERENCES public.delivery_items(id) ON DELETE CASCADE,

  photo_url TEXT NOT NULL,
  photo_public_url TEXT,
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  taken_by UUID REFERENCES auth.users(id),

  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),

  notes TEXT,

  partner_id UUID NOT NULL REFERENCES public.partners(id),
  branch_id UUID REFERENCES public.branches(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.delivery_confirmations IS 'Evidencias y confirmaciones de entrega por parada/item';

-- ----------------------------------------------------------------------------
-- 5) Enlace de ventas con rutas/paradas
-- ----------------------------------------------------------------------------
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES public.delivery_routes(id),
  ADD COLUMN IF NOT EXISTS route_stop_id UUID REFERENCES public.delivery_route_stops(id);

-- ----------------------------------------------------------------------------
-- 6) Índices
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_delivery_routes_partner_date ON public.delivery_routes(partner_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_partner_status ON public.delivery_routes(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_branch_date ON public.delivery_routes(branch_id, delivery_date) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver_date ON public.delivery_routes(driver_id, delivery_date) WHERE driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_route_stops_route_sequence ON public.delivery_route_stops(route_id, stop_sequence);
CREATE INDEX IF NOT EXISTS idx_delivery_route_stops_partner_status ON public.delivery_route_stops(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_route_stops_branch_status ON public.delivery_route_stops(branch_id, status) WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_route_stops_client ON public.delivery_route_stops(crm_client_id) WHERE crm_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_items_route ON public.delivery_items(route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_stop ON public.delivery_items(route_stop_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_sale ON public.delivery_items(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_items_partner_status ON public.delivery_items(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_items_branch_status ON public.delivery_items(branch_id, status) WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_stop ON public.delivery_confirmations(route_stop_id);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_item ON public.delivery_confirmations(delivery_item_id) WHERE delivery_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_partner_taken_at ON public.delivery_confirmations(partner_id, taken_at);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_branch_taken_at ON public.delivery_confirmations(branch_id, taken_at) WHERE branch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_route_id ON public.sales(route_id) WHERE route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_route_stop_id ON public.sales(route_stop_id) WHERE route_stop_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 7) Triggers updated_at
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_delivery_routes_updated_at ON public.delivery_routes;
CREATE TRIGGER update_delivery_routes_updated_at
BEFORE UPDATE ON public.delivery_routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_route_stops_updated_at ON public.delivery_route_stops;
CREATE TRIGGER update_delivery_route_stops_updated_at
BEFORE UPDATE ON public.delivery_route_stops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_delivery_items_updated_at ON public.delivery_items;
CREATE TRIGGER update_delivery_items_updated_at
BEFORE UPDATE ON public.delivery_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8) RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_confirmations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_routes_select ON public.delivery_routes;
DROP POLICY IF EXISTS delivery_routes_insert ON public.delivery_routes;
DROP POLICY IF EXISTS delivery_routes_update ON public.delivery_routes;
DROP POLICY IF EXISTS delivery_routes_delete ON public.delivery_routes;

CREATE POLICY delivery_routes_select ON public.delivery_routes
FOR SELECT USING (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_routes_insert ON public.delivery_routes
FOR INSERT WITH CHECK (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_routes_update ON public.delivery_routes
FOR UPDATE
USING (public.can_access_partner_branch(partner_id, branch_id))
WITH CHECK (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_routes_delete ON public.delivery_routes
FOR DELETE USING (public.can_access_partner_branch(partner_id, branch_id));

DROP POLICY IF EXISTS delivery_route_stops_select ON public.delivery_route_stops;
DROP POLICY IF EXISTS delivery_route_stops_insert ON public.delivery_route_stops;
DROP POLICY IF EXISTS delivery_route_stops_update ON public.delivery_route_stops;
DROP POLICY IF EXISTS delivery_route_stops_delete ON public.delivery_route_stops;

CREATE POLICY delivery_route_stops_select ON public.delivery_route_stops
FOR SELECT USING (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_route_stops_insert ON public.delivery_route_stops
FOR INSERT WITH CHECK (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_route_stops_update ON public.delivery_route_stops
FOR UPDATE
USING (public.can_access_partner_branch(partner_id, branch_id))
WITH CHECK (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_route_stops_delete ON public.delivery_route_stops
FOR DELETE USING (public.can_access_partner_branch(partner_id, branch_id));

DROP POLICY IF EXISTS delivery_items_select ON public.delivery_items;
DROP POLICY IF EXISTS delivery_items_insert ON public.delivery_items;
DROP POLICY IF EXISTS delivery_items_update ON public.delivery_items;
DROP POLICY IF EXISTS delivery_items_delete ON public.delivery_items;

CREATE POLICY delivery_items_select ON public.delivery_items
FOR SELECT USING (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_items_insert ON public.delivery_items
FOR INSERT WITH CHECK (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_items_update ON public.delivery_items
FOR UPDATE
USING (public.can_access_partner_branch(partner_id, branch_id))
WITH CHECK (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_items_delete ON public.delivery_items
FOR DELETE USING (public.can_access_partner_branch(partner_id, branch_id));

DROP POLICY IF EXISTS delivery_confirmations_select ON public.delivery_confirmations;
DROP POLICY IF EXISTS delivery_confirmations_insert ON public.delivery_confirmations;
DROP POLICY IF EXISTS delivery_confirmations_update ON public.delivery_confirmations;
DROP POLICY IF EXISTS delivery_confirmations_delete ON public.delivery_confirmations;

CREATE POLICY delivery_confirmations_select ON public.delivery_confirmations
FOR SELECT USING (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_confirmations_insert ON public.delivery_confirmations
FOR INSERT WITH CHECK (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_confirmations_update ON public.delivery_confirmations
FOR UPDATE
USING (public.can_access_partner_branch(partner_id, branch_id))
WITH CHECK (public.can_access_partner_branch(partner_id, branch_id));

CREATE POLICY delivery_confirmations_delete ON public.delivery_confirmations
FOR DELETE USING (public.can_access_partner_branch(partner_id, branch_id));

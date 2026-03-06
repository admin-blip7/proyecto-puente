-- Fase 3/4: Contexto persistente por sucursal + sincronizacion de stock

DO $$
BEGIN
  -- helper para agregar branch_id solo si la tabla/columna existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'branch_id') THEN
    ALTER TABLE public.sales ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON public.sales(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_sessions')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_sessions' AND column_name = 'branch_id') THEN
    ALTER TABLE public.cash_sessions ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_cash_sessions_branch_id ON public.cash_sessions(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'branch_id') THEN
    ALTER TABLE public.expenses ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON public.expenses(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incomes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'incomes' AND column_name = 'branch_id') THEN
    ALTER TABLE public.incomes ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_incomes_branch_id ON public.incomes(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_clients')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'crm_clients' AND column_name = 'branch_id') THEN
    ALTER TABLE public.crm_clients ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_crm_clients_branch_id ON public.crm_clients(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'repair_orders')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'repair_orders' AND column_name = 'branch_id') THEN
    ALTER TABLE public.repair_orders ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_repair_orders_branch_id ON public.repair_orders(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'warranties_new')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warranties_new' AND column_name = 'branch_id') THEN
    ALTER TABLE public.warranties_new ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_warranties_new_branch_id ON public.warranties_new(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kardex')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kardex' AND column_name = 'branch_id') THEN
    ALTER TABLE public.kardex ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_kardex_branch_id ON public.kardex(branch_id);
    CREATE INDEX IF NOT EXISTS idx_kardex_branch_product ON public.kardex(branch_id, producto_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounts' AND column_name = 'branch_id') THEN
    ALTER TABLE public.accounts ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_accounts_branch_id ON public.accounts(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'debts')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'debts' AND column_name = 'branch_id') THEN
    ALTER TABLE public.debts ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_debts_branch_id ON public.debts(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expense_categories')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expense_categories' AND column_name = 'branch_id') THEN
    ALTER TABLE public.expense_categories ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_expense_categories_branch_id ON public.expense_categories(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'branch_id') THEN
    ALTER TABLE public.purchase_orders ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch_id ON public.purchase_orders(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'branch_id') THEN
    ALTER TABLE public.suppliers ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_branch_id ON public.suppliers(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consignors')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'consignors' AND column_name = 'branch_id') THEN
    ALTER TABLE public.consignors ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_consignors_branch_id ON public.consignors(branch_id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transfers')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transfers' AND column_name = 'branch_id') THEN
    ALTER TABLE public.transfers ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    CREATE INDEX IF NOT EXISTS idx_transfers_branch_id ON public.transfers(branch_id);
  END IF;
END
$$;

-- Backfill basico de branch_id para filas historicas (solo cuando no exista)
UPDATE public.kardex k
SET branch_id = p.branch_id
FROM public.products p
WHERE k.branch_id IS NULL
  AND p.id = k.producto_id
  AND p.branch_id IS NOT NULL;

UPDATE public.sales s
SET branch_id = cs.branch_id
FROM public.cash_sessions cs
WHERE s.branch_id IS NULL
  AND s.session_id = cs.id
  AND cs.branch_id IS NOT NULL;

UPDATE public.cash_sessions cs
SET branch_id = b.id
FROM public.branches b
WHERE cs.branch_id IS NULL
  AND cs.partner_id = b.partner_id
  AND b.is_main = true;

-- Contexto de sucursal para RLS por sesion SQL
CREATE OR REPLACE FUNCTION public.set_branch_context(p_branch_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_branch_id', p_branch_id::text, true);
END;
$$;

-- Fuente de verdad de stock: branch_stock agregado
CREATE OR REPLACE VIEW public.stock_actual AS
SELECT
  bs.product_id AS producto_id,
  SUM(bs.quantity) AS stock_actual,
  MAX(bs.last_stock_update) AS ultima_actualizacion
FROM public.branch_stock bs
GROUP BY bs.product_id;

-- Sincroniza branch_stock cuando hay movimiento en kardex con branch_id
CREATE OR REPLACE FUNCTION public.sync_branch_stock_from_kardex()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.branch_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.branch_stock (
    branch_id,
    product_id,
    quantity,
    last_stock_update
  )
  VALUES (
    NEW.branch_id,
    NEW.producto_id,
    NEW.stock_nuevo,
    NEW.created_at
  )
  ON CONFLICT (branch_id, product_id)
  DO UPDATE SET
    quantity = EXCLUDED.quantity,
    last_stock_update = EXCLUDED.last_stock_update;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_branch_stock_from_kardex ON public.kardex;
CREATE TRIGGER trg_sync_branch_stock_from_kardex
AFTER INSERT ON public.kardex
FOR EACH ROW
EXECUTE FUNCTION public.sync_branch_stock_from_kardex();

-- RLS para branch_stock con contexto de sucursal seleccionada
DROP POLICY IF EXISTS "branch_stock_select_all" ON public.branch_stock;
DROP POLICY IF EXISTS "branch_stock_select_by_context" ON public.branch_stock;
CREATE POLICY "branch_stock_select_by_context"
ON public.branch_stock
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR (
    auth.jwt()->>'role' = 'Admin'
    AND auth.jwt()->>'partner_id' IS NULL
  )
  OR (
    EXISTS (
      SELECT 1
      FROM public.branches b
      WHERE b.id = public.branch_stock.branch_id
        AND b.partner_id::text = auth.jwt()->>'partner_id'
    )
    AND (
      current_setting('app.current_branch_id', true) IS NULL
      OR public.branch_stock.branch_id::text = current_setting('app.current_branch_id', true)
    )
  )
);

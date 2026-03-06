-- Corrige SELECT RLS de branch_stock para no depender exclusivamente del claim JWT partner_id.
-- Fallback: usar partner_id de profiles(auth.uid()) cuando el claim no exista.

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
        AND b.partner_id::text = COALESCE(
          NULLIF(auth.jwt()->>'partner_id', ''),
          (
            SELECT p.partner_id::text
            FROM public.profiles p
            WHERE p.id = auth.uid()
          )
        )
    )
    AND (
      current_setting('app.current_branch_id', true) IS NULL
      OR public.branch_stock.branch_id::text = current_setting('app.current_branch_id', true)
    )
  )
);

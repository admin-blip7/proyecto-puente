-- Create or replace function to get consignor by ID with proper balance_due column
CREATE OR REPLACE FUNCTION get_consignor_by_id(p_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  contact_info text,
  balance_due numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    c.id,
    c.name,
    c.contact_info,
    c.balance_due,
    c.created_at,
    c.updated_at
  FROM public.consignors c
  WHERE c.id = p_id;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_consignor_by_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_consignor_by_id TO anon;
GRANT EXECUTE ON FUNCTION get_consignor_by_id TO service_role;
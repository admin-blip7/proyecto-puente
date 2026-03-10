CREATE TABLE IF NOT EXISTS wholesale_profit_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id text NOT NULL REFERENCES product_categories(value) ON DELETE CASCADE,
  category_label text NOT NULL,
  profit_percentage numeric(5,2) NOT NULL DEFAULT 0.00
    CHECK (profit_percentage >= 0 AND profit_percentage <= 1000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  CONSTRAINT unique_category_profit UNIQUE (category_id)
);

ALTER TABLE wholesale_profit_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access" ON wholesale_profit_settings;

CREATE POLICY "Admin full access"
  ON wholesale_profit_settings
  FOR ALL
  USING (
    lower(
      coalesce(
        auth.jwt() -> 'user_metadata' ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        ''
      )
    ) = 'admin'
  )
  WITH CHECK (
    lower(
      coalesce(
        auth.jwt() -> 'user_metadata' ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        ''
      )
    ) = 'admin'
  );

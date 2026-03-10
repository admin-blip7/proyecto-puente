-- 1. Columnas en products para unidades seminuevas
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS condition_grade TEXT
    CHECK (condition_grade IN ('A', 'B', 'C')),
  ADD COLUMN IF NOT EXISTS diagnostic_id UUID
    REFERENCES device_diagnostics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cosmetic_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_products_condition_grade
  ON public.products(condition_grade);
CREATE INDEX IF NOT EXISTS idx_products_diagnostic_id
  ON public.products(diagnostic_id);

-- 2. Vista: modelos con resumen de unidades disponibles
-- Usada por la página principal de seminuevos
CREATE OR REPLACE VIEW seminuevo_models AS
SELECT
  p.id               AS model_id,
  p.name             AS model_name,
  p.image_urls       AS image_urls,
  p.attributes       AS model_attributes,
  COUNT(c.id)        AS units_available,
  MIN(c.price)       AS price_from,
  MAX(c.price)       AS price_to,
  array_agg(DISTINCT c.condition_grade ORDER BY c.condition_grade)
                     AS grades_available,
  array_agg(DISTINCT c.attributes->>'storage' ORDER BY c.attributes->>'storage')
                     AS storages_available,
  array_agg(DISTINCT c.attributes->>'color' ORDER BY c.attributes->>'color')
                     AS colors_available
FROM products p
JOIN products c ON c.parent_id = p.id
WHERE p.category = 'Celular Seminuevo'
  AND (p.attributes->>'is_model_template')::boolean = true
  AND c.stock > 0
GROUP BY p.id, p.name, p.image_urls, p.attributes
HAVING COUNT(c.id) > 0;

-- 3. Vista: unidades de un modelo específico (para página de detalle del modelo)
CREATE OR REPLACE VIEW seminuevo_units AS
SELECT
  c.id,
  c.name,
  c.price,
  c.stock,
  c.parent_id,
  c.condition_grade,
  c.cosmetic_notes,
  c.attributes,
  c.image_urls,
  c.diagnostic_id,
  d.model_name,
  d.storage_gb,
  d.color,
  d.battery_health_percent,
  d.battery_cycle_count,
  d.serial_number,
  d.imei,
  d.ios_version
FROM products c
LEFT JOIN device_diagnostics d ON d.id = c.diagnostic_id
WHERE c.category = 'Celular Seminuevo'
  AND c.parent_id IS NOT NULL;

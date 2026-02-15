-- Migration: Add categories with hierarchy
-- Created: 2026-02-14

ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS parent TEXT DEFAULT NULL;
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'category';
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

DELETE FROM product_categories;

INSERT INTO product_categories (value, label, parent, type, sort_order) VALUES 
('accesorios', 'Accesorios', NULL, 'main', 1),
('celulares', 'Celulares', NULL, 'main', 2),
('audio', 'Audio', NULL, 'main', 3),
('wearables', 'Wearables', NULL, 'main', 4),
('camaras', 'Cámaras', NULL, 'main', 5),
('audifonos', 'Audífonos', 'accesorios', 'subcategory', 11),
('cargadores', 'Cargadores', 'accesorios', 'subcategory', 12),
('cables', 'Cables', 'accesorios', 'subcategory', 13),
('fundas', 'Fundas', 'accesorios', 'subcategory', 14),
('telefonos-fijos', 'Teléfonos Fijos', 'accesorios', 'subcategory', 15),
('celulares-nuevos', 'Celulares Nuevos', 'celulares', 'subcategory', 21),
('celulares-seminuevos', 'Celulares Seminuevos', 'celulares', 'subcategory', 22),
('audifonos-bluetooth', 'Audífonos Bluetooth', 'audio', 'subcategory', 31),
('bocinas', 'Bocinas', 'audio', 'subcategory', 32),
('smartwatch', 'Smartwatch', 'wearables', 'subcategory', 41),
('smartband', 'Smartband', 'wearables', 'subcategory', 42),
('camaras-digitales', 'Cámaras Digitales', 'camaras', 'subcategory', 51),
('camaras-accion', 'Cámaras de Acción', 'camaras', 'subcategory', 52);

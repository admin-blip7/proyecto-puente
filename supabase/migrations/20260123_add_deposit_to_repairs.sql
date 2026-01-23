-- Add deposit column to repair_orders table
ALTER TABLE repair_orders ADD COLUMN deposit numeric DEFAULT 0;

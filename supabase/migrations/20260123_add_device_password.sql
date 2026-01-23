-- Add devise_password column to repair_orders table
ALTER TABLE repair_orders ADD COLUMN device_password text;

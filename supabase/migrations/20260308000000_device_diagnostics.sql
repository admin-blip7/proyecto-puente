-- Device diagnostics: stores iPhone scan results
create table if not exists device_diagnostics (
  id uuid primary key default gen_random_uuid(),
  scanned_at timestamptz not null default now(),

  -- Device identity
  udid text not null,
  serial_number text,
  model_id text,          -- e.g. "iPhone15,2"
  model_name text,        -- e.g. "iPhone 14 Pro"
  ios_version text,
  imei text,
  imei2 text,
  color text,
  storage_gb int,

  -- Status
  activation_state text,
  icloud_locked boolean default false,
  paired boolean default true,

  -- Battery
  battery_health_percent numeric(5,1),
  battery_cycle_count int,
  battery_full_charge_capacity int,
  battery_design_capacity int,

  -- Inventory link (set when added to products)
  product_id uuid references products(id) on delete set null,
  added_to_inventory_at timestamptz,

  -- Free notes
  notes text,

  -- Raw JSON for full details
  raw_data jsonb
);

create index if not exists device_diagnostics_serial_idx on device_diagnostics(serial_number);
create index if not exists device_diagnostics_imei_idx on device_diagnostics(imei);
create index if not exists device_diagnostics_scanned_at_idx on device_diagnostics(scanned_at desc);
create index if not exists device_diagnostics_product_id_idx on device_diagnostics(product_id);

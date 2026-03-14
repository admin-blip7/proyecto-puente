import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import type { DeviceResult } from "@/lib/diagnostics/libimobiledevice";

interface PersistedDiagnosticRow {
  udid: string;
  serial_number: string | null;
  model_id: string | null;
  model_name: string | null;
  ios_version: string | null;
  imei: string | null;
  imei2: string | null;
  color: string | null;
  storage_gb: number | null;
  activation_state: string | null;
  icloud_locked: boolean;
  paired: boolean;
  battery_health_percent: number | null;
  battery_cycle_count: number | null;
  battery_full_charge_capacity: number | null;
  battery_design_capacity: number | null;
  scanned_by_user_id: string | null;
  bridge_job_id: string | null;
  bridge_agent_id: string | null;
  raw_data: DeviceResult;
}

interface PersistDiagnosticContext {
  scannedByUserId?: string | null;
  bridgeJobId?: string | null;
  bridgeAgentId?: string | null;
}

function toDiagnosticRow(
  device: DeviceResult,
  context: PersistDiagnosticContext
): PersistedDiagnosticRow | null {
  if (device.error || !device.udid) {
    return null;
  }

  return {
    udid: device.udid,
    serial_number: device.serial_number ?? null,
    model_id: device.model_id ?? null,
    model_name: device.model_name ?? null,
    ios_version: device.ios_version ?? null,
    imei: device.imei ?? null,
    imei2: device.imei2 ?? null,
    color: device.color_marketing ?? device.color ?? null,
    storage_gb: device.storage_gb ?? null,
    activation_state: device.activation_state ?? null,
    icloud_locked: Boolean(device.icloud_locked),
    paired: Boolean(device.paired),
    battery_health_percent: device.battery?.health_percent ?? null,
    battery_cycle_count: device.battery?.cycle_count ?? null,
    battery_full_charge_capacity: device.battery?.full_charge_mah ?? null,
    battery_design_capacity: device.battery?.design_mah ?? null,
    scanned_by_user_id: context.scannedByUserId ?? null,
    bridge_job_id: context.bridgeJobId ?? null,
    bridge_agent_id: context.bridgeAgentId ?? null,
    raw_data: device,
  };
}

export async function persistScannedDevices(
  devices: DeviceResult[],
  context: PersistDiagnosticContext = {}
): Promise<void> {
  const rows = devices
    .map((device) => toDiagnosticRow(device, context))
    .filter((row): row is PersistedDiagnosticRow => row !== null);

  if (rows.length === 0) {
    return;
  }

  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("device_diagnostics").insert(rows);
    if (error) {
      console.error("[diagnostics] Failed to persist scanned devices", error);
    }
  } catch (error) {
    console.error("[diagnostics] Unexpected persistence error", error);
  }
}

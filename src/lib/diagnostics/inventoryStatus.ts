import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import type { DeviceResult } from "@/lib/diagnostics/libimobiledevice";

export interface DeviceInventoryStatus {
  in_inventory: boolean;
  product_id: string;
  product_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  added_at: string | null;
  added_by_user_id: string | null;
  added_by_name: string | null;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getAttributes(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  return input as Record<string, unknown>;
}

async function getLatestLinkedDiagnosticByField(field: "serial_number" | "imei" | "udid", value: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("device_diagnostics")
    .select("id, product_id, scanned_at, added_to_inventory_at, scanned_by_user_id")
    .eq(field, value)
    .not("product_id", "is", null)
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function findLatestLinkedDiagnostic(device: DeviceResult) {
  const candidates: Array<{ date: number; row: any }> = [];
  const serial = readString(device.serial_number);
  const imei = readString(device.imei);
  const udid = readString(device.udid);

  if (serial) {
    const row = await getLatestLinkedDiagnosticByField("serial_number", serial);
    if (row?.scanned_at) candidates.push({ date: new Date(row.scanned_at).getTime(), row });
  }
  if (imei) {
    const row = await getLatestLinkedDiagnosticByField("imei", imei);
    if (row?.scanned_at) candidates.push({ date: new Date(row.scanned_at).getTime(), row });
  }
  if (udid) {
    const row = await getLatestLinkedDiagnosticByField("udid", udid);
    if (row?.scanned_at) candidates.push({ date: new Date(row.scanned_at).getTime(), row });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.date - a.date);
  return candidates[0].row;
}

export async function attachInventoryStatusToResults(results: DeviceResult[]): Promise<DeviceResult[]> {
  if (!Array.isArray(results) || results.length === 0) return results;
  const supabase = getSupabaseServerClient();
  const enriched = [...results];

  const statusByIndex = new Map<number, DeviceInventoryStatus>();
  const productIds = new Set<string>();
  const userIds = new Set<string>();
  const branchIds = new Set<string>();

  for (let i = 0; i < enriched.length; i += 1) {
    const device = enriched[i];
    if (device.error) continue;

    const diag = await findLatestLinkedDiagnostic(device);
    const productId = readString(diag?.product_id);
    if (!productId) continue;
    productIds.add(productId);

    const status: DeviceInventoryStatus = {
      in_inventory: true,
      product_id: productId,
      product_name: null,
      branch_id: null,
      branch_name: null,
      added_at: readString(diag?.added_to_inventory_at) ?? readString(diag?.scanned_at),
      added_by_user_id: readString(diag?.scanned_by_user_id),
      added_by_name: null,
    };

    if (status.added_by_user_id) {
      userIds.add(status.added_by_user_id);
    }
    statusByIndex.set(i, status);
  }

  if (statusByIndex.size === 0) return enriched;

  const productMap = new Map<string, any>();
  if (productIds.size > 0) {
    const { data } = await supabase
      .from("products")
      .select("id, name, branch_id, created_at, attributes")
      .in("id", Array.from(productIds));
    for (const row of data ?? []) {
      productMap.set(String((row as any).id), row);
      const branchId = readString((row as any).branch_id);
      if (branchId) branchIds.add(branchId);
      const attrs = getAttributes((row as any).attributes);
      const fallbackUser = readString(attrs.inventory_created_by_user_id);
      if (fallbackUser) userIds.add(fallbackUser);
    }
  }

  const userMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .in("id", Array.from(userIds));
    for (const row of data ?? []) {
      const id = readString((row as any).id);
      if (!id) continue;
      const role = readString((row as any).role);
      const name = readString((row as any).name) ?? readString((row as any).email) ?? id;
      userMap.set(id, role ? `${name} (${role})` : name);
    }
  }

  const branchMap = new Map<string, string>();
  if (branchIds.size > 0) {
    const { data } = await supabase
      .from("branches")
      .select("id, name")
      .in("id", Array.from(branchIds));
    for (const row of data ?? []) {
      const id = readString((row as any).id);
      const name = readString((row as any).name);
      if (id && name) branchMap.set(id, name);
    }
  }

  for (const [index, status] of statusByIndex.entries()) {
    const product = productMap.get(status.product_id);
    const attrs = getAttributes(product?.attributes);
    const fallbackUserId = readString(attrs.inventory_created_by_user_id);
    const fallbackUserName = readString(attrs.inventory_created_by_name);
    const fallbackAddedAt = readString(attrs.inventory_created_at);
    const fallbackBranchName = readString(attrs.inventory_branch_name);
    const productBranchId = readString(product?.branch_id) ?? readString(attrs.inventory_branch_id);

    const addedByUserId = status.added_by_user_id ?? fallbackUserId;
    const addedAt = status.added_at ?? fallbackAddedAt ?? readString(product?.created_at);

    status.product_name = readString(product?.name);
    status.branch_id = productBranchId;
    status.branch_name =
      fallbackBranchName ??
      (productBranchId ? branchMap.get(productBranchId) ?? null : null);
    status.added_by_user_id = addedByUserId;
    status.added_by_name =
      fallbackUserName ??
      (addedByUserId ? userMap.get(addedByUserId) ?? null : null);
    status.added_at = addedAt;

    (enriched[index] as DeviceResult).inventory = status;
  }

  return enriched;
}

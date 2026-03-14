import { NextRequest, NextResponse } from "next/server";
import {
  checkDiagnosticsEnvironment,
  scanAllDevices,
  scanDevice,
} from "@/lib/diagnostics/libimobiledevice";
import { requireDiagnosticsAdminUser } from "@/lib/diagnostics/bridge";
import { persistScannedDevices } from "@/lib/diagnostics/persistence";
import { attachInventoryStatusToResults } from "@/lib/diagnostics/inventoryStatus";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const udid = req.nextUrl.searchParams.get("udid");
  const env = await checkDiagnosticsEnvironment();
  let scannedByUserId: string | null = null;

  try {
    const user = await requireDiagnosticsAdminUser();
    scannedByUserId = user.id;
  } catch {
    scannedByUserId = null;
  }

  if (!env.ready) {
    return NextResponse.json(
      { error: "service_offline", missing_tools: env.missing_tools },
      { status: 503 }
    );
  }

  if (!udid) {
    const data = await scanAllDevices();
    await persistScannedDevices(data.results, { scannedByUserId });
    const enrichedResults = await attachInventoryStatusToResults(data.results);
    return NextResponse.json({ ...data, results: enrichedResults });
  }

  const data = await scanDevice(udid);
  await persistScannedDevices([data], { scannedByUserId });
  const [enrichedDevice] = await attachInventoryStatusToResults([data]);
  return NextResponse.json(enrichedDevice ?? data);
}

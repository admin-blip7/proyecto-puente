import { NextRequest, NextResponse } from "next/server";
import {
  checkDiagnosticsEnvironment,
  scanAllDevices,
  scanDevice,
} from "@/lib/diagnostics/libimobiledevice";
import { persistScannedDevices } from "@/lib/diagnostics/persistence";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const udid = req.nextUrl.searchParams.get("udid");
  const env = await checkDiagnosticsEnvironment();

  if (!env.ready) {
    return NextResponse.json(
      { error: "service_offline", missing_tools: env.missing_tools },
      { status: 503 }
    );
  }

  if (!udid) {
    const data = await scanAllDevices();
    await persistScannedDevices(data.results);
    return NextResponse.json(data);
  }

  const data = await scanDevice(udid);
  await persistScannedDevices([data]);
  return NextResponse.json(data);
}

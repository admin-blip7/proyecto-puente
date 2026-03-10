import { NextResponse } from "next/server";
import {
  checkDiagnosticsEnvironment,
  listConnectedDevices,
} from "@/lib/diagnostics/libimobiledevice";

export const runtime = "nodejs";

export async function GET() {
  try {
    const env = await checkDiagnosticsEnvironment();
    if (!env.ready) {
      return NextResponse.json(
        {
          error: "service_offline",
          devices: [],
          count: 0,
          missing_tools: env.missing_tools,
        },
        { status: 503 }
      );
    }

    const devices = await listConnectedDevices();
    return NextResponse.json({
      devices,
      count: devices.length,
      missing_tools: [],
    });
  } catch {
    return NextResponse.json(
      { error: "service_offline", devices: [], count: 0 },
      { status: 503 }
    );
  }
}

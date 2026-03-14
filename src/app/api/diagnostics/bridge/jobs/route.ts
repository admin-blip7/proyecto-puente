import { NextRequest, NextResponse } from "next/server";
import { createBridgeJob, requireDiagnosticsAdminUser, type BridgeJobMode } from "@/lib/diagnostics/bridge";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireDiagnosticsAdminUser();
    const body = await req.json();
    const mode = body?.mode as BridgeJobMode;
    const targetUdid =
      typeof body?.targetUdid === "string" && body.targetUdid.trim()
        ? body.targetUdid.trim()
        : null;

    if (mode !== "scan_all" && mode !== "scan_device") {
      return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
    }

    if (mode === "scan_device" && !targetUdid) {
      return NextResponse.json({ error: "missing_target_udid" }, { status: 400 });
    }

    const job = await createBridgeJob({
      userId: user.id,
      mode,
      targetUdid,
    });

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "job_create_failed";
    const status = message === "forbidden" ? 403 : message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

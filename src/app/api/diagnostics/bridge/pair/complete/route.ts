import { NextRequest, NextResponse } from "next/server";
import { completeBridgePairingForUser, requireDiagnosticsAdminUser } from "@/lib/diagnostics/bridge";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireDiagnosticsAdminUser();
    const body = await req.json();
    const pairingCode = typeof body?.pairingCode === "string" ? body.pairingCode.trim() : "";

    if (!pairingCode) {
      return NextResponse.json({ error: "missing_pairing_code" }, { status: 400 });
    }

    const result = await completeBridgePairingForUser({
      userId: user.id,
      pairingCode,
    });

    return NextResponse.json({
      pairing: {
        id: result.pairing.id,
        pairing_code: result.pairing.pairing_code,
        status: result.pairing.status,
        agent_name: result.pairing.agent_name,
        agent_id: result.pairing.agent_id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "pairing_complete_failed";
    const status = message === "forbidden" ? 403 : message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

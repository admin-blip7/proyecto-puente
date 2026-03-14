import { NextRequest, NextResponse } from "next/server";
import { startBridgePairing } from "@/lib/diagnostics/bridge";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const machineId = typeof body?.machineId === "string" ? body.machineId.trim() : "";
    const agentName = typeof body?.agentName === "string" ? body.agentName.trim() : "";
    const platform = typeof body?.platform === "string" ? body.platform.trim() : null;

    if (!machineId) {
      return NextResponse.json({ error: "missing_machine_id" }, { status: 400 });
    }

    const result = await startBridgePairing({
      machineId,
      agentName: agentName || "Agente local",
      platform,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "pairing_start_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

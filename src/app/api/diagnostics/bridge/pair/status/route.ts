import { NextRequest, NextResponse } from "next/server";
import { consumePairingToken, getBridgePairingStatus } from "@/lib/diagnostics/bridge";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const machineId = req.nextUrl.searchParams.get("machineId")?.trim() || "";
    const pairingCode = req.nextUrl.searchParams.get("code")?.trim() || "";

    if (!machineId || !pairingCode) {
      return NextResponse.json({ error: "missing_pairing_identity" }, { status: 400 });
    }

    const result = await getBridgePairingStatus({ machineId, pairingCode });
    if (result.token && result.pairing.status === "paired") {
      await consumePairingToken(result.pairing.id);
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "pairing_status_failed";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { getBridgeAgentsForUser, requireDiagnosticsAdminUser } from "@/lib/diagnostics/bridge";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireDiagnosticsAdminUser();
    const agents = await getBridgeAgentsForUser(user.id);
    const onlineAgents = agents.filter((agent) => agent.online);

    return NextResponse.json({
      available: onlineAgents.length > 0,
      online_count: onlineAgents.length,
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        last_seen_at: agent.last_seen_at,
        online: agent.online,
        token_last4: agent.token_last4,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unauthorized";
    const status = message === "forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

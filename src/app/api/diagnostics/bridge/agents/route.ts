import { NextRequest, NextResponse } from "next/server";
import {
  createBridgeAgentForUser,
  getBridgeAgentsForUser,
  requireDiagnosticsAdminUser,
} from "@/lib/diagnostics/bridge";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireDiagnosticsAdminUser();
    const agents = await getBridgeAgentsForUser(user.id);

    return NextResponse.json({
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

export async function POST(req: NextRequest) {
  try {
    const user = await requireDiagnosticsAdminUser();
    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name : "Agente local";
    const platform = typeof body?.platform === "string" ? body.platform : null;
    const { agent, token } = await createBridgeAgentForUser({
      userId: user.id,
      name,
      platform,
    });

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
        token_last4: agent.token_last4,
      },
      token,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent_create_failed";
    const status = message === "forbidden" ? 403 : message === "unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

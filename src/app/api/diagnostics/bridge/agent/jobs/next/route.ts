import { NextRequest, NextResponse } from "next/server";
import {
  authenticateBridgeAgent,
  claimNextBridgeJob,
  heartbeatBridgeAgent,
} from "@/lib/diagnostics/bridge";

export const runtime = "nodejs";

function readAgentToken(req: NextRequest): string {
  const header = req.headers.get("x-diagnostics-agent-token") ?? req.headers.get("authorization");
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

export async function GET(req: NextRequest) {
  try {
    const agent = await authenticateBridgeAgent(readAgentToken(req));
    await heartbeatBridgeAgent(agent.id);
    const job = await claimNextBridgeJob(agent);
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        platform: agent.platform,
      },
      job,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent_unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { completeBridgeJob, authenticateBridgeAgent, heartbeatBridgeAgent } from "@/lib/diagnostics/bridge";
import { persistScannedDevices } from "@/lib/diagnostics/persistence";
import { scanDeviceFromRaw, type RawDeviceScanPayload, type DeviceResult } from "@/lib/diagnostics/libimobiledevice";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ jobId: string }>;
}

function readAgentToken(req: NextRequest): string {
  const header = req.headers.get("x-diagnostics-agent-token") ?? req.headers.get("authorization");
  if (!header) return "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

function normalizeResult(raw: any): { results: DeviceResult[]; count: number } {
  const rawResults = Array.isArray(raw?.results) ? raw.results : [];
  const results = rawResults.map((item: RawDeviceScanPayload) => scanDeviceFromRaw(item));
  return {
    results,
    count: typeof raw?.count === "number" ? raw.count : results.length,
  };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const agent = await authenticateBridgeAgent(readAgentToken(req));
    await heartbeatBridgeAgent(agent.id);
    const { jobId } = await params;
    const body = await req.json();
    const status = body?.status === "failed" ? "failed" : "completed";
    const normalizedResult = status === "completed" ? normalizeResult(body?.result ?? {}) : undefined;

    const job = await completeBridgeJob({
      agent,
      jobId,
      status,
      result: normalizedResult ?? null,
      error: typeof body?.error === "string" ? body.error : null,
    });

    if (normalizedResult?.results?.length) {
      await persistScannedDevices(normalizedResult.results, {
        scannedByUserId: job.requested_by,
        bridgeJobId: job.id,
        bridgeAgentId: agent.id,
      });
    }

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "job_complete_failed";
    const status = message === "agent_unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

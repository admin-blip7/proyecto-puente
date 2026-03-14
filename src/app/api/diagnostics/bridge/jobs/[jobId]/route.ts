import { NextRequest, NextResponse } from "next/server";
import { getBridgeJobForUser, requireDiagnosticsAdminUser } from "@/lib/diagnostics/bridge";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireDiagnosticsAdminUser();
    const { jobId } = await params;
    const job = await getBridgeJobForUser(user.id, jobId);
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "job_not_found";
    const status = message === "forbidden" ? 403 : message === "unauthorized" ? 401 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}

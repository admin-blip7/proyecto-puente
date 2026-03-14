import { NextRequest, NextResponse } from "next/server";
import { getBridgeJobForUser, requireDiagnosticsAdminUser } from "@/lib/diagnostics/bridge";
import { attachInventoryStatusToResults } from "@/lib/diagnostics/inventoryStatus";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ jobId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireDiagnosticsAdminUser();
    const { jobId } = await params;
    const job = await getBridgeJobForUser(user.id, jobId);

    const result = (job as any)?.result;
    if (job.status === "completed" && result && Array.isArray(result.results)) {
      const enrichedResults = await attachInventoryStatusToResults(result.results);
      return NextResponse.json({
        job: {
          ...job,
          result: {
            ...result,
            results: enrichedResults,
          },
        },
      });
    }

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "job_not_found";
    const status = message === "forbidden" ? 403 : message === "unauthorized" ? 401 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}

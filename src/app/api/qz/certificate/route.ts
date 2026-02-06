import { NextResponse } from "next/server";
import { getQzCertificatePem } from "@/lib/qz/signing";

export const runtime = "nodejs";

export async function GET() {
  const certificate = getQzCertificatePem();

  if (!certificate) {
    return new NextResponse("QZ certificate is not configured.", { status: 503 });
  }

  return new NextResponse(certificate, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

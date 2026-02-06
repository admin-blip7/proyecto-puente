import { NextResponse } from "next/server";
import { signQzPayload } from "@/lib/qz/signing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = typeof body?.request === "string" ? body.request : "";

    if (!payload) {
      return NextResponse.json({ error: "Missing request payload." }, { status: 400 });
    }

    const signature = signQzPayload(payload);

    return new NextResponse(signature, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sign payload.",
      },
      { status: 500 }
    );
  }
}

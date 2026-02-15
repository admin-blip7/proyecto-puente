import { NextRequest, NextResponse } from "next/server";
import { getPublicCatalogProducts } from "@/lib/services/publicCatalogService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 8;

  try {
    const publicProducts = await getPublicCatalogProducts({ limit });

    return NextResponse.json(
      { products: publicProducts },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}

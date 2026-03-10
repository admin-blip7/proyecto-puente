import { NextResponse } from "next/server";
import {
  deleteWholesaleProfitSetting,
  upsertWholesaleProfitSetting,
} from "@/lib/services/wholesaleProfitService";

const mapErrorToStatus = (error: unknown): number => {
  if (!(error instanceof Error)) return 500;
  if (error.message === "Unauthorized") return 401;
  if (error.message === "Forbidden") return 403;
  return 500;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const categoryId = String(body.categoryId ?? "").trim();
    const categoryLabel = String(body.categoryLabel ?? "").trim();
    const updatedBy = String(body.updatedBy ?? "").trim();
    const profitPercentage = Number(body.profitPercentage);

    if (!categoryId || !categoryLabel || !updatedBy || Number.isNaN(profitPercentage)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const setting = await upsertWholesaleProfitSetting(
      categoryId,
      categoryLabel,
      profitPercentage,
      updatedBy
    );

    return NextResponse.json({ setting });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = String(searchParams.get("categoryId") ?? "").trim();

    if (!categoryId) {
      return NextResponse.json({ error: "Missing categoryId" }, { status: 400 });
    }

    await deleteWholesaleProfitSetting(categoryId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: mapErrorToStatus(error) });
  }
}

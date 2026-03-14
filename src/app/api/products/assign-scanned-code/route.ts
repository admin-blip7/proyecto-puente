import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

const PRODUCTS_TABLE = "products";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productId = String(body.productId ?? "").trim();
    const scannedCode = String(body.scannedCode ?? "").trim();

    if (!productId || !scannedCode) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existingProduct, error: fetchError } = await supabase
      .from(PRODUCTS_TABLE)
      .select("id, sku, attributes")
      .eq("id", productId)
      .single();

    if (fetchError || !existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const currentAttributes =
      existingProduct.attributes &&
      typeof existingProduct.attributes === "object" &&
      !Array.isArray(existingProduct.attributes)
        ? existingProduct.attributes
        : {};

    const nextSku =
      typeof existingProduct.sku === "string" && existingProduct.sku.trim()
        ? existingProduct.sku
        : scannedCode;

    const nextAttributes = {
      ...currentAttributes,
      barcode: scannedCode,
    };

    const { error: updateError } = await supabase
      .from(PRODUCTS_TABLE)
      .update({
        sku: nextSku,
        attributes: nextAttributes,
      })
      .eq("id", productId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to assign scanned code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      productId,
      scannedCode,
      sku: nextSku,
      attributes: nextAttributes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

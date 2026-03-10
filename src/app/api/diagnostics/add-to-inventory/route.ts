"use server";

import { NextRequest, NextResponse } from "next/server";
import { addProduct } from "@/lib/services/productService";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

interface DiagnosticPayload {
  udid: string;
  model_name: string;
  model_id: string;
  serial_number: string;
  imei: string;
  imei2?: string;
  ios_version: string;
  storage_gb: number;
  icloud_locked: boolean;
  battery: {
    health_percent?: number | null;
    cycle_count?: number | null;
    full_charge_capacity?: number | null;
    design_capacity?: number | null;
    full_charge_mah?: number | null;
    design_mah?: number | null;
  };
  // User-provided fields
  price: number;
  cost: number;
  notes?: string;
  sku: string;
  raw_data: object;
}

export async function POST(req: NextRequest) {
  try {
    const body: DiagnosticPayload = await req.json();
    const batteryHealth = body.battery?.health_percent ?? null;
    const batteryCycles = body.battery?.cycle_count ?? null;
    const batteryFullCharge =
      body.battery?.full_charge_capacity ??
      body.battery?.full_charge_mah ??
      null;
    const batteryDesign =
      body.battery?.design_capacity ??
      body.battery?.design_mah ??
      null;

    // Build product name
    const storageLabel = body.storage_gb ? ` ${body.storage_gb}GB` : "";
    const batteryLabel = batteryHealth !== null
      ? ` | Bat. ${batteryHealth}%`
      : "";
    const productName = `${body.model_name}${storageLabel}${batteryLabel}`;

    // Build attributes object with all diagnostic data
    const attributes: Record<string, unknown> = {
      serial_number: body.serial_number,
      imei: body.imei,
      imei2: body.imei2,
      ios_version: body.ios_version,
      model_id: body.model_id,
      storage_gb: body.storage_gb,
      icloud_locked: body.icloud_locked,
      battery_health: batteryHealth,
      battery_cycles: batteryCycles,
      udid: body.udid,
    };

    const product = await addProduct({
      name: productName,
      sku: body.sku,
      price: body.price,
      cost: body.cost,
      stock: 1,
      type: "Venta",
      ownershipType: "Propio",
      category: "Celular Seminuevo",
      attributes,
      description: body.notes ?? "",
    });

    // Save diagnostic record linked to product
    const supabase = getSupabaseServerClient();
    await supabase.from("device_diagnostics").insert({
      udid: body.udid,
      serial_number: body.serial_number,
      model_id: body.model_id,
      model_name: body.model_name,
      ios_version: body.ios_version,
      imei: body.imei,
      imei2: body.imei2,
      storage_gb: body.storage_gb,
      icloud_locked: body.icloud_locked,
      battery_health_percent: batteryHealth,
      battery_cycle_count: batteryCycles,
      battery_full_charge_capacity: batteryFullCharge,
      battery_design_capacity: batteryDesign,
      product_id: String(product.id),
      added_to_inventory_at: new Date().toISOString(),
      notes: body.notes,
      raw_data: body.raw_data,
    });

    return NextResponse.json({ success: true, product_id: product.id, product_name: productName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

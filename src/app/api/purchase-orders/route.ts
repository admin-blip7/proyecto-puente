import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getPurchaseOrders, updatePurchaseOrderStatus, deletePurchaseOrder, getPurchaseOrderById } from "@/lib/services/purchaseOrderService";
import { nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

const log = getLogger("purchaseOrdersApi");

const fetchProduct = async (supabase: ReturnType<typeof getSupabaseServerClient>, productId: string) => {
  const { data, error } = await supabase
    .from("products")
    .select("id, firestore_id, stock, cost, price, name")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const createInventoryLog = async (
  supabase: ReturnType<typeof getSupabaseServerClient>,
  params: { product: any; change: number; userId: string; purchaseOrderId: string; cost?: number }
) => {
  const { product, change, userId, purchaseOrderId, cost } = params;
  const { error } = await supabase.from("inventory_logs").insert({
    productId: product.id, // Prefer ID
    productName: product.name ?? "",
    change,
    reason: "Ingreso de Mercancía",
    updatedBy: userId,
    createdAt: nowIso(),
    metadata: {
      purchaseOrderId,
      cost: cost ?? product.cost ?? 0,
    },
  });

  if (error) {
    throw error;
  }
};

const applyInventoryForOrder = async (
  supabase: ReturnType<typeof getSupabaseServerClient>,
  order: any,
  userId: string
) => {
  const items = Array.isArray(order.items) ? order.items : [];
  for (const item of items) {
    if (!item?.productId) {
      continue;
    }

    const product = await fetchProduct(supabase, item.productId);
    if (!product) {
      continue;
    }

    const newStock = Number(product.stock ?? 0) + Number(item.qty ?? item.quantity ?? 0);
    const { error: updateError } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", product.id);

    if (updateError) {
      throw updateError;
    }

    await createInventoryLog(supabase, {
      product,
      change: Number(item.qty ?? item.quantity ?? 0),
      userId,
      purchaseOrderId: order.id, // Prefer ID
      cost: item.finalCost ?? item.cost,
    });
  }
};

export async function GET() {
  try {
    const orders = await getPurchaseOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    log.error("Error fetching purchase orders", error);
    return NextResponse.json({ error: "Error al obtener órdenes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const body = await request.json();
  const { action } = body as { action?: string };

  try {
    switch (action) {
      case "updateStatus": {
        const { orderId, newStatus, notes, userId } = body as {
          orderId: string;
          newStatus: string;
          notes?: string;
          userId?: string;
        };

        await updatePurchaseOrderStatus(orderId, newStatus as any, notes ?? "", userId ?? "Usuario Actual");

        if (newStatus === "received") {
          const order = await getPurchaseOrderById(orderId);
          if (order) {
            await applyInventoryForOrder(supabase, order, userId ?? "Usuario Actual");
          }
        }

        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }
  } catch (error) {
    log.error("Purchase orders POST error", error);
    return NextResponse.json({ error: "Error procesando la petición" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
  }

  try {
    await deletePurchaseOrder(orderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("Error deleting purchase order", error);
    return NextResponse.json({ error: "Error eliminando la orden" }, { status: 500 });
  }
}

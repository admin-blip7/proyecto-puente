
'use server';

import { Product, StockEntryItem, BulkUpdateData } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("productService");

const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";

const generateSearchKeywords = (name: string): string[] => {
  if (!name) return [];
  const lowerCaseName = name.toLowerCase();
  const parts = lowerCaseName.split(" ").filter((p) => p.length > 1);
  const keywords = new Set<string>(parts);

  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      keywords.add(`${parts[i]} ${parts[j]}`);
    }
  }

  keywords.add(lowerCaseName);
  return Array.from(keywords);
};

const normalizeId = (row: any, index: number) => {
  const id = row?.id ?? row?.firestore_id;
  // Si no hay ID o está duplicado, crear un ID compuesto único
  if (!id) return `temp-${index}-${Date.now()}`;
  return `${id}`;
};

const mapProduct = (row: any, index: number): Product => ({
  id: normalizeId(row, index),
  name: row?.name ?? "",
  sku: row?.sku ?? "",
  price: Number(row?.price ?? 0),
  cost: Number(row?.cost ?? 0),
  stock: Number(row?.stock ?? 0),
  createdAt: toDate(row?.createdAt),
  type: row?.type ?? "Venta",
  ownershipType: row?.ownershipType ?? "Propio",
  consignorId: row?.consignorId ?? undefined,
  reorderPoint: row?.reorderPoint !== null ? Number(row?.reorderPoint) : undefined,
  comboProductIds: Array.isArray(row?.comboProductIds) ? row.comboProductIds : [],
  compatibilityTags: Array.isArray(row?.compatibilityTags) ? row.compatibilityTags : [],
  searchKeywords: Array.isArray(row?.searchKeywords) ? row.searchKeywords : [],
});

const fetchProductRow = async (productId: string) => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .or(`id.eq.${productId},firestore_id.eq.${productId}`)
    .maybeSingle();

  if (error) {
    log.error("Error fetching product", error);
    throw error;
  }

  return data ?? null;
};

export const getProducts = async (): Promise<Product[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const products = (data ?? []).map((row, index) => mapProduct(row, index));
    const uniqueProducts = products.filter(
      (product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
    );

    return uniqueProducts;
  } catch (error) {
    log.error("Error fetching products:", error);
    return [];
  }
};

export const getProductById = async (productId: string): Promise<Product | null> => {
  try {
    const row = await fetchProductRow(productId);
    return row ? mapProduct(row, 0) : null;
  } catch (error) {
    log.error("Error fetching product by ID:", error);
    return null;
  }
};

export const addProduct = async (
  productData: Omit<Product, "id" | "createdAt" | "searchKeywords">
): Promise<Product> => {
  const supabase = getSupabaseServerClient();
  const searchKeywords = generateSearchKeywords(productData.name);
  const createdAt = nowIso();
  const newId = uuidv4();

  const payload = {
    id: newId,
    firestore_id: newId,
    name: productData.name,
    sku: productData.sku,
    price: Number(productData.price ?? 0),
    cost: Number(productData.cost ?? 0),
    stock: Number(productData.stock ?? 0),
    type: productData.type ?? "Venta",
    ownershipType: productData.ownershipType ?? "Propio",
    consignorId: productData.consignorId ?? null,
    reorderPoint: productData.reorderPoint ?? 0,
    comboProductIds: productData.comboProductIds ?? [],
    compatibilityTags: productData.compatibilityTags ?? [],
    searchKeywords,
    createdAt,
  };

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    log.error("Error adding product", error);
    throw new Error("Failed to add product.");
  }

  return mapProduct(data, 0);
};

export const updateProduct = async (
  productId: string,
  productData: Partial<Omit<Product, "id" | "createdAt">>
): Promise<Product> => {
  const supabase = getSupabaseServerClient();
  const existingRow = await fetchProductRow(productId);
  if (!existingRow) {
    throw new Error("Product not found");
  }

  const searchKeywords = productData.name
    ? generateSearchKeywords(productData.name)
    : existingRow.searchKeywords ?? [];

  const { error } = await supabase
    .from(PRODUCTS_TABLE)
    .update({
      name: productData.name ?? existingRow.name,
      sku: productData.sku ?? existingRow.sku,
      price: productData.price ?? existingRow.price ?? 0,
      cost: productData.cost ?? existingRow.cost ?? 0,
      stock: productData.stock ?? existingRow.stock ?? 0,
      type: productData.type ?? existingRow.type ?? "Venta",
      ownershipType: productData.ownershipType ?? existingRow.ownershipType ?? "Propio",
      consignorId: productData.consignorId ?? existingRow.consignorId ?? null,
      reorderPoint: productData.reorderPoint ?? existingRow.reorderPoint ?? 0,
      comboProductIds: productData.comboProductIds ?? existingRow.comboProductIds ?? [],
      compatibilityTags: productData.compatibilityTags ?? existingRow.compatibilityTags ?? [],
      searchKeywords,
    })
    .eq("firestore_id", existingRow.firestore_id ?? productId);

  if (error) {
    log.error("Error updating product", error);
    throw new Error("Failed to update product.");
  }

  const updatedRow = await fetchProductRow(productId);
  if (!updatedRow) {
    throw new Error("Product not found after update.");
  }

  return mapProduct(updatedRow, 0);
};

export const processStockEntry = async (
  entryItems: StockEntryItem[],
  userId: string
): Promise<StockEntryItem[]> => {
  const supabase = getSupabaseServerClient();
  const processedItems: StockEntryItem[] = [];

  try {
    for (const item of entryItems) {
      let productId = item.productId;
      let isNewProduct = false;

      if (!productId) {
        const newProduct = await addProduct({
          id: "", // ignored
          name: item.name,
          sku: item.sku,
          price: item.price,
          cost: item.cost,
          stock: item.quantity,
          type: "Venta",
          ownershipType: item.ownershipType,
          consignorId: item.consignorId,
          reorderPoint: 0,
          comboProductIds: [],
          compatibilityTags: [],
        } as Omit<Product, "id" | "createdAt" | "searchKeywords">);

        productId = newProduct.id;
        item.productId = productId;
        isNewProduct = true;
      } else {
        const row = await fetchProductRow(productId);
        if (!row) {
          throw new Error(`Producto ${productId} no encontrado.`);
        }

        const currentStock = Number(row.stock ?? 0);
        const { error: updateError } = await supabase
          .from(PRODUCTS_TABLE)
          .update({
            stock: currentStock + item.quantity,
            cost: item.cost,
            price: item.price,
            ownershipType: item.ownershipType,
            consignorId: item.consignorId ?? null,
          })
          .eq("firestore_id", row.firestore_id ?? productId);

        if (updateError) {
          throw updateError;
        }
      }

      const { error: logError } = await supabase.from(INVENTORY_LOGS_TABLE).insert({
        productId,
        productName: item.name,
        change: item.quantity,
        reason: isNewProduct ? "Creación de Producto" : "Ingreso de Mercancía",
        updatedBy: userId,
        createdAt: nowIso(),
        metadata: { cost: item.cost },
      });

      if (logError) {
        log.error("Error saving inventory log", logError);
        throw logError;
      }

      processedItems.push(item);
    }

    return processedItems;
  } catch (error) {
    log.error("Error processing stock entry", error);
    throw new Error("Could not save to the database.");
  }
};

export const deleteProducts = async (productIds: string[]): Promise<void> => {
  if (!productIds.length) return;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from(PRODUCTS_TABLE)
    .delete()
    .in("firestore_id", productIds);

  if (error) {
    log.error("Error deleting products", error);
    throw new Error("Failed to delete products.");
  }
};

export const bulkUpdateProducts = async (
  productIds: string[],
  updateData: BulkUpdateData
): Promise<void> => {
  if (!productIds.length) return;
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("firestore_id, price, cost, compatibilityTags")
    .in("firestore_id", productIds);

  if (error) {
    log.error("Error fetching products for bulk update", error);
    throw error;
  }

  for (const row of data ?? []) {
    const updates: Record<string, unknown> = {};

    if (updateData.price) {
      let newPrice = Number(row.price ?? 0);
      const value = updateData.price.value;
      if (updateData.price.mode === "fixed") newPrice = value;
      if (updateData.price.mode === "amount") newPrice += value;
      if (updateData.price.mode === "percent") newPrice *= 1 + value / 100;
      updates.price = Math.max(0, newPrice);
    }

    if (updateData.cost) {
      let newCost = Number(row.cost ?? 0);
      const value = updateData.cost.value;
      if (updateData.cost.mode === "fixed") newCost = value;
      if (updateData.cost.mode === "amount") newCost += value;
      if (updateData.cost.mode === "percent") newCost *= 1 + value / 100;
      updates.cost = Math.max(0, newCost);
    }

    if (updateData.tagsToAdd?.length || updateData.tagsToRemove?.length) {
      const currentTags = Array.isArray(row.compatibilityTags)
        ? [...row.compatibilityTags]
        : [];

      if (updateData.tagsToAdd?.length) {
        for (const tag of updateData.tagsToAdd) {
          if (!currentTags.includes(tag)) currentTags.push(tag);
        }
      }

      if (updateData.tagsToRemove?.length) {
        for (const tag of updateData.tagsToRemove) {
          const index = currentTags.indexOf(tag);
          if (index >= 0) currentTags.splice(index, 1);
        }
      }

      updates.compatibilityTags = currentTags;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updates)
        .eq("firestore_id", row.firestore_id);

      if (updateError) {
        log.error("Error updating product in bulk operation", updateError);
        throw updateError;
      }
    }
  }
};

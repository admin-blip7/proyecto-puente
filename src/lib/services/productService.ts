
'use server';

import { Product, StockEntryItem, BulkUpdateData, ProductVariant, SeminuevoModel, SeminuevoUnit, ConditionGrade } from "@/types";
import { suggestConditionGrade, buildUnitName, extractModelLine } from "@/lib/seminuevoHelpers";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";
import { registerKardexMovement } from "@/lib/services/kardexService";
import { removeBackgroundWithBackgroundErase } from "@/lib/services/backgroundEraseService";

interface InventoryHistoryPoint {
  date: string;
  value: number;
}

const log = getLogger("productService");

const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";
const PRODUCT_VARIANTS_TABLE = "product_variants";
const PRODUCT_IMAGE_BUCKET = "products";
const OPTIMIZED_IMAGE_WIDTH = 960;
const OPTIMIZED_IMAGE_HEIGHT = 960;
const OPTIMIZED_IMAGE_PIPELINE = "backgrounderase-v1";

interface StockMovementContext {
  userId?: string | null;
  source?: string;
  reason?: string;
  reference?: string | null;
  notes?: string | null;
  skipInventoryLog?: boolean;
}

const registerStockMovementLogs = async (
  productId: string,
  previousStock: number,
  newStock: number,
  unitCost: number,
  context: StockMovementContext = {}
) => {
  const delta = Number(newStock) - Number(previousStock);
  if (delta === 0) return;

  const supabase = getSupabaseServerClient();
  const quantity = Math.abs(delta);
  const movementType = delta > 0 ? "INGRESO" : "SALIDA";
  const reason = context.reason || "Ajuste de stock";
  const source = context.source || "unknown";

  try {
    await registerKardexMovement({
      productoId: productId,
      tipo: movementType,
      concepto: reason,
      cantidad: quantity,
      stockAnterior: previousStock,
      precioUnitario: Number(unitCost || 0),
      referencia: context.reference ?? null,
      usuarioId: context.userId ?? null,
      notas: context.notes ?? `Origen: ${source}`,
    });
  } catch (kardexError) {
    log.warn("Could not register kardex movement", {
      productId,
      delta,
      source,
      kardexError
    });
  }

  if (!context.skipInventoryLog) {
    try {
      const { error: inventoryLogError } = await supabase
        .from(INVENTORY_LOGS_TABLE)
        .insert({
          product_id: productId,
          quantity_change: delta,
          change_type: reason,
          updated_by: context.userId ?? null,
          created_at: nowIso(),
          metadata: {
            source,
            previous_stock: previousStock,
            new_stock: newStock,
            reference: context.reference ?? null,
            reason,
          },
        });

      if (inventoryLogError) {
        log.warn("Could not register inventory movement log", {
          productId,
          delta,
          source,
          inventoryLogError
        });
      }
    } catch (inventoryLogError) {
      log.warn("Inventory movement logging failed", {
        productId,
        delta,
        source,
        inventoryLogError
      });
    }
  }
};

// Helper function to verify consignor existence
const resolveConsignorId = async (consignorId: string | undefined): Promise<string | null> => {
  if (!consignorId || consignorId.trim() === '') {
    log.warn(`Empty consignor ID provided`);
    return null;
  }

  const supabase = getSupabaseServerClient();

  // First try to find by direct ID match
  const { data, error } = await supabase
    .from("consignors")
    .select("id, name")
    .eq("id", consignorId)
    .maybeSingle();

  if (error) {
    log.error(`Error querying consignor by ID: ${consignorId}`, error);
  }

  if (data) {
    log.info(`Found consignor by ID: ${consignorId} -> ${data.name} (${data.id})`);
    return data.id;
  }

  log.warn(`Consignor not found for ID: ${consignorId}`);
  return null;
};

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
  const id = row?.id;
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
  createdAt: toDate(row?.created_at ?? row?.createdAt),
  type: row?.type ?? "Venta",
  ownershipType: row?.ownership_type ?? "Propio",
  consignorId: row?.consignor_id ?? undefined,
  reorderPoint: row?.reorder_point !== null ? Number(row?.reorder_point) : undefined,
  comboProductIds: Array.isArray(row?.combo_product_ids) ? row.combo_product_ids : [],
  compatibilityTags: Array.isArray(row?.compatibility_tags) ? row.compatibility_tags : [],
  searchKeywords: Array.isArray(row?.search_keywords) ? row.search_keywords : [],
  category: row?.category ?? undefined,
  attributes: row?.attributes ?? {},
  imageUrls: Array.isArray(row?.image_urls) ? row.image_urls : [],
  conditionGrade: row?.condition_grade ?? undefined,
  diagnosticId: row?.diagnostic_id ?? undefined,
  cosmeticNotes: row?.cosmetic_notes ?? undefined,
  branchId: row?.branch_id ?? undefined,
  partnerId: row?.partner_id ?? undefined,
});

const optimizeImageBuffer = async (sourceUrl: string): Promise<Buffer> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const response = await fetch(sourceUrl, {
    cache: "no-store",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`Could not download image (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const hasBackgroundEraseKey = Boolean(process.env.BACKGROUNDERASE_API_KEY);

  let backgroundEraseBuffer: Buffer | null = null;
  if (hasBackgroundEraseKey) {
    try {
      backgroundEraseBuffer = await removeBackgroundWithBackgroundErase(inputBuffer, `source-${Date.now()}.png`);
    } catch (error) {
      log.warn("BackgroundErase optimization failed, falling back to Sharp-only pipeline", {
        sourceUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const bufferForProcessing = backgroundEraseBuffer ?? inputBuffer;
  const shouldKeepAlpha = Boolean(backgroundEraseBuffer);

  let transformer = sharp(bufferForProcessing)
    .rotate()
    .resize(OPTIMIZED_IMAGE_WIDTH, OPTIMIZED_IMAGE_HEIGHT, {
      fit: "contain",
      background: shouldKeepAlpha
        ? { r: 248, g: 250, b: 252, alpha: 0 }
        : { r: 248, g: 250, b: 252, alpha: 1 },
      withoutEnlargement: true,
    })
    .sharpen();

  if (!shouldKeepAlpha) {
    transformer = transformer.flatten({ background: "#f8fafc" });
  }

  return transformer.webp({ quality: 88, effort: 5 }).toBuffer();
};

const uploadOptimizedBuffer = async (productId: string, buffer: Buffer): Promise<string> => {
  const supabase = getSupabaseServerClient();
  const filePath = `optimized/${productId}-${Date.now()}.webp`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filePath);

  return publicUrl;
};

const getOptimizedSourceFromAttributes = (attributes: Record<string, any> | null | undefined): string | null => {
  if (!attributes || typeof attributes !== "object") return null;
  const source = attributes.optimizedSource;
  return typeof source === "string" && source.length > 0 ? source : null;
};

const getOptimizedImageUrlFromAttributes = (attributes: Record<string, any> | null | undefined): string | null => {
  if (!attributes || typeof attributes !== "object") return null;
  const url = attributes.optimizedImageUrl;
  return typeof url === "string" && url.length > 0 ? url : null;
};

const getOptimizedPipelineFromAttributes = (attributes: Record<string, any> | null | undefined): string | null => {
  if (!attributes || typeof attributes !== "object") return null;
  const pipeline = attributes.optimizedPipeline;
  return typeof pipeline === "string" && pipeline.length > 0 ? pipeline : null;
};

const ensureOptimizedProductImage = async (row: any): Promise<any> => {
  const imageUrls = Array.isArray(row?.image_urls) ? row.image_urls : [];
  const sourceImage = imageUrls[0];

  if (!sourceImage || typeof sourceImage !== "string") {
    return row;
  }

  const existingAttributes = row?.attributes && typeof row.attributes === "object" ? row.attributes : {};
  const currentOptimizedSource = getOptimizedSourceFromAttributes(existingAttributes);
  const currentOptimizedImageUrl = getOptimizedImageUrlFromAttributes(existingAttributes);
  const currentOptimizedPipeline = getOptimizedPipelineFromAttributes(existingAttributes);
  const pipelineIsCurrent = currentOptimizedPipeline === OPTIMIZED_IMAGE_PIPELINE;

  if (currentOptimizedImageUrl && currentOptimizedSource === sourceImage && pipelineIsCurrent) {
    return row;
  }

  try {
    const optimizedBuffer = await optimizeImageBuffer(sourceImage);
    const optimizedImageUrl = await uploadOptimizedBuffer(row.id, optimizedBuffer);
    const nextAttributes = {
      ...existingAttributes,
      optimizedImageUrl,
      optimizedSource: sourceImage,
      optimizedAt: nowIso(),
      optimizedPipeline: OPTIMIZED_IMAGE_PIPELINE,
    };

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ attributes: nextAttributes })
      .eq("id", row.id);

    if (error) {
      log.warn("Failed to persist optimized image URL", { productId: row.id, error });
      return row;
    }

    return {
      ...row,
      attributes: nextAttributes,
    };
  } catch (error) {
    log.warn("Failed to optimize product image", {
      productId: row.id,
      sourceImage,
      error: error instanceof Error ? error.message : String(error),
    });
    return row;
  }
};

type ProductImageBackfillResult = {
  processed: number;
  optimized: number;
  skipped: number;
  failed: number;
};

type ProductImageOptimizationItemResult = {
  id: string;
  name: string;
  status: "optimized" | "skipped" | "failed" | "not_found" | "no_image";
  optimizedImageUrl?: string | null;
  reason?: string;
};

export const optimizeProductImagesByIds = async (
  productIds: string[]
): Promise<{
  requested: number;
  processed: number;
  optimized: number;
  skipped: number;
  failed: number;
  items: ProductImageOptimizationItemResult[];
}> => {
  const normalizedIds = Array.from(
    new Set(
      (productIds ?? [])
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

  if (normalizedIds.length === 0) {
    return {
      requested: 0,
      processed: 0,
      optimized: 0,
      skipped: 0,
      failed: 0,
      items: [],
    };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("id,name,image_urls,attributes")
    .in("id", normalizedIds);

  if (error) {
    log.error("Error fetching products for targeted optimization", error);
    throw new Error("Failed to fetch products for targeted optimization.");
  }

  const rows = Array.isArray(data) ? data : [];
  const rowsById = new Map(rows.map((row) => [String(row.id), row]));

  const items: ProductImageOptimizationItemResult[] = [];
  let optimized = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of normalizedIds) {
    const row = rowsById.get(id);
    if (!row) {
      failed += 1;
      items.push({
        id,
        name: "",
        status: "not_found",
        reason: "Product not found",
      });
      continue;
    }

    const name = String(row.name ?? "");
    const imageUrls = Array.isArray(row?.image_urls) ? row.image_urls : [];
    const sourceImage = imageUrls[0];

    if (!sourceImage || typeof sourceImage !== "string") {
      skipped += 1;
      items.push({
        id,
        name,
        status: "no_image",
        reason: "No source image",
      });
      continue;
    }

    const beforeSource = getOptimizedSourceFromAttributes(row?.attributes);
    const beforeUrl = getOptimizedImageUrlFromAttributes(row?.attributes);
    const beforePipeline = getOptimizedPipelineFromAttributes(row?.attributes);
    const alreadyOptimized =
      beforeUrl && beforeSource === sourceImage && beforePipeline === OPTIMIZED_IMAGE_PIPELINE;

    if (alreadyOptimized) {
      skipped += 1;
      items.push({
        id,
        name,
        status: "skipped",
        optimizedImageUrl: beforeUrl,
        reason: "Already optimized with current pipeline",
      });
      continue;
    }

    try {
      const optimizedRow = await ensureOptimizedProductImage(row);
      const afterSource = getOptimizedSourceFromAttributes(optimizedRow?.attributes);
      const afterUrl = getOptimizedImageUrlFromAttributes(optimizedRow?.attributes);

      if (afterUrl && afterSource === sourceImage) {
        optimized += 1;
        items.push({
          id,
          name,
          status: "optimized",
          optimizedImageUrl: afterUrl,
        });
      } else {
        failed += 1;
        items.push({
          id,
          name,
          status: "failed",
          reason: "Optimization did not return a valid URL",
        });
      }
    } catch (optimizationError) {
      failed += 1;
      items.push({
        id,
        name,
        status: "failed",
        reason:
          optimizationError instanceof Error
            ? optimizationError.message
            : String(optimizationError),
      });
    }
  }

  return {
    requested: normalizedIds.length,
    processed: normalizedIds.length,
    optimized,
    skipped,
    failed,
    items,
  };
};

export const backfillOptimizedProductImages = async (limit?: number): Promise<ProductImageBackfillResult> => {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from(PRODUCTS_TABLE)
    .select("id,image_urls,attributes,created_at")
    .order("created_at", { ascending: false });

  if (typeof limit === "number" && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    log.error("Error fetching products for image backfill", error);
    throw new Error("Failed to fetch products for image backfill.");
  }

  const rows = Array.isArray(data) ? data : [];
  const result: ProductImageBackfillResult = {
    processed: 0,
    optimized: 0,
    skipped: 0,
    failed: 0,
  };

  for (const row of rows) {
    result.processed += 1;
    const imageUrls = Array.isArray(row?.image_urls) ? row.image_urls : [];
    const sourceImage = imageUrls[0];

    if (!sourceImage || typeof sourceImage !== "string") {
      result.skipped += 1;
      continue;
    }

    const beforeSource = getOptimizedSourceFromAttributes(row?.attributes);
    const beforeUrl = getOptimizedImageUrlFromAttributes(row?.attributes);
    const beforePipeline = getOptimizedPipelineFromAttributes(row?.attributes);
    const alreadyOptimized =
      beforeUrl && beforeSource === sourceImage && beforePipeline === OPTIMIZED_IMAGE_PIPELINE;

    if (alreadyOptimized) {
      result.skipped += 1;
      continue;
    }

    const optimizedRow = await ensureOptimizedProductImage(row);
    const afterSource = getOptimizedSourceFromAttributes(optimizedRow?.attributes);
    const afterUrl = getOptimizedImageUrlFromAttributes(optimizedRow?.attributes);

    if (afterUrl && afterSource === sourceImage) {
      result.optimized += 1;
    } else {
      result.failed += 1;
    }
  }

  return result;
};

const fetchProductRow = async (productId: string) => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    log.error("Error fetching product", error);
    throw error;
  }

  return data ?? null;
};

const fetchProductBySku = async (sku: string) => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("*")
    .eq("sku", sku)
    .maybeSingle();

  if (error) {
    log.error("Error fetching product by SKU", error);
    throw error;
  }

  return data ?? null;
};

// --- Funciones de Seminuevos ---

export const getOrCreateModelParent = async (modelLine: string): Promise<Product> => {
  const supabase = getSupabaseServerClient();

  // 1. Buscar si ya existe el template
  const { data: existing, error: searchError } = await supabase
    .from(PRODUCTS_TABLE)
    .select('*')
    .eq('category', 'Celular Seminuevo')
    .eq('name', modelLine)
    .filter('attributes->is_model_template', 'eq', 'true')
    .maybeSingle();

  if (searchError) throw searchError;
  if (existing) return mapProduct(existing, 0);

  // 2. Crear si no existe
  const newId = uuidv4();
  const payload = {
    id: newId,
    name: modelLine,
    sku: `MOD-${modelLine.toUpperCase().replace(/\s+/g, '-')}`,
    price: 0,
    cost: 0,
    stock: 0, // El template no tiene stock propio vendible
    type: 'Venta',
    ownership_type: 'Propio',
    category: 'Celular Seminuevo',
    attributes: {
      model_line: modelLine,
      is_model_template: true
    },
    created_at: nowIso(),
  };

  const { data: created, error: createError } = await supabase
    .from(PRODUCTS_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (createError) throw createError;
  return mapProduct(created, 0);
};

export const createProductFromDiagnostic = async (input: {
  diagnosticId: string;
  price: number;
  cost: number;
  ownershipType: 'Propio' | 'Consigna';
  consignorId?: string;
  notes?: string;
  inventoryContext?: {
    createdByUserId?: string;
    createdByName?: string;
    branchId?: string;
    branchName?: string;
  };
}): Promise<Product> => {
  const supabase = getSupabaseServerClient();
  const diagnosticIdOrUdid = input.diagnosticId?.trim();
  if (!diagnosticIdOrUdid) {
    throw new Error("Diagnóstico no encontrado");
  }

  // 1. Obtener diagnóstico (acepta UUID real o UDID del dispositivo)
  let diag: any = null;
  let diagError: any = null;

  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      diagnosticIdOrUdid
    );

  if (looksLikeUuid) {
    const byId = await supabase
      .from("device_diagnostics")
      .select("*")
      .eq("id", diagnosticIdOrUdid)
      .single();
    diag = byId.data;
    diagError = byId.error;
  } else {
    const byUdid = await supabase
      .from("device_diagnostics")
      .select("*")
      .eq("udid", diagnosticIdOrUdid)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    diag = byUdid.data;
    diagError = byUdid.error;
  }

  if (diagError || !diag) throw new Error('Diagnóstico no encontrado');

  // 2. Extraer modelo base y buscar/crear padre
  const modelLine = extractModelLine(diag.model_name || 'iPhone Desconocido');
  const parentProduct = await getOrCreateModelParent(modelLine);

  // 3. Preparar unidad hija
  const grade = suggestConditionGrade(diag.battery_health_percent);
  const fullName = buildUnitName(modelLine, diag.storage_gb, diag.color);
  // SKU único basado en serial
  const childSku = `SN-${diag.serial_number || uuidv4().substring(0, 8).toUpperCase()}`;

  const resolvedConsignorId = await resolveConsignorId(input.consignorId);

  const newId = uuidv4();
  const payload = {
    id: newId,
    parent_id: parentProduct.id,
    name: fullName,
    sku: childSku,
    price: input.price,
    cost: input.cost,
    stock: 1, // La unidad física empieza con stock 1
    type: 'Venta',
    ownership_type: input.ownershipType,
    consignor_id: resolvedConsignorId,
    category: 'Celular Seminuevo',
    condition_grade: grade,
    diagnostic_id: diag.id,
    cosmetic_notes: input.notes,
    attributes: {
      model_name: diag.model_name,
      storage: diag.storage_gb ? `${diag.storage_gb}GB` : undefined,
      storage_gb: diag.storage_gb,
      color: diag.color,
      battery_health: diag.battery_health_percent,
      battery_cycle_count: diag.battery_cycle_count,
      ios_version: diag.ios_version,
      udid: diag.udid,
      serial: diag.serial_number,
      imei: diag.imei,
      imei2: diag.imei2,
      is_model_template: false,
      inventory_created_by_user_id: input.inventoryContext?.createdByUserId,
      inventory_created_by_name: input.inventoryContext?.createdByName,
      inventory_branch_id: input.inventoryContext?.branchId,
      inventory_branch_name: input.inventoryContext?.branchName,
      inventory_created_at: nowIso(),
    },
    created_at: nowIso(),
  };

  const { data: childData, error: childError } = await supabase
    .from(PRODUCTS_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (childError) throw childError;

  // Actualizar diagnóstico para enlazarlo de vuelta
  await supabase
    .from('device_diagnostics')
    .update({
      product_id: newId,
      added_to_inventory_at: nowIso(),
      scanned_by_user_id: input.inventoryContext?.createdByUserId ?? undefined,
    })
    .eq('id', diag.id);

  // Registrar movimiento
  await registerStockMovementLogs(newId, 0, 1, input.cost, {
    source: 'product-service/create-seminuevo',
    reason: 'Ingreso inicial por diagnóstico',
  });

  return mapProduct(childData, 0);
};

export const getSeminuevoModels = async (): Promise<SeminuevoModel[]> => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('seminuevo_models')
    .select('*')
    .order('model_name', { ascending: true });

  if (error) {
    log.error('Error fetching seminuevo models:', error);
    return [];
  }

  return (data || []).map(row => ({
    modelId: row.model_id,
    modelName: row.model_name,
    imageUrls: row.image_urls || [],
    unitsAvailable: Number(row.units_available),
    priceFrom: Number(row.price_from),
    priceTo: Number(row.price_to),
    gradesAvailable: row.grades_available || [],
    storagesAvailable: row.storages_available || [],
    colorsAvailable: row.colors_available || [],
  }));
};

export const getSeminuevoUnits = async (modelId: string): Promise<SeminuevoUnit[]> => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('seminuevo_units')
    .select('*')
    .eq('parent_id', modelId)
    .gt('stock', 0); // Solo las disponibles

  if (error) {
    log.error('Error fetching seminuevo units:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    stock: Number(row.stock),
    parentId: row.parent_id,
    conditionGrade: row.condition_grade as ConditionGrade,
    cosmeticNotes: row.cosmetic_notes,
    imageUrls: row.image_urls || [],
    diagnosticId: row.diagnostic_id,
    modelName: row.model_name,
    storageGb: Number(row.storage_gb),
    color: row.color,
    batteryHealthPercent: Number(row.battery_health_percent),
    batteryCtycleCount: Number(row.battery_cycle_count),
    serialNumber: row.serial_number,
    imei: row.imei,
    iosVersion: row.ios_version,
  }));
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

export const getProductsByBranch = async (branchId: string): Promise<Product[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select("*")
      .eq("branch_id", branchId)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row, index) => mapProduct(row, index));
  } catch (error) {
    log.error("Error fetching products by branch:", error);
    return [];
  }
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  try {
    if (!query || query.trim().length === 0) return [];

    const supabase = getSupabaseServerClient();
    const searchTerm = `%${query.trim()}%`;

    // Search by name, SKU, or search_keywords (requires specific syntax for array columns or just keep it simple with OR)
    // For arrays in supabase you often use .cs (contains) or text search, but simple OR on text columns is easiest for now.
    // 'search_keywords' is a text array.

    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select("*")
      .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm}`)
      .limit(50)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    // Map and ensure uniqueness just in case
    const products = (data ?? []).map((row, index) => mapProduct(row, index));
    const uniqueProducts = products.filter(
      (product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
    );

    return uniqueProducts;
  } catch (error) {
    log.error("Error searching products:", error);
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

  // Resolve consignor ID to proper PostgreSQL UUID
  const resolvedConsignorId = await resolveConsignorId(productData.consignorId);

  // Resolve branch/partner from calling user's profile if not provided
  let branchId: string | null = productData.branchId ?? null;
  let partnerId: string | null = productData.partnerId ?? null;
  if (!branchId || !partnerId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        branchId = branchId ?? (user.user_metadata?.branch_id as string | undefined) ?? null;
        partnerId = partnerId ?? (user.user_metadata?.partner_id as string | undefined) ?? null;
        if (!branchId || !partnerId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("branch_id, partner_id")
            .eq("id", user.id)
            .maybeSingle();
          branchId = branchId ?? (profile as any)?.branch_id ?? null;
          partnerId = partnerId ?? (profile as any)?.partner_id ?? null;
        }
      }
    } catch {
      // Non-critical — product still saves without branch context
    }
  }

  const payload = {
    id: newId,
    name: productData.name,
    sku: productData.sku,
    price: Number(productData.price ?? 0),
    cost: Number(productData.cost ?? 0),
    stock: Number(productData.stock ?? 0),
    type: productData.type ?? "Venta",
    ownership_type: productData.ownershipType ?? "Propio",
    consignor_id: resolvedConsignorId,
    reorder_point: productData.reorderPoint ?? 0,
    combo_product_ids: productData.comboProductIds ?? [],
    compatibility_tags: productData.compatibilityTags ?? [],
    search_keywords: searchKeywords,
    category: productData.category ?? null,
    attributes: productData.attributes ?? {},
    image_urls: productData.imageUrls ?? [],
    branch_id: branchId,
    partner_id: partnerId,
    created_at: createdAt,
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

  const optimizedRow = await ensureOptimizedProductImage(data);
  return mapProduct(optimizedRow, 0);
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
      ownership_type: productData.ownershipType ?? existingRow.ownership_type ?? "Propio",
      consignor_id: productData.consignorId ?? existingRow.consignor_id ?? null,
      reorder_point: productData.reorderPoint ?? existingRow.reorder_point ?? 0,
      combo_product_ids: productData.comboProductIds ?? existingRow.combo_product_ids ?? [],
      compatibility_tags: productData.compatibilityTags ?? existingRow.compatibility_tags ?? [],
      search_keywords: searchKeywords, // Corregido: search_keywords en lugar de searchKeywords
      category: productData.category ?? existingRow.category,
      attributes: productData.attributes ?? existingRow.attributes ?? {},
      image_urls: productData.imageUrls ?? existingRow.image_urls ?? [],
    })
    .eq("id", existingRow.id);

  if (error) {
    log.error("Error updating product", error);
    throw new Error("Failed to update product.");
  }

  const updatedRow = await fetchProductRow(productId);
  if (!updatedRow) {
    throw new Error("Product not found after update.");
  }

  const optimizedRow = await ensureOptimizedProductImage(updatedRow);
  return mapProduct(optimizedRow, 0);
};

export const updateProductStockWithKardex = async (
  productId: string,
  stock: number,
  context: StockMovementContext = {}
): Promise<Product> => {
  const supabase = getSupabaseServerClient();
  const existingRow = await fetchProductRow(productId);
  if (!existingRow) {
    throw new Error("Product not found");
  }

  const previousStock = Number(existingRow.stock ?? 0);
  const nextStock = Math.max(0, Math.floor(Number(stock ?? 0)));

  const { error } = await supabase
    .from(PRODUCTS_TABLE)
    .update({ stock: nextStock })
    .eq("id", productId);

  if (error) {
    log.error("Error updating product stock", error);
    throw new Error("Failed to update product stock.");
  }

  await registerStockMovementLogs(
    productId,
    previousStock,
    nextStock,
    Number(existingRow.cost ?? 0),
    {
      userId: context.userId ?? null,
      source: context.source || "product-service/update-stock",
      reason: context.reason || "Ajuste de stock",
      reference: context.reference ?? null,
      notes: context.notes ?? null,
    }
  );

  const updatedRow = await fetchProductRow(productId);
  if (!updatedRow) {
    throw new Error("Product not found after stock update.");
  }

  return mapProduct(updatedRow, 0);
};

export const processStockEntry = async (
  entryItems: StockEntryItem[],
  userId: string
): Promise<StockEntryItem[]> => {
  const supabase = getSupabaseServerClient();
  const processedItems: StockEntryItem[] = [];

  // Validación inicial de los datos de entrada
  if (!entryItems || entryItems.length === 0) {
    throw new Error("No hay productos para procesar.");
  }

  if (!userId || userId.trim() === '') {
    throw new Error("ID de usuario no válido.");
  }

  try {
    log.info(`Starting stock entry process for ${entryItems.length} items`, {
      userId,
      itemCount: entryItems.length
    });

    for (const item of entryItems) {
      // Validaciones de cada item antes de procesar
      if (!item.name || item.name.trim() === '') {
        throw new Error(`El producto con SKU "${item.sku || 'N/A'}" no tiene un nombre válido.`);
      }

      if (!item.sku || item.sku.trim() === '') {
        throw new Error(`El producto "${item.name}" no tiene un SKU válido.`);
      }

      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        throw new Error(`El producto "${item.name}" debe tener una cantidad válida (entero mayor a 0).`);
      }

      if (item.cost < 0) {
        throw new Error(`El producto "${item.name}" no puede tener un costo negativo.`);
      }

      if (item.price < 0) {
        throw new Error(`El producto "${item.name}" no puede tener un precio negativo.`);
      }

      if (item.ownershipType === 'Consigna' && (!item.consignorId || item.consignorId.trim() === '')) {
        throw new Error(`El producto en consigna "${item.name}" debe tener un consignador seleccionado.`);
      }

      let productId = item.productId;
      let isNewProduct = false;
      let row = null;
      let previousStockForMovement = 0;
      let newStockForMovement = 0;

      // Si tenemos productId, buscar el producto
      if (productId) {
        row = await fetchProductRow(productId);
        if (!row) {
          throw new Error(`Producto con ID ${productId} no encontrado en la base de datos.`);
        }
        log.info(`Found existing product by ID: ${productId}`);
      } else {
        // Si no hay productId, buscar por SKU primero
        if (item.sku) {
          row = await fetchProductBySku(item.sku);
          if (row) {
            // Producto encontrado por SKU, actualizarlo
            productId = row.id;
            item.productId = productId;
            isNewProduct = false;
            log.info(`Found existing product by SKU: ${item.sku}, ID: ${productId}`);
          }
        }

        // Si no se encontró por SKU o no hay SKU, crear nuevo producto
        if (!row) {
          try {
            log.info(`Creating new product: ${item.name}, SKU: ${item.sku}`);
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
              category: item.category,
              attributes: item.attributes,
              imageUrls: item.imageUrl ? [item.imageUrl] : [],
            } as Omit<Product, "id" | "createdAt" | "searchKeywords">);

            productId = newProduct.id;
            item.productId = productId;
            isNewProduct = true;
            row = { id: productId }; // Asignar para el log
            previousStockForMovement = 0;
            newStockForMovement = Number(item.quantity ?? 0);
            log.info(`Successfully created new product: ${productId}`);
          } catch (addError: any) {
            // Si falla por SKU duplicado, buscarlo nuevamente
            if (item.sku && addError?.message?.includes('duplicate key') && addError?.message?.includes('sku')) {
              log.info(`SKU ${item.sku} ya existe, buscando producto existente...`);
              row = await fetchProductBySku(item.sku);
              if (row) {
                productId = row.id;
                item.productId = productId;
                isNewProduct = false;
                log.info(`Producto encontrado por SKU duplicado: ${productId}`);
              } else {
                throw new Error(`No se pudo encontrar producto con SKU ${item.sku} después de error de duplicado`);
              }
            } else {
              log.error("Error creating new product:", addError);
              throw new Error(`Error al crear producto "${item.name}": ${addError.message}`);
            }
          }
        }
      }

      // Actualizar stock si no es nuevo producto
      if (!isNewProduct && row) {
        const currentStock = Number(row.stock ?? 0);
        previousStockForMovement = currentStock;
        newStockForMovement = currentStock + Number(item.quantity ?? 0);

        // Resolve consignor ID to proper PostgreSQL UUID for updates
        const resolvedConsignorId = await resolveConsignorId(item.consignorId);

        // Handle images update
        let updatedImageUrls = undefined;
        if (item.imageUrl) {
          const currentImages = Array.isArray(row.image_urls) ? row.image_urls : [];
          if (!currentImages.includes(item.imageUrl)) {
            updatedImageUrls = [...currentImages, item.imageUrl];
          }
        }

        const existingAttributes = row?.attributes && typeof row.attributes === "object" ? row.attributes : {};
        const incomingAttributes = item.attributes && typeof item.attributes === "object" ? item.attributes : {};

        const updateData: any = {
          stock: currentStock + item.quantity,
          cost: item.cost,
          price: item.price,
          ownership_type: item.ownershipType,
          consignor_id: resolvedConsignorId,
          category: item.category ?? null,
          attributes: {
            ...existingAttributes,
            ...incomingAttributes,
          },
        };

        if (updatedImageUrls) {
          updateData.image_urls = updatedImageUrls;
        }

        log.info(`Updating existing product ${productId}`, {
          currentStock,
          newStock: currentStock + item.quantity,
          quantityAdded: item.quantity
        });

        const { error: updateError } = await supabase
          .from(PRODUCTS_TABLE)
          .update(updateData)
          .eq("id", row.id); // Usar el id real del registro

        if (updateError) {
          log.error("Error updating existing product:", updateError);
          throw new Error(`Error al actualizar producto "${item.name}": ${updateError.message}`);
        }

        const updatedRowForOptimization = await fetchProductRow(String(row.id));
        if (updatedRowForOptimization) {
          await ensureOptimizedProductImage(updatedRowForOptimization);
        }
      }

      await registerStockMovementLogs(
        String(productId),
        Number(previousStockForMovement),
        Number(newStockForMovement),
        Number(item.cost ?? 0),
        {
          userId,
          source: "stock-entry/normal",
          reason: isNewProduct ? "Creación de Producto" : "Ingreso de Mercancía",
          reference: item.sku || String(productId),
          notes: `Ingreso desde flujo de stock (${item.name})`,
          skipInventoryLog: true
        }
      );

      // Registrar en el log de inventario
      const logData = {
        product_id: productId,
        quantity_change: item.quantity,
        change_type: isNewProduct ? "Creación de Producto" : "Ingreso de Mercancía",
        updated_by: userId,
        created_at: nowIso(),
        metadata: {
          cost: item.cost,
          ownership_type: item.ownershipType,
          is_new_product: isNewProduct,
          source: "stock-entry/normal"
        },
      };

      const { error: logError } = await supabase.from(INVENTORY_LOGS_TABLE).insert(logData);

      if (logError) {
        log.error("Error saving inventory log", logError);
        // No lanzar error aquí, ya que el producto ya se procesó correctamente
        // pero sí registrar el problema
      }

      processedItems.push(item);
    }

    log.info(`Successfully processed ${processedItems.length} stock entry items`);
    return processedItems;
  } catch (error) {
    log.error("Error processing stock entry", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      itemCount: entryItems.length
    });

    // Propagar el error con un mensaje más descriptivo
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Error desconocido al procesar el ingreso de mercancía.");
    }
  }
};

export const deleteProducts = async (
  productIds: string[],
  context: StockMovementContext = {}
): Promise<void> => {
  if (!productIds.length) return;
  const supabase = getSupabaseServerClient();

  // First, get the actual id and name for the products to be deleted
  const { data: productsToDelete, error: fetchError } = await supabase
    .from(PRODUCTS_TABLE)
    .select('id, name, stock, cost, sku')
    .in('id', productIds);

  if (fetchError) {
    log.error("Error fetching products for deletion", fetchError);
    throw new Error("Failed to fetch products for deletion.");
  }

  if (!productsToDelete || productsToDelete.length === 0) {
    log.warn("No products found to delete", { productIds });
    throw new Error("No se encontraron productos para eliminar.");
  }

  const idsToDelete = productsToDelete.map(p => p.id).filter(Boolean);
  let deletedCount = 0;

  if (idsToDelete.length > 0) {
    const { error, count } = await supabase
      .from(PRODUCTS_TABLE)
      .delete({ count: 'exact' })
      .in('id', idsToDelete);

    if (error) {
      log.error("Error deleting products by id", error);
      throw new Error("Failed to delete products: " + error.message);
    } else {
      deletedCount += count || 0;
    }
  }

  // Check if we expected to delete more than we actually deleted
  if (deletedCount < productIds.length) {
    const remainingCount = productIds.length - deletedCount;
    log.warn(`Some products (${remainingCount}) could not be deleted, possibly due to dependencies`);
    throw new Error(`No se pudieron eliminar ${remainingCount} producto(s). Es posible que tengan dependencias como ventas o registros asociados.`);
  }

  for (const product of productsToDelete) {
    const previousStock = Number(product.stock ?? 0);
    if (previousStock <= 0) continue;

    await registerStockMovementLogs(
      product.id,
      previousStock,
      0,
      Number(product.cost ?? 0),
      {
        userId: context.userId ?? null,
        source: context.source || "product-service/delete-products",
        reason: context.reason || "Eliminación de producto",
        reference: context.reference ?? `delete:${product.id}`,
        notes: context.notes ?? `Producto eliminado (${product.name || product.sku || product.id})`
      }
    );
  }

  log.info(`Successfully deleted ${deletedCount} products`, {
    requestedIds: productIds,
    foundProducts: productsToDelete.map(p => ({ id: p.id, name: p.name }))
  });
};

export const bulkUpdateProducts = async (
  productIds: string[],
  updateData: BulkUpdateData
): Promise<void> => {
  if (!productIds.length) return;

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from(PRODUCTS_TABLE)
    .select("id, price, cost, compatibility_tags")
    .in("id", productIds);

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
      const currentTags = Array.isArray(row.compatibility_tags)
        ? [...row.compatibility_tags]
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

      updates.compatibility_tags = currentTags;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from(PRODUCTS_TABLE)
        .update(updates)
        .eq("id", row.id);

      if (updateError) {
        log.error("Error updating product in bulk operation", updateError);
        throw updateError;
      }
    }
  }
};

// ProductVariant functions
export const getProductVariants = async (productId: string): Promise<ProductVariant[]> => {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from(PRODUCT_VARIANTS_TABLE)
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Error fetching product variants", error);
    throw new Error("Failed to fetch product variants.");
  }

  return data.map(row => ({
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    serialNumber: row.serial_number,
    imei: row.imei,
    price: row.price,
    cost: row.cost,
    status: row.status,
    batteryHealth: row.battery_health,
    storage: row.storage,
    aestheticCondition: row.aesthetic_condition,
    color: row.color,
    replacedParts: row.replaced_parts || [],
    notes: row.notes,
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  }));
};

export const getInventoryValueHistory = async (days: number = 30): Promise<InventoryHistoryPoint[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. Get current products and calculate current value (Propio only)
    const products = await getProducts();
    const currentInventoryValue = products
      .filter(p => p.ownershipType === 'Propio')
      .reduce((total, p) => total + (p.stock * p.cost), 0);

    // 2. Fetch inventory logs for the period
    const { data: logs, error } = await supabase
      .from(INVENTORY_LOGS_TABLE)
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 3. Reconstruct history backwards
    const history: InventoryHistoryPoint[] = [];
    let runningValue = currentInventoryValue;

    // Add today's point
    history.push({
      date: endDate.toISOString().split('T')[0],
      value: runningValue
    });

    const logsByDate = new Map<string, any[]>();
    (logs ?? []).forEach((log: any) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!logsByDate.has(date)) logsByDate.set(date, []);
      logsByDate.get(date)?.push(log);
    });

    // Iterate backwards from yesterday to startDate
    for (let d = 1; d < days; d++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - d);
      const dateStr = targetDate.toISOString().split('T')[0];

      // We are moving BACKWARDS in time.
      // If we are at day T, and want value at T-1:
      // Value(T-1) = Value(T) - (Changes at T)
      // Actually, since logs are timestamps, any log AFTER T-1 end of day contributed to T value.
      // But we have logs grouped by date.
      // If we are calculated Value at end of T-1, we need to subtract changes that happened on day T.
      // Wait, let's look at it this way:
      // We have Value NOW (End of Today).
      // To get Value at End of Yesterday, we reverse all transactions that happened TODAY.

      // So looking at loop: we start with current value (End of D).
      // We want value at End of D-1.
      // We find all logs that happened on D.
      // And reverse them.

      // I need to reverse logs date by date. The loop `d` corresponds to "days ago".
      // d=0 is today (already pushed).
      // when d=1 (yesterday), we need to process logs from d=0 (today) to undo them? No.
      // We want to show the value *at the end of that day*.

      // Let's iterate forward or backward? Backward is easier from current state.
      // Current Value = Value at NOW.
      // Value(Yesterday End) = Value(NOW) - Changes(Today)

      // So loop d from 0 to days-1.
      // The date being processed is date(today - d).
      // The logs on that date are changes that happened *during* that date.
      // So Value(Start of Date) = Value(End of Date) - Changes(Date).
      // And Value(Start of Date) is roughly Value(End of Previous Day).

      // Ideally we plot "Value at end of day".
      // history[0] = Today, Value = Current.
      // history[1] = Yesterday, Value = Current - Changes(Today).

      // Let's do that.
      const previousDayFunc = new Date();
      previousDayFunc.setDate(previousDayFunc.getDate() - d + 1); // This corresponds to the "future" day relative to target
      const previousDayStr = previousDayFunc.toISOString().split('T')[0];

      // Find logs for previousDayStr (which is "Today" in the first iteration, "Yesterday" in second, etc relative to the step)
      // Actually simpler: 
      // Current Value is End of Today.
      // To get End of Yesterday: Undo Today's logs.
      const dateToUndo = new Date();
      dateToUndo.setDate(dateToUndo.getDate() - (d - 1));
      const dateToUndoStr = dateToUndo.toISOString().split('T')[0];

      const dayLogs = logsByDate.get(dateToUndoStr) || [];

      for (const log of dayLogs) {
        // Only consider Propio products.
        const ownership = log.metadata?.ownership_type || log.metadata?.ownershipType;
        if (ownership === 'Propio') {
          const cost = Number(log.metadata?.cost || 0);
          const change = Number(log.quantity_change ?? log.change ?? 0);
          runningValue -= (change * cost);
        }
      }

      history.push({
        date: dateStr,
        value: runningValue
      });
    }

    return history.reverse(); // Return oldest to newest
  } catch (error) {
    log.error("Error fetching inventory history", error);
    return [];
  }
};

export const addProductVariant = async (
  productId: string,
  variantData: Omit<ProductVariant, "id" | "productId" | "createdAt" | "updatedAt">
): Promise<ProductVariant> => {
  const supabase = getSupabaseServerClient();
  const now = nowIso();
  const newId = uuidv4();

  const payload = {
    id: newId,
    product_id: productId,
    sku: variantData.sku,
    serial_number: variantData.serialNumber,
    imei: variantData.imei,
    price: variantData.price,
    cost: variantData.cost,
    status: variantData.status,
    battery_health: variantData.batteryHealth,
    storage: variantData.storage,
    aesthetic_condition: variantData.aestheticCondition,
    color: variantData.color,
    replaced_parts: variantData.replacedParts || [],
    notes: variantData.notes,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(PRODUCT_VARIANTS_TABLE)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    log.error("Error adding product variant", error);
    throw new Error("Failed to add product variant.");
  }

  return {
    id: data.id,
    productId: data.product_id,
    sku: data.sku,
    serialNumber: data.serial_number,
    imei: data.imei,
    price: data.price,
    cost: data.cost,
    status: data.status,
    batteryHealth: data.battery_health,
    storage: data.storage,
    aestheticCondition: data.aesthetic_condition,
    color: data.color,
    replacedParts: data.replaced_parts || [],
    notes: data.notes,
    createdAt: toDate(data.created_at),
    updatedAt: toDate(data.updated_at),
  };
};

export const updateProductVariant = async (
  variantId: string,
  variantData: Partial<Omit<ProductVariant, "id" | "productId" | "createdAt" | "updatedAt">>
): Promise<ProductVariant> => {
  const supabase = getSupabaseServerClient();
  const now = nowIso();

  const updates: any = {
    updated_at: now,
  };

  if (variantData.sku !== undefined) updates.sku = variantData.sku;
  if (variantData.serialNumber !== undefined) updates.serial_number = variantData.serialNumber;
  if (variantData.imei !== undefined) updates.imei = variantData.imei;
  if (variantData.price !== undefined) updates.price = variantData.price;
  if (variantData.cost !== undefined) updates.cost = variantData.cost;
  if (variantData.status !== undefined) updates.status = variantData.status;
  if (variantData.batteryHealth !== undefined) updates.battery_health = variantData.batteryHealth;
  if (variantData.storage !== undefined) updates.storage = variantData.storage;
  if (variantData.aestheticCondition !== undefined) updates.aesthetic_condition = variantData.aestheticCondition;
  if (variantData.color !== undefined) updates.color = variantData.color;
  if (variantData.replacedParts !== undefined) updates.replaced_parts = variantData.replacedParts;
  if (variantData.notes !== undefined) updates.notes = variantData.notes;

  const { data, error } = await supabase
    .from(PRODUCT_VARIANTS_TABLE)
    .update(updates)
    .eq("id", variantId)
    .select("*")
    .single();

  if (error) {
    log.error("Error updating product variant", error);
    throw new Error("Failed to update product variant.");
  }

  return {
    id: data.id,
    productId: data.product_id,
    sku: data.sku,
    serialNumber: data.serial_number,
    imei: data.imei,
    price: data.price,
    cost: data.cost,
    status: data.status,
    batteryHealth: data.battery_health,
    storage: data.storage,
    aestheticCondition: data.aesthetic_condition,
    color: data.color,
    replacedParts: data.replaced_parts || [],
    notes: data.notes,
    createdAt: toDate(data.created_at),
    updatedAt: toDate(data.updated_at),
  };
};

export const deleteProductVariant = async (variantId: string): Promise<void> => {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from(PRODUCT_VARIANTS_TABLE)
    .delete()
    .eq("id", variantId);

  if (error) {
    log.error("Error deleting product variant", error);
    throw new Error("Failed to delete product variant.");
  }
};


export const uploadProductImage = async (formData: FormData): Promise<string> => {
  const supabase = getSupabaseServerClient();
  const file = formData.get('file') as File;

  if (!file) {
    throw new Error("No file provided");
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(filePath, file);

  if (uploadError) {
    log.error("Error uploading image to storage", uploadError);
    throw new Error("Failed to upload image");
  }

  const { data: { publicUrl } } = supabase.storage
    .from('products')
    .getPublicUrl(filePath);

  return publicUrl;
};

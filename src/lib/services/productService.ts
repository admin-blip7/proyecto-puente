
'use server';

import { Product, StockEntryItem, BulkUpdateData, ProductVariant } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("productService");

const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";
const PRODUCT_VARIANTS_TABLE = "product_variants";

// Helper function to resolve consignor Firestore ID to PostgreSQL UUID
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
  
  // If not found by ID, try by firestore_id
  const { data: firestoreData, error: firestoreError } = await supabase
    .from("consignors")
    .select("id, name")
    .eq("firestore_id", consignorId)
    .maybeSingle();
    
  if (firestoreError) {
    log.error(`Error querying consignor by firestore_id: ${consignorId}`, firestoreError);
  }
  
  if (firestoreData) {
    log.info(`Found consignor by firestore_id: ${consignorId} -> ${firestoreData.name} (${firestoreData.id})`);
    return firestoreData.id;
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

  // Resolve consignor ID to proper PostgreSQL UUID
  const resolvedConsignorId = await resolveConsignorId(productData.consignorId);

  const payload = {
    id: newId,
    firestore_id: newId,
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
    search_keywords: searchKeywords, // Corregido: search_keywords en lugar de searchKeywords
    category: productData.category ?? null,
    attributes: productData.attributes ?? {},
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
      ownership_type: productData.ownershipType ?? existingRow.ownership_type ?? "Propio",
      consignor_id: productData.consignorId ?? existingRow.consignor_id ?? null,
      reorder_point: productData.reorderPoint ?? existingRow.reorder_point ?? 0,
      combo_product_ids: productData.comboProductIds ?? existingRow.combo_product_ids ?? [],
      compatibility_tags: productData.compatibilityTags ?? existingRow.compatibility_tags ?? [],
      search_keywords: searchKeywords, // Corregido: search_keywords en lugar de searchKeywords
      category: productData.category ?? existingRow.category,
      attributes: productData.attributes ?? existingRow.attributes ?? {},
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
            productId = row.firestore_id || row.id;
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
            } as Omit<Product, "id" | "createdAt" | "searchKeywords">);

            productId = newProduct.id;
            item.productId = productId;
            isNewProduct = true;
            row = { firestore_id: productId, id: productId }; // Asignar para el log
            log.info(`Successfully created new product: ${productId}`);
          } catch (addError: any) {
            // Si falla por SKU duplicado, buscarlo nuevamente
            if (item.sku && addError?.message?.includes('duplicate key') && addError?.message?.includes('sku')) {
              log.info(`SKU ${item.sku} ya existe, buscando producto existente...`);
              row = await fetchProductBySku(item.sku);
              if (row) {
                productId = row.firestore_id || row.id;
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
        
        // Resolve consignor ID to proper PostgreSQL UUID for updates
        const resolvedConsignorId = await resolveConsignorId(item.consignorId);
        
        const updateData = {
          stock: currentStock + item.quantity,
          cost: item.cost,
          price: item.price,
          ownership_type: item.ownershipType,
          consignor_id: resolvedConsignorId,
          category: item.category ?? null,
          attributes: item.attributes ?? {},
        };
        
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
      }

      // Registrar en el log de inventario
      const logData = {
        product_id: productId,
        product_name: item.name,
        change: item.quantity,
        reason: isNewProduct ? "Creación de Producto" : "Ingreso de Mercancía",
        updated_by: userId,
        created_at: nowIso(),
        metadata: {
          cost: item.cost,
          ownershipType: item.ownershipType,
          isNewProduct
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

export const deleteProducts = async (productIds: string[]): Promise<void> => {
  if (!productIds.length) return;
  const supabase = getSupabaseServerClient();
  
  // First, get the actual firestore_id and id for the products to be deleted
  const { data: productsToDelete, error: fetchError } = await supabase
    .from(PRODUCTS_TABLE)
    .select('id, firestore_id, name')
    .or(`id.in.(${productIds.join(',')}),firestore_id.in.(${productIds.join(',')})`);

  if (fetchError) {
    log.error("Error fetching products for deletion", fetchError);
    throw new Error("Failed to fetch products for deletion.");
  }

  if (!productsToDelete || productsToDelete.length === 0) {
    log.warn("No products found to delete", { productIds });
    throw new Error("No se encontraron productos para eliminar.");
  }

  // Extract both id and firestore_id for deletion
  const idsToDelete = productsToDelete.map(p => p.id).filter(Boolean);
  const firestoreIdsToDelete = productsToDelete.map(p => p.firestore_id).filter(Boolean);

  let deletionError = null;
  let deletedCount = 0;

  // Try to delete by UUID id first
  if (idsToDelete.length > 0) {
    const { error, count } = await supabase
      .from(PRODUCTS_TABLE)
      .delete({ count: 'exact' })
      .in('id', idsToDelete);

    if (error) {
      deletionError = error;
      log.error("Error deleting products by id", error);
    } else {
      deletedCount += count || 0;
    }
  }

  // Try to delete by firestore_id if there are any left
  if (firestoreIdsToDelete.length > 0) {
    const { error, count } = await supabase
      .from(PRODUCTS_TABLE)
      .delete({ count: 'exact' })
      .in('firestore_id', firestoreIdsToDelete);

    if (error) {
      deletionError = error;
      log.error("Error deleting products by firestore_id", error);
    } else {
      deletedCount += count || 0;
    }
  }

  if (deletionError) {
    throw new Error("Failed to delete products: " + deletionError.message);
  }

  // Check if we expected to delete more than we actually deleted
  if (deletedCount < productIds.length) {
    const remainingCount = productIds.length - deletedCount;
    log.warn(`Some products (${remainingCount}) could not be deleted, possibly due to dependencies`);
    throw new Error(`No se pudieron eliminar ${remainingCount} producto(s). Es posible que tengan dependencias como ventas o registros asociados.`);
  }

  log.info(`Successfully deleted ${deletedCount} products`, { 
    requestedIds: productIds,
    foundProducts: productsToDelete.map(p => ({ id: p.id, firestore_id: p.firestore_id, name: p.name }))
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
    .select("firestore_id, price, cost, compatibility_tags")
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
        .eq("firestore_id", row.firestore_id);

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

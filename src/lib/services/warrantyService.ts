"use server";

import { v4 as uuidv4 } from "uuid";
import { Warranty } from "@/types";
import { getSupabaseClientWithAuth } from "@/lib/supabaseClientWithAuth";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { uploadFile } from "./documentService";
import { getLogger } from "@/lib/logger";

const log = getLogger("warrantyService");

const WARRANTIES_TABLE = "warranties_new";
const WARRANTY_BUCKET = "warranties";

const mapWarranty = (row: any): Warranty => ({
  id: row?.firestore_id ?? row?.id ?? "",
  saleId: row?.sale_id ?? row?.saleId ?? "",
  productId: row?.product_id ?? row?.productId ?? "",
  productName: row?.product_name ?? row?.productName ?? "",
  customerName: row?.customer_name ?? row?.customerName ?? undefined,
  customerPhone: row?.customer_phone ?? row?.customerPhone ?? undefined,
  reason: row?.reason ?? "",
  status: row?.status ?? "Pendiente",
  reportedAt: toDate(row?.reported_at ?? row?.reportedAt),
  resolutionDetails: row?.resolution_details ?? row?.resolutionDetails ?? undefined,
  resolvedAt: row?.resolved_at ?? row?.resolvedAt ? toDate(row?.resolved_at ?? row?.resolvedAt) : undefined,
  imageUrls: Array.isArray(row?.image_urls ?? row?.imageUrls) ? (row?.image_urls ?? row?.imageUrls) : [],
});

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

export const getWarranties = async (): Promise<Warranty[]> => {
  try {
    const supabase = await getSupabaseClientWithAuth();
    const { data, error } = await supabase
      .from(WARRANTIES_TABLE)
      .select("*")
      .order("reported_at", { ascending: false });

    if (error) {
      log.error("Error fetching warranties from Supabase:", error);
      throw error;
    }

    log.info(`Fetched ${(data ?? []).length} warranties`);
    return (data ?? []).map(mapWarranty);
  } catch (error) {
    log.error("Error fetching warranties", error);
    return [];
  }
};

export const addWarranty = async (
  warrantyData: Omit<Warranty, "id" | "reportedAt" | "status" | "imageUrls">,
  images: File[]
): Promise<Warranty> => {
  try {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }
    const firestoreId = uuidv4();
    const reportedAt = nowIso();
    
    log.info(`Adding warranty for customer: ${warrantyData.customerName}`);
    const imageUrls = await uploadWarrantyImages(images);
    log.info(`Uploaded ${imageUrls.length} warranty images`);

    const payload = {
      firestore_id: firestoreId,
      sale_id: warrantyData.saleId,
      product_id: warrantyData.productId,
      product_name: warrantyData.productName,
      customer_name: warrantyData.customerName ?? null,
      customer_phone: warrantyData.customerPhone ?? null,
      reason: warrantyData.reason,
      status: "Pendiente" as const,
      reported_at: reportedAt,
      resolution_details: warrantyData.resolutionDetails ?? null,
      resolved_at: null,
      image_urls: imageUrls,
    };

    const { data, error } = await supabase
      .from(WARRANTIES_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      log.error("Warranty insert error:", error);
      throw error ?? new Error("Failed to add warranty");
    }

    const warranty = mapWarranty(data);
    log.info(`Warranty created: ${firestoreId}`);

    // Auto-create or link CRM client for warranties
    if (warrantyData.customerName && warrantyData.customerPhone) {
      try {
        log.info(`Creating/linking CRM client for warranty: ${warrantyData.customerName}, phone: ${warrantyData.customerPhone}`);
        const { createCRMClientFromSale } = await import("./crmClientService");
        
        const crmClient = await createCRMClientFromSale({
          name: warrantyData.customerName,
          phone: warrantyData.customerPhone,
          saleAmount: 0,
          saleId: firestoreId,
          interactionType: 'warranty'
        });

        if (crmClient && crmClient.id) {
          log.info(`✅ Successfully linked warranty ${firestoreId} to CRM client: ${crmClient.id} (${crmClient.firstName} ${crmClient.lastName})`);
        } else {
          log.warn(`⚠️ CRM client returned but no ID: ${JSON.stringify(crmClient)}`);
        }
      } catch (crmError) {
        log.error(`❌ Could not create/link CRM client for warranty ${firestoreId}:`, crmError);
        // Don't break warranty creation if CRM fails
      }
    } else {
      log.warn(`⚠️ Skipping CRM linking - missing name or phone: name=${warrantyData.customerName}, phone=${warrantyData.customerPhone}`);
    }

    return warranty;
  } catch (error) {
    log.error("Error adding warranty", error);
    throw new Error("Failed to add warranty.");
  }
};

export const updateWarranty = async (
  warrantyId: string,
  dataToUpdate: Partial<Warranty>
): Promise<void> => {
  try {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
      throw new Error("Supabase client not initialized");
    }
    // Convert camelCase to snake_case for database
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(dataToUpdate)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      updates[snakeKey] = value;
    }

    if (dataToUpdate.status === "Resuelta" || dataToUpdate.status === "Rechazada") {
      updates.resolved_at = nowIso();
    }

    const { error } = await supabase
      .from(WARRANTIES_TABLE)
      .update(updates)
      .eq('firestore_id', warrantyId);

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating warranty", error);
    throw new Error("Failed to update warranty.");
  }
};

const uploadWarrantyImages = async (images: File[]): Promise<string[]> => {
  if (!images || images.length === 0) {
    log.info("No warranty images to upload");
    return [];
  }

  try {
    const uploads = images.map(async (image) => {
      const objectPath = `${uuidv4()}-${image.name}`;
      return uploadFile(image, `${WARRANTY_BUCKET}/${objectPath}`);
    });

    const results = await Promise.all(uploads);
    log.info(`Uploaded ${results.length} warranty images successfully`);
    return results;
  } catch (error) {
    log.warn("Error uploading warranty images", error);
    return [];
  }
};

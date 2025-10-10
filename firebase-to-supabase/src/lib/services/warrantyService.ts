"use server";

import { v4 as uuidv4 } from "uuid";
import { Warranty } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { uploadFile } from "./documentService";
import { getLogger } from "@/lib/logger";

const log = getLogger("warrantyService");

const WARRANTIES_TABLE = "warranties";
const WARRANTY_BUCKET = "warranties";

const mapWarranty = (row: any): Warranty => ({
  id: row?.firestore_id ?? row?.id ?? "",
  saleId: row?.saleId ?? "",
  productId: row?.productId ?? "",
  productName: row?.productName ?? "",
  customerName: row?.customerName ?? undefined,
  customerPhone: row?.customerPhone ?? undefined,
  reason: row?.reason ?? "",
  status: row?.status ?? "Pendiente",
  reportedAt: toDate(row?.reportedAt),
  resolutionDetails: row?.resolutionDetails ?? undefined,
  resolvedAt: row?.resolvedAt ? toDate(row.resolvedAt) : undefined,
  imageUrls: Array.isArray(row?.imageUrls) ? row.imageUrls : [],
});

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

export const getWarranties = async (): Promise<Warranty[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(WARRANTIES_TABLE)
      .select("*")
      .order("reportedAt", { ascending: false });

    if (error) {
      throw error;
    }

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
    const supabase = getSupabaseServerClient();
    const firestoreId = uuidv4();
    const reportedAt = nowIso();
    const imageUrls = await uploadWarrantyImages(images);

    const payload = {
      firestore_id: firestoreId,
      saleId: warrantyData.saleId,
      productId: warrantyData.productId,
      productName: warrantyData.productName,
      customerName: warrantyData.customerName ?? null,
      customerPhone: warrantyData.customerPhone ?? null,
      reason: warrantyData.reason,
      status: "Pendiente" as const,
      reportedAt,
      resolutionDetails: warrantyData.resolutionDetails ?? null,
      resolvedAt: null,
      imageUrls,
    };

    const { data, error } = await supabase
      .from(WARRANTIES_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Failed to add warranty");
    }

    return mapWarranty(data);
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
    const supabase = getSupabaseServerClient();
    const updates: Record<string, any> = { ...dataToUpdate };

    if (dataToUpdate.status === "Resuelta" || dataToUpdate.status === "Rechazada") {
      updates.resolvedAt = nowIso();
    }

    const { error } = await supabase
      .from(WARRANTIES_TABLE)
      .update(updates)
      .or(orIdFilter(warrantyId));

    if (error) {
      throw error;
    }
  } catch (error) {
    log.error("Error updating warranty", error);
    throw new Error("Failed to update warranty.");
  }
};

const uploadWarrantyImages = async (images: File[]): Promise<string[]> => {
  const uploads = images.map(async (image) => {
    const objectPath = `${uuidv4()}-${image.name}`;
    return uploadFile(image, `${WARRANTY_BUCKET}/${objectPath}`);
  });

  return Promise.all(uploads);
};

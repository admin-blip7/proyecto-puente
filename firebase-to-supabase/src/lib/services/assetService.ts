"use server";

import { v4 as uuidv4 } from "uuid";
import { FixedAsset } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("assetService");

const ASSETS_TABLE = "fixed_assets";

const mapAsset = (row: any): FixedAsset => ({
  id: row?.firestore_id ?? row?.id ?? "",
  assetId: row?.assetId ?? "",
  name: row?.name ?? "",
  category: row?.category ?? "Otro",
  purchaseDate: toDate(row?.purchaseDate),
  purchaseCost: Number(row?.purchaseCost ?? 0),
  usefulLifeYrs: Number(row?.usefulLifeYrs ?? 1),
  salvageValue: Number(row?.salvageValue ?? 0),
  currentValue: Number(row?.currentValue ?? 0),
  depreciationMethod: row?.depreciationMethod ?? "Lineal",
  lastDepreciationDate: toDate(row?.lastDepreciationDate),
});

export const getAssets = async (): Promise<FixedAsset[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .select("*")
      .order("purchaseDate", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapAsset);
  } catch (error) {
    log.error("Error fetching assets", error);
    return [];
  }
};

export const addAsset = async (
  assetData: Omit<FixedAsset, "id" | "assetId" | "currentValue" | "lastDepreciationDate">
): Promise<FixedAsset> => {
  const supabase = getSupabaseServerClient();
  const assetId = `ASSET-${uuidv4().split("-")[0].toUpperCase()}`;
  const firestoreId = uuidv4();

  try {
    const payload = {
      firestore_id: firestoreId,
      assetId,
      name: assetData.name,
      category: assetData.category,
      purchaseDate: assetData.purchaseDate.toISOString(),
      purchaseCost: assetData.purchaseCost,
      usefulLifeYrs: assetData.usefulLifeYrs,
      salvageValue: assetData.salvageValue,
      currentValue: assetData.purchaseCost,
      depreciationMethod: assetData.depreciationMethod,
      lastDepreciationDate: assetData.purchaseDate.toISOString(),
      createdAt: nowIso(),
    };

    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Failed to add asset");
    }

    return mapAsset(data);
  } catch (error) {
    log.error("Error adding asset", error);
    throw error;
  }
};

export const runAnnualDepreciation = async (): Promise<number> => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(ASSETS_TABLE).select("*");
  if (error) {
    log.error("Error loading assets for depreciation", error);
    throw error;
  }

  const assets = (data ?? []).map(mapAsset);
  const today = new Date();
  let updatedCount = 0;

  for (const asset of assets) {
    const yearsSinceLast =
      (today.getTime() - asset.lastDepreciationDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (yearsSinceLast >= 1) {
      const annual = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeYrs;
      let depreciation = annual * Math.floor(yearsSinceLast);
      let newValue = asset.currentValue - depreciation;

      if (newValue < asset.salvageValue) {
        depreciation = asset.currentValue - asset.salvageValue;
        newValue = asset.salvageValue;
      }

      if (depreciation > 0) {
        const { error: updateError } = await supabase
          .from(ASSETS_TABLE)
          .update({
            currentValue: newValue,
            lastDepreciationDate: today.toISOString(),
          })
          .or(`firestore_id.eq.${asset.id},id.eq.${asset.id}`);

        if (!updateError) {
          updatedCount += 1;
        } else {
          log.warn("Failed to update asset depreciation", { assetId: asset.id, error: updateError });
        }
      }
    }
  }

  return updatedCount;
};

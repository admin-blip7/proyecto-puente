"use server";

import { v4 as uuidv4 } from "uuid";
import { FixedAsset } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("assetService");

const ASSETS_TABLE = "fixed_assets";

const mapFixedAsset = (row: any): FixedAsset => ({
  id: row?.id ?? "",
  assetId: row?.assetid ?? row?.assetId ?? "",
  name: row?.name ?? "",
  category: row?.category ?? "Otro",
  purchaseDate: toDate(row?.purchasedate ?? row?.purchaseDate),
  purchaseCost: Number(row?.purchasecost ?? row?.purchaseCost ?? 0),
  usefulLifeYrs: Number(row?.usefullifeyrs ?? row?.usefulLifeYrs ?? 0),
  salvageValue: Number(row?.salvagevalue ?? row?.salvageValue ?? 0),
  currentValue: Number(row?.currentvalue ?? row?.currentValue ?? 0),
  depreciationMethod: row?.depreciationmethod ?? row?.depreciationMethod ?? "Lineal",
  lastDepreciationDate: row?.lastdepreciationdate ? toDate(row?.lastdepreciationdate) : (row?.lastDepreciationDate ? toDate(row?.lastDepreciationDate) : toDate(row?.purchasedate ?? row?.purchaseDate)),
  custom_icon: row?.custom_icon ?? "",
});

export const getAssets = async (): Promise<FixedAsset[]> => {
  const startTime = Date.now();
  const requestId = `assets-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    log.info(`[getAssets] Starting request`, {
      requestId,
      timestamp: new Date().toISOString()
    });

    let supabase;
    try {
      supabase = getSupabaseServerClient();
    } catch (clientError) {
      log.error("[getAssets] Failed to initialize Supabase client", {
        requestId,
        error: clientError instanceof Error ? clientError.message : String(clientError)
      });
      return [];
    }

    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .select("*")
      .order("purchasedate", { ascending: false });

    if (error) {
      log.error("[getAssets] Query failed", {
        requestId,
        error: error.message
      });
      // Fallback try simple select if order failed
      const { data: fallbackData, error: fallbackError } = await supabase
        .from(ASSETS_TABLE)
        .select("*");

      if (fallbackError) return [];
      return (fallbackData ?? []).map(mapFixedAsset);
    }

    return (data ?? []).map(mapFixedAsset);
  } catch (error) {
    log.error("[getAssets] Unexpected error", {
      requestId,
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
};

export const addAsset = async (
  assetData: Omit<FixedAsset, "id" | "assetId" | "currentValue" | "lastDepreciationDate">
): Promise<FixedAsset> => {
  try {
    const supabase = getSupabaseServerClient();
    const assetId = `ASSET-${uuidv4().split("-")[0].toUpperCase()}`;
    const payload = {
      assetid: assetId,
      name: assetData.name.trim(),
      category: assetData.category ?? "Otro",
      purchasedate: assetData.purchaseDate.toISOString(),
      purchasecost: assetData.purchaseCost,
      usefullifeyrs: assetData.usefulLifeYrs ?? 1,
      salvagevalue: assetData.salvageValue ?? 0,
      currentvalue: assetData.purchaseCost,
      depreciationmethod: assetData.depreciationMethod ?? "Lineal",
      lastdepreciationdate: assetData.purchaseDate.toISOString(),
      custom_icon: assetData.custom_icon ?? null,
      createdat: nowIso(),
    };

    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      log.error("[addAsset] Insert failed", { error: error?.message });
      throw error ?? new Error("Failed to add asset");
    }

    return mapFixedAsset(data);
  } catch (error) {
    log.error("[addAsset] Unexpected error", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export const runAnnualDepreciation = async (): Promise<number> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from(ASSETS_TABLE).select("*");
    if (error) throw error;

    const assets = (data ?? []).map(mapFixedAsset);
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
              currentvalue: newValue,
              lastdepreciationdate: today.toISOString(),
            })
            .eq("id", asset.id);

          if (!updateError) updatedCount += 1;
        }
      }
    }

    return updatedCount;
  } catch (error) {
    log.error("[runAnnualDepreciation] Unexpected error", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

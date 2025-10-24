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
      log.debug(`[getAssets] Supabase client initialized`, { requestId });
    } catch (clientError) {
      log.error("[getAssets] Failed to initialize Supabase client", {
        requestId,
        error: clientError instanceof Error ? clientError.message : String(clientError),
        stack: clientError instanceof Error ? clientError.stack : undefined
      });
      return [];
    }

    // Verificar conexión y acceso a la tabla con timeout
    const connectionTimeout = setTimeout(() => {
      log.warn("[getAssets] Connection timeout warning", {
        requestId,
        elapsed: Date.now() - startTime
      });
    }, 5000);

    let data: any[] | null = null;
    let error: any = null;

    try {
      // Primero verificar que la tabla existe y es accesible
      const { data: testData, error: testError } = await supabase
        .from(ASSETS_TABLE)
        .select("id")
        .limit(1);

      clearTimeout(connectionTimeout);

      if (testError) {
        log.error("[getAssets] Error accessing fixed_assets table", {
          requestId,
          error: {
            message: testError.message,
            code: testError.code,
            details: testError.details,
            hint: testError.hint
          },
          table: ASSETS_TABLE
        });
        return [];
      }

      log.debug(`[getAssets] Table access verified`, { requestId });

      // Realizar la consulta principal con manejo flexible de nombres de columna
      let result;
      let error;
      
      // Intentar con diferentes nombres de columna para la ordenación
      const sortColumns = ["purchaseDate", "purchase_date", "purchasedate"];
      let sortColumnFound = false;
      
      for (const sortColumn of sortColumns) {
        try {
          result = await supabase
            .from(ASSETS_TABLE)
            .select("*")
            .order(sortColumn, { ascending: false });
          
          if (!result.error) {
            sortColumnFound = true;
            log.debug(`[getAssets] Successfully used sort column: ${sortColumn}`, { requestId });
            break;
          }
        } catch (sortError) {
          log.debug(`[getAssets] Sort column ${sortColumn} not found`, {
            requestId,
            error: sortError instanceof Error ? sortError.message : String(sortError)
          });
        }
      }
      
      // Si ningún nombre de columna funciona, hacer consulta sin ordenación
      if (!sortColumnFound) {
        log.warn(`[getAssets] No valid sort column found, using unsorted query`, { requestId });
        result = await supabase
          .from(ASSETS_TABLE)
          .select("*");
      }
      
      // Asegurar que result esté definido
      if (!result) {
        throw new Error("Failed to execute asset query");
      }

      data = result.data;
      error = result.error;

      if (error) {
        log.error("[getAssets] Query failed", {
          requestId,
          error: {
            message: error.message,
            code: error.code,
            details: error.details
          }
        });
        return [];
      }

      log.info(`[getAssets] Successfully queried assets`, {
        requestId,
        recordCount: data?.length || 0
      });
    } catch (queryError) {
      clearTimeout(connectionTimeout);
      log.error("[getAssets] Exception during query", {
        requestId,
        error: queryError instanceof Error ? queryError.message : String(queryError)
      });
      return [];
    }

    const processingTime = Date.now() - startTime;
    const assetCount = data?.length || 0;
    
    log.info(`[getAssets] Successfully completed`, {
      requestId,
      assetCount,
      processingTime: `${processingTime}ms`
    });

    // Validar y mapear los datos de forma segura
    try {
      const mappedAssets = (data ?? []).map(mapAsset);
      log.debug(`[getAssets] Data mapping successful`, {
        requestId,
        inputCount: data?.length || 0,
        outputCount: mappedAssets.length
      });
      return mappedAssets;
    } catch (mappingError) {
      log.error("[getAssets] Error mapping asset data", {
        requestId,
        error: mappingError instanceof Error ? mappingError.message : String(mappingError),
        rawDataSample: data ? data.slice(0, 2) : null
      });
      return [];
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[getAssets] Unexpected error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    return [];
  }
};

export const addAsset = async (
  assetData: Omit<FixedAsset, "id" | "assetId" | "currentValue" | "lastDepreciationDate">
): Promise<FixedAsset> => {
  const startTime = Date.now();
  const requestId = `add-asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    log.info(`[addAsset] Starting request`, {
      requestId,
      name: assetData.name,
      category: assetData.category,
      purchaseCost: assetData.purchaseCost
    });

    // Validar datos de entrada
    if (!assetData.name || assetData.name.trim().length === 0) {
      throw new Error("Asset name is required");
    }

    if (typeof assetData.purchaseCost !== 'number' || assetData.purchaseCost < 0) {
      throw new Error("Purchase cost must be a non-negative number");
    }

    if (!assetData.purchaseDate) {
      throw new Error("Purchase date is required");
    }

    const supabase = getSupabaseServerClient();
    const assetId = `ASSET-${uuidv4().split("-")[0].toUpperCase()}`;
    const firestoreId = uuidv4();

    const payload = {
      firestore_id: firestoreId,
      assetId,
      name: assetData.name.trim(),
      category: assetData.category ?? "Otro",
      purchaseDate: assetData.purchaseDate.toISOString(),
      purchaseCost: assetData.purchaseCost,
      usefulLifeYrs: assetData.usefulLifeYrs ?? 1,
      salvageValue: assetData.salvageValue ?? 0,
      currentValue: assetData.purchaseCost,
      depreciationMethod: assetData.depreciationMethod ?? "Lineal",
      lastDepreciationDate: assetData.purchaseDate.toISOString(),
      createdAt: nowIso(),
    };

    const { data, error } = await supabase
      .from(ASSETS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      log.error("[addAsset] Database operation failed", {
        requestId,
        error: error?.message || "No data returned",
        code: error?.code,
        details: error?.details
      });
      throw error ?? new Error("Failed to add asset");
    }

    const processingTime = Date.now() - startTime;
    const mappedAsset = mapAsset(data);
    
    log.info(`[addAsset] Successfully completed`, {
      requestId,
      assetId: mappedAsset.id,
      assetNumber: mappedAsset.assetId,
      name: mappedAsset.name,
      processingTime: `${processingTime}ms`
    });

    return mappedAsset;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[addAsset] Unexpected error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    throw error;
  }
};

export const runAnnualDepreciation = async (): Promise<number> => {
  const startTime = Date.now();
  const requestId = `depreciation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    log.info(`[runAnnualDepreciation] Starting depreciation process`, {
      requestId,
      timestamp: new Date().toISOString()
    });

    const supabase = getSupabaseServerClient();
    
    // Cargar todos los activos
    const { data, error } = await supabase.from(ASSETS_TABLE).select("*");
    if (error) {
      log.error("[runAnnualDepreciation] Error loading assets for depreciation", {
        requestId,
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        }
      });
      throw error;
    }

    const assets = (data ?? []).map(mapAsset);
    const today = new Date();
    let updatedCount = 0;
    let processedCount = 0;
    let skippedCount = 0;

    log.info(`[runAnnualDepreciation] Processing ${assets.length} assets`, {
      requestId,
      totalAssets: assets.length
    });

    for (const asset of assets) {
      try {
        processedCount++;
        
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
              log.debug(`[runAnnualDepreciation] Asset depreciated`, {
                requestId,
                assetId: asset.id,
                assetNumber: asset.assetId,
                depreciation,
                newValue
              });
            } else {
              log.warn("[runAnnualDepreciation] Failed to update asset depreciation", {
                requestId,
                assetId: asset.id,
                assetNumber: asset.assetId,
                error: updateError.message
              });
            }
          } else {
            skippedCount++;
            log.debug(`[runAnnualDepreciation] Asset skipped (no depreciation)`, {
              requestId,
              assetId: asset.id,
              assetNumber: asset.assetId,
              currentValue: asset.currentValue,
              salvageValue: asset.salvageValue
            });
          }
        } else {
          skippedCount++;
          log.debug(`[runAnnualDepreciation] Asset skipped (too soon)`, {
            requestId,
            assetId: asset.id,
            assetNumber: asset.assetId,
            yearsSinceLast,
            lastDepreciationDate: asset.lastDepreciationDate.toISOString()
          });
        }
      } catch (assetError) {
        log.error("[runAnnualDepreciation] Error processing asset", {
          requestId,
          assetId: asset.id,
          assetNumber: asset.assetId,
          error: assetError instanceof Error ? assetError.message : String(assetError)
        });
      }
    }

    const processingTime = Date.now() - startTime;
    log.info(`[runAnnualDepreciation] Depreciation process completed`, {
      requestId,
      totalAssets: assets.length,
      processedCount,
      updatedCount,
      skippedCount,
      processingTime: `${processingTime}ms`
    });

    return updatedCount;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[runAnnualDepreciation] Unexpected error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    throw error;
  }
};

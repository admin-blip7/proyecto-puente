"use server";

import { v4 as uuidv4 } from "uuid";
import { ConsignorPayment } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { uploadFile } from "./documentService";
import { updateConsignorBalance } from "./consignorService";
import { getLogger } from "@/lib/logger";

const log = getLogger("paymentService");

const CONSIGNOR_PAYMENTS_TABLE = "consignor_payments";
const STORAGE_PAYMENT_PROOFS_PATH = "payment_proofs";

const mapPayment = (row: any): ConsignorPayment => ({
  id: row?.firestore_id ?? row?.id ?? "",
  paymentId: row?.paymentId ?? "",
  consignorId: row?.consignorid ?? "",
  amountPaid: Number(row?.amountPaid ?? 0),
  paymentDate: toDate(row?.paymentDate),
  paymentMethod: row?.paymentMethod ?? "Efectivo",
  proofOfPaymentUrl: row?.proofOfPaymentUrl ?? "",
  notes: row?.notes ?? undefined,
});

export const getConsignorPayments = async (consignorId: string): Promise<ConsignorPayment[]> => {
  const startTime = Date.now();
  const requestId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    log.info(`[getConsignorPayments] Starting request`, {
      requestId,
      consignorId,
      timestamp: new Date().toISOString()
    });

    if (!consignorId) {
      log.error("[getConsignorPayments] No consignorId provided", {
        requestId,
        consignorId: consignorId || 'undefined'
      });
      return [];
    }

    // Validar formato del consignorId
    if (typeof consignorId !== 'string' || consignorId.trim().length === 0) {
      log.error("[getConsignorPayments] Invalid consignorId format", {
        requestId,
        consignorId,
        type: typeof consignorId
      });
      return [];
    }

    let supabase;
    try {
      supabase = getSupabaseServerClient();
      log.debug(`[getConsignorPayments] Supabase client initialized`, { requestId });
    } catch (clientError) {
      log.error("[getConsignorPayments] Failed to initialize Supabase client", {
        requestId,
        error: clientError instanceof Error ? clientError.message : String(clientError),
        stack: clientError instanceof Error ? clientError.stack : undefined
      });
      return [];
    }

    // Verificar conexión y acceso a la tabla con timeout
    const connectionTimeout = setTimeout(() => {
      log.warn("[getConsignorPayments] Connection timeout warning", {
        requestId,
        elapsed: Date.now() - startTime
      });
    }, 5000);

    try {
      const { data: testData, error: testError } = await supabase
        .from(CONSIGNOR_PAYMENTS_TABLE)
        .select("id")
        .limit(1);

      clearTimeout(connectionTimeout);

      if (testError) {
        log.error("[getConsignorPayments] Error accessing consignor_payments table", {
          requestId,
          error: {
            message: testError.message,
            code: testError.code,
            details: testError.details,
            hint: testError.hint
          },
          table: CONSIGNOR_PAYMENTS_TABLE
        });
        return [];
      }

      log.debug(`[getConsignorPayments] Table access verified`, { requestId });
    } catch (connectionError) {
      clearTimeout(connectionTimeout);
      log.error("[getConsignorPayments] Connection test failed", {
        requestId,
        error: connectionError instanceof Error ? connectionError.message : String(connectionError)
      });
      return [];
    }

    // Intentar la consulta con diferentes nombres de columna
    let data: any[] | null = null;
    let error: any = null;
    const columnVariations = ["consignorid", "consignorId", "consignor_id"];
    
    for (const columnName of columnVariations) {
      try {
        log.debug(`[getConsignorPayments] Attempting query with column: ${columnName}`, { requestId });
        
        const result = await supabase
          .from(CONSIGNOR_PAYMENTS_TABLE)
          .select("*")
          .eq(columnName, consignorId)
          .order("paymentDate", { ascending: false });

        data = result.data;
        error = result.error;

        if (!error) {
          log.info(`[getConsignorPayments] Successfully queried with column: ${columnName}`, {
            requestId,
            columnName,
            recordCount: data?.length || 0
          });
          break;
        } else {
          log.debug(`[getConsignorPayments] Query failed with column: ${columnName}`, {
            requestId,
            columnName,
            error: error.message
          });
        }
      } catch (queryError) {
        log.debug(`[getConsignorPayments] Exception with column: ${columnName}`, {
          requestId,
          columnName,
          error: queryError instanceof Error ? queryError.message : String(queryError)
        });
      }
    }

    if (error) {
      log.error("[getConsignorPayments] All column variations failed", {
        requestId,
        lastError: {
          message: error.message,
          code: error.code,
          details: error.details
        },
        attemptedColumns: columnVariations,
        consignorId
      });
      return [];
    }

    const processingTime = Date.now() - startTime;
    const paymentCount = data?.length || 0;
    
    log.info(`[getConsignorPayments] Successfully completed`, {
      requestId,
      consignorId,
      paymentCount,
      processingTime: `${processingTime}ms`
    });

    // Validar y mapear los datos de forma segura
    try {
      const mappedPayments = (data ?? []).map(mapPayment);
      log.debug(`[getConsignorPayments] Data mapping successful`, {
        requestId,
        inputCount: data?.length || 0,
        outputCount: mappedPayments.length
      });
      return mappedPayments;
    } catch (mappingError) {
      log.error("[getConsignorPayments] Error mapping payment data", {
        requestId,
        error: mappingError instanceof Error ? mappingError.message : String(mappingError),
        rawDataSample: data ? data.slice(0, 2) : null
      });
      return [];
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[getConsignorPayments] Unexpected error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      consignorId,
      processingTime: `${processingTime}ms`
    });
    return [];
  }
};

// Nueva función para obtener pagos de múltiples consignatarios con mejor manejo de errores
export const getConsignorPaymentsBatch = async (consignorIds: string[]): Promise<Record<string, ConsignorPayment[]>> => {
  const requestId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    log.info(`[getConsignorPaymentsBatch] Starting batch request`, {
      requestId,
      consignorCount: consignorIds.length,
      consignorIds: consignorIds.slice(0, 5) // Log solo los primeros 5 para evitar spam
    });

    if (!consignorIds || consignorIds.length === 0) {
      log.warn(`[getConsignorPaymentsBatch] Empty consignorIds array`, { requestId });
      return {};
    }

    // Validar IDs antes de procesar
    const validIds = consignorIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
    if (validIds.length !== consignorIds.length) {
      log.warn(`[getConsignorPaymentsBatch] Some invalid IDs filtered`, {
        requestId,
        originalCount: consignorIds.length,
        validCount: validIds.length
      });
    }

    // Procesar en lotes más pequeños para evitar sobrecarga
    const batchSize = 5;
    const results: Record<string, ConsignorPayment[]> = {};
    
    for (let i = 0; i < validIds.length; i += batchSize) {
      const batch = validIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (consignorId) => {
        try {
          const payments = await getConsignorPayments(consignorId);
          return { consignorId, payments, error: null };
        } catch (error) {
          log.error(`[getConsignorPaymentsBatch] Error processing consignor`, {
            requestId,
            consignorId,
            error: error instanceof Error ? error.message : String(error)
          });
          return { consignorId, payments: [], error };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        const consignorId = batch[index];
        if (result.status === 'fulfilled') {
          results[consignorId] = result.value.payments;
        } else {
          log.error(`[getConsignorPaymentsBatch] Promise rejected for consignor`, {
            requestId,
            consignorId,
            error: result.reason
          });
          results[consignorId] = [];
        }
      });

      // Pequeña pausa entre lotes para no sobrecargar
      if (i + batchSize < validIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const processingTime = Date.now() - startTime;
    const totalPayments = Object.values(results).reduce((sum, payments) => sum + payments.length, 0);
    
    log.info(`[getConsignorPaymentsBatch] Batch completed`, {
      requestId,
      processedCount: validIds.length,
      totalPayments,
      processingTime: `${processingTime}ms`
    });

    return results;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error(`[getConsignorPaymentsBatch] Unexpected batch error`, {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    
    // Retornar objeto vacío en caso de error grave
    return {};
  }
};

const uploadProofOfPayment = async (
  file: File,
  consignorId: string,
  paymentId: string
): Promise<string> => {
  // Sanitize the filename to remove special characters that cause StorageApiError
  const sanitizeFilename = (filename: string): string => {
    // Replace special characters with underscores and remove accents
    return filename
      .normalize('NFD') // Normalize to decompose accents
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special characters with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  const sanitizedFilename = sanitizeFilename(file.name);
  const filePath = `${STORAGE_PAYMENT_PROOFS_PATH}/${consignorId}/${paymentId}-${sanitizedFilename}`;
  return uploadFile(file, filePath);
};

export const addConsignorPayment = async (
  paymentData: Omit<ConsignorPayment, "id" | "paymentId" | "paymentDate" | "proofOfPaymentUrl">,
  proofFile: File
): Promise<void> => {
  const paymentId = `PAY-${uuidv4().split("-")[0].toUpperCase()}`;
  const { consignorId, amountPaid } = paymentData;

  if (!consignorId) {
    throw new Error("Consignor ID is required.");
  }
  if (!proofFile) {
    throw new Error("Proof of payment file is required.");
  }

  const supabase = getSupabaseServerClient();

  try {
    const proofOfPaymentUrl = await uploadProofOfPayment(proofFile, consignorId, paymentId);
    const firestoreId = uuidv4();
    const paymentDate = nowIso();

    const payload = {
      firestore_id: firestoreId,
      paymentId,
      consignorid: consignorId,
      amountPaid,
      paymentDate,
      paymentMethod: paymentData.paymentMethod,
      proofOfPaymentUrl,
      notes: paymentData.notes ?? null,
    };

    const { error: insertError } = await supabase.from(CONSIGNOR_PAYMENTS_TABLE).insert(payload);
    if (insertError) {
      throw insertError;
    }

    await updateConsignorBalance(consignorId, -amountPaid);
  } catch (error) {
    log.error("Error processing consignor payment", error instanceof Error ? error.message : String(error));
    throw error;
  }
};

// Nueva función para obtener todos los pagos de consignadores
export const getAllConsignorPayments = async (): Promise<ConsignorPayment[]> => {
  const startTime = Date.now();
  const requestId = `all-payments-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    log.info(`[getAllConsignorPayments] Starting request`, {
      requestId,
      timestamp: new Date().toISOString()
    });

    const supabase = getSupabaseServerClient();

    // Verificar conexión y acceso a la tabla
    const { data: testData, error: testError } = await supabase
      .from(CONSIGNOR_PAYMENTS_TABLE)
      .select("id")
      .limit(1);

    if (testError) {
      log.error("[getAllConsignorPayments] Error accessing consignor_payments table", {
        requestId,
        error: testError
      });
      return [];
    }

    // Obtener todos los pagos ordenados por fecha
    const { data, error } = await supabase
      .from(CONSIGNOR_PAYMENTS_TABLE)
      .select("*")
      .order("paymentDate", { ascending: false });

    if (error) {
      log.error("[getAllConsignorPayments] Error fetching payments", {
        requestId,
        error
      });
      return [];
    }

    const processingTime = Date.now() - startTime;
    const paymentCount = data?.length || 0;
    
    log.info(`[getAllConsignorPayments] Successfully completed`, {
      requestId,
      paymentCount,
      processingTime: `${processingTime}ms`
    });

    return (data ?? []).map(mapPayment);
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[getAllConsignorPayments] Unexpected error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    return [];
  }
};

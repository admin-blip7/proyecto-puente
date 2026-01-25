"use server";

import { v4 as uuidv4 } from "uuid";
import { Debt } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("debtService");

const DEBTS_TABLE = "debts";

const mapDebt = (row: any): Debt => ({
  id: row?.id ?? "",
  creditorName: row?.creditorName ?? "",
  debtType: row?.debtType ?? "Otro",
  currentBalance: Number(row?.current_balance ?? 0),
  createdAt: toDate(row?.createdAt),
  totalLimit: row?.totalLimit !== null ? Number(row.totalLimit) : undefined,
  closingDate: row?.closingDate ?? undefined,
  paymentDueDate: row?.paymentDueDate ?? undefined,
  interestRate: row?.interestRate !== null ? Number(row.interestRate) : undefined,
  cat: row?.cat !== null ? Number(row.cat) : undefined,
});



export const getDebts = async (): Promise<Debt[]> => {
  const startTime = Date.now();
  const requestId = `debts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    log.info(`[getDebts] Starting request`, {
      requestId,
      timestamp: new Date().toISOString()
    });

    let supabase;
    try {
      supabase = getSupabaseServerClient();
      log.debug(`[getDebts] Supabase client initialized`, { requestId });
    } catch (clientError) {
      log.error("[getDebts] Failed to initialize Supabase client", {
        requestId,
        error: clientError instanceof Error ? clientError.message : String(clientError),
        stack: clientError instanceof Error ? clientError.stack : undefined
      });
      return [];
    }

    // Verificar conexión y acceso a la tabla con timeout
    const connectionTimeout = setTimeout(() => {
      log.warn("[getDebts] Connection timeout warning", {
        requestId,
        elapsed: Date.now() - startTime
      });
    }, 5000);

    let data: any[] | null = null;
    let error: any = null;

    try {
      // Primero verificar que la tabla existe y es accesible
      const { data: testData, error: testError } = await supabase
        .from(DEBTS_TABLE)
        .select("id")
        .limit(1);

      clearTimeout(connectionTimeout);

      if (testError) {
        log.error("[getDebts] Error accessing debts table", {
          requestId,
          error: {
            message: testError.message,
            code: testError.code,
            details: testError.details,
            hint: testError.hint
          },
          table: DEBTS_TABLE
        });
        return [];
      }

      log.debug(`[getDebts] Table access verified`, { requestId });

      // Realizar la consulta principal con manejo flexible de nombres de columna
      let result;
      let error;

      // Intentar con diferentes nombres de columna para la ordenación
      const sortColumns = ["creditorName", "creditor_name", "creditorname"];
      let sortColumnFound = false;

      for (const sortColumn of sortColumns) {
        try {
          result = await supabase
            .from(DEBTS_TABLE)
            .select("*")
            .order(sortColumn, { ascending: true });

          if (!result.error) {
            sortColumnFound = true;
            log.debug(`[getDebts] Successfully used sort column: ${sortColumn}`, { requestId });
            break;
          }
        } catch (sortError) {
          log.debug(`[getDebts] Sort column ${sortColumn} not found`, {
            requestId,
            error: sortError instanceof Error ? sortError.message : String(sortError)
          });
        }
      }

      // Si ningún nombre de columna funciona, hacer consulta sin ordenación
      if (!sortColumnFound) {
        log.warn(`[getDebts] No valid sort column found, using unsorted query`, { requestId });
        result = await supabase
          .from(DEBTS_TABLE)
          .select("*");
      }

      // Asegurar que result esté definido
      if (!result) {
        throw new Error("Failed to execute debt query");
      }

      data = result.data;
      error = result.error;

      if (error) {
        log.error("[getDebts] Query failed", {
          requestId,
          error: {
            message: error.message,
            code: error.code,
            details: error.details
          }
        });
        return [];
      }

      log.info(`[getDebts] Successfully queried debts`, {
        requestId,
        recordCount: data?.length || 0
      });
    } catch (queryError) {
      clearTimeout(connectionTimeout);
      log.error("[getDebts] Exception during query", {
        requestId,
        error: queryError instanceof Error ? queryError.message : String(queryError)
      });
      return [];
    }

    const processingTime = Date.now() - startTime;
    const debtCount = data?.length || 0;

    log.info(`[getDebts] Successfully completed`, {
      requestId,
      debtCount,
      processingTime: `${processingTime}ms`
    });

    // Validar y mapear los datos de forma segura
    try {
      const mappedDebts = (data ?? []).map(mapDebt);
      log.debug(`[getDebts] Data mapping successful`, {
        requestId,
        inputCount: data?.length || 0,
        outputCount: mappedDebts.length
      });
      return mappedDebts;
    } catch (mappingError) {
      log.error("[getDebts] Error mapping debt data", {
        requestId,
        error: mappingError instanceof Error ? mappingError.message : String(mappingError),
        rawDataSample: data ? data.slice(0, 2) : null
      });
      return [];
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[getDebts] Unexpected error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    return [];
  }
};

export const addDebt = async (
  debtData: Omit<Debt, "id" | "createdAt">
): Promise<Debt> => {
  const startTime = Date.now();
  const requestId = `add-debt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    log.info(`[addDebt] Starting request`, {
      requestId,
      creditorName: debtData.creditorName,
      debtType: debtData.debtType,
      current_balance: debtData.currentBalance
    });

    // Validar datos de entrada
    if (!debtData.creditorName || debtData.creditorName.trim().length === 0) {
      throw new Error("Creditor name is required");
    }

    if (typeof debtData.currentBalance !== 'number' || debtData.currentBalance < 0) {
      throw new Error("Current balance must be a non-negative number");
    }

    const supabase = getSupabaseServerClient();
    const payload = {
      // firestore_id removed
      creditorName: debtData.creditorName.trim(),
      debtType: debtData.debtType ?? "Otro",
      current_balance: debtData.currentBalance,
      totalLimit: debtData.totalLimit ?? null,
      closingDate: debtData.closingDate ?? null,
      paymentDueDate: debtData.paymentDueDate ?? null,
      interestRate: debtData.interestRate ?? null,
      cat: debtData.cat ?? null,
      createdAt: nowIso(),
    };

    const { data, error } = await supabase
      .from(DEBTS_TABLE)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      log.error("[addDebt] Database operation failed", {
        requestId,
        error: error?.message || "No data returned",
        code: error?.code,
        details: error?.details
      });
      throw error ?? new Error("Failed to add debt");
    }

    const processingTime = Date.now() - startTime;
    const mappedDebt = mapDebt(data);

    log.info(`[addDebt] Successfully completed`, {
      requestId,
      debtId: mappedDebt.id,
      creditorName: mappedDebt.creditorName,
      processingTime: `${processingTime}ms`
    });

    return mappedDebt;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[addDebt] Unexpected error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    throw error;
  }
};

export const updateDebt = async (
  debtId: string,
  dataToUpdate: Partial<Omit<Debt, "id" | "createdAt">>
): Promise<void> => {
  const startTime = Date.now();
  const requestId = `update-debt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    log.info(`[updateDebt] Starting request`, {
      requestId,
      debtId,
      fieldsToUpdate: Object.keys(dataToUpdate)
    });

    // Validar entrada
    if (!debtId || debtId.trim().length === 0) {
      throw new Error("Debt ID is required");
    }

    if (!dataToUpdate || Object.keys(dataToUpdate).length === 0) {
      throw new Error("No data to update provided");
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(DEBTS_TABLE)
      .update(dataToUpdate)
      .eq('id', debtId);

    if (error) {
      log.error("[updateDebt] Database operation failed", {
        requestId,
        debtId,
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        },
        dataToUpdate
      });
      throw error;
    }

    const processingTime = Date.now() - startTime;
    log.info(`[updateDebt] Successfully completed`, {
      requestId,
      debtId,
      processingTime: `${processingTime}ms`
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[updateDebt] Unexpected error", {
      requestId,
      debtId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    throw error;
  }
};

export const deleteDebt = async (debtId: string): Promise<void> => {
  const startTime = Date.now();
  const requestId = `delete-debt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    log.info(`[deleteDebt] Starting request`, {
      requestId,
      debtId
    });

    // Validar entrada
    if (!debtId || debtId.trim().length === 0) {
      throw new Error("Debt ID is required");
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from(DEBTS_TABLE)
      .delete()
      .eq('id', debtId);

    if (error) {
      log.error("[deleteDebt] Database operation failed", {
        requestId,
        debtId,
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        }
      });
      throw error;
    }

    const processingTime = Date.now() - startTime;
    log.info(`[deleteDebt] Successfully completed`, {
      requestId,
      debtId,
      processingTime: `${processingTime}ms`
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error("[deleteDebt] Unexpected error", {
      requestId,
      debtId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`
    });
    throw error;
  }
};

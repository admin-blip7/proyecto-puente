'use server';

import { v4 as uuidv4 } from 'uuid';
import { ConsignorPayment } from '@/types';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import { toDate, nowIso } from '@/lib/supabase/utils';
import { uploadFile } from './documentService';
import { updateConsignorBalance } from './consignorService';
import { getLogger } from '@/lib/logger';

const log = getLogger('paymentService');

const CONSIGNOR_PAYMENTS_TABLE = 'consignor_payments';
const STORAGE_PAYMENT_PROOFS_PATH = 'payment_proofs';

const mapPayment = (row: any): ConsignorPayment => ({
  id: row?.firestore_id ?? row?.id ?? '',
  paymentId: row?.paymentId ?? '',
  consignorId: row?.consignorId ? String(row?.consignorId) : (row?.consignorId_firebase ?? ''),
  amountPaid: Number(row?.amountPaid ?? 0),
  paymentDate: toDate(row?.paymentDate),
  paymentMethod: row?.paymentMethod ?? 'Efectivo',
  proofOfPaymentUrl: row?.proofOfPaymentUrl ?? '',
  notes: row?.notes ?? undefined,
});

export const getConsignorPayments = async (consignorId: string): Promise<ConsignorPayment[]> => {
  const startTime = Date.now();
  const requestId = `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    log.info(`[getConsignorPayments] Starting request`, {
      requestId,
      consignorId,
      timestamp: new Date().toISOString(),
    });

    if (!consignorId) {
      log.error('[getConsignorPayments] No consignorId provided', {
        requestId,
        consignorId: consignorId || 'undefined',
      });
      return [];
    }

    if (typeof consignorId !== 'string' || consignorId.trim().length === 0) {
      log.error('[getConsignorPayments] Invalid consignorId format', {
        requestId,
        consignorId,
        type: typeof consignorId,
      });
      return [];
    }

    let supabase;
    try {
      supabase = getSupabaseServerClient();
      log.debug(`[getConsignorPayments] Supabase client initialized`, { requestId });
    } catch (clientError) {
      log.error('[getConsignorPayments] Failed to initialize Supabase client', {
        requestId,
        error: clientError instanceof Error ? clientError.message : String(clientError),
        stack: clientError instanceof Error ? clientError.stack : undefined,
      });
      return [];
    }

    // Handle both UUID and Firebase-style IDs by checking if the ID is a UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let queryCondition: any;
    let paymentsData: any[] | null = null;
    let lookupError: any = null;

    if (uuidRegex.test(consignorId)) {
      // If it's a UUID, query directly
      queryCondition = { consignorId };
    } else {
      // If it's not a UUID (likely Firebase ID), we need to handle the migration mismatch
      // First, try to find payments using the Firebase ID as consignorId (for cases where 
      // payments were added before proper migration)
      const { data: byFirebaseConsignorId, error: firebaseIdError } = await supabase
        .from(CONSIGNOR_PAYMENTS_TABLE)
        .select('id, firestore_id, paymentId, consignorId, amountPaid, paymentDate, paymentMethod, proofOfPaymentUrl, notes')
        .eq('consignorId', consignorId) // This might be a Firebase ID
        .order('paymentDate', { ascending: false });

      if (!firebaseIdError && byFirebaseConsignorId && byFirebaseConsignorId.length > 0) {
        log.debug('[getConsignorPayments] Found payments using Firebase-style consignorId', {
          requestId,
          consignorId,
          foundCount: byFirebaseConsignorId.length
        });
        try {
          const mappedPayments = (byFirebaseConsignorId ?? []).map(mapPayment);
          log.debug(`[getConsignorPayments] Data mapping successful from Firebase-style consignorId`, {
            requestId,
            inputCount: byFirebaseConsignorId?.length || 0,
            outputCount: mappedPayments.length,
          });
          return mappedPayments;
        } catch (mappingError) {
          log.error('[getConsignorPayments] Error mapping payment data from Firebase-style consignorId', {
            requestId,
            error: mappingError instanceof Error ? mappingError.message : String(mappingError),
            rawDataSample: byFirebaseConsignorId ? byFirebaseConsignorId.slice(0, 2) : null,
          });
          return [];
        }
      }

      // Next, check if records exist with this as firestore_id (for properly migrated data)
      if (!firebaseIdError) {
        const { data: byFirestoreId, error: firestoreError } = await supabase
          .from(CONSIGNOR_PAYMENTS_TABLE)
          .select('id, firestore_id, paymentId, consignorId, amountPaid, paymentDate, paymentMethod, proofOfPaymentUrl, notes')
          .eq('firestore_id', consignorId)
          .order('paymentDate', { ascending: false });

        if (!firestoreError && byFirestoreId && byFirestoreId.length > 0) {
          log.debug('[getConsignorPayments] Found payments using firestore_id fallback', {
            requestId,
            consignorId,
            foundCount: byFirestoreId.length
          });
          try {
            const mappedPayments = (byFirestoreId ?? []).map(mapPayment);
            log.debug(`[getConsignorPayments] Data mapping successful`, {
              requestId,
              inputCount: byFirestoreId?.length || 0,
              outputCount: mappedPayments.length,
            });
            return mappedPayments;
          } catch (mappingError) {
            log.error('[getConsignorPayments] Error mapping payment data from firestore_id', {
              requestId,
              error: mappingError instanceof Error ? mappingError.message : String(mappingError),
              rawDataSample: byFirestoreId ? byFirestoreId.slice(0, 2) : null,
            });
            return [];
          }
        }
      }

      // If not found with either approach, try to find a matching UUID in consignors table
      // that might have this Firebase ID stored as firestore_id
      try {
        const { data: matchingConsignor, error: consignorError } = await supabase
          .from('consignors')
          .select('id')
          .eq('firestore_id', consignorId)
          .single();

        if (!consignorError && matchingConsignor?.id) {
          log.debug('[getConsignorPayments] Found matching UUID for Firebase consignor ID', {
            requestId,
            firebaseId: consignorId,
            uuid: matchingConsignor.id
          });
          queryCondition = { consignorId: matchingConsignor.id };
        } else {
          // If no matching UUID found, there are no payments for this consignor
          log.warn('[getConsignorPayments] No matching UUID found for Firebase-style consignorId', {
            requestId,
            consignorId,
          });
          return [];
        }
      } catch (consignorLookupError) {
        log.error('[getConsignorPayments] Error looking up matching consignor UUID', {
          requestId,
          error: consignorLookupError instanceof Error ? consignorLookupError.message : String(consignorLookupError),
          firebaseId: consignorId,
        });
        return [];
      }
    }

    // If we have a UUID condition to query with, perform the query
    if (queryCondition) {
      const { data, error, count } = await supabase
        .from(CONSIGNOR_PAYMENTS_TABLE)
        .select('id, firestore_id, paymentId, consignorId, amountPaid, paymentDate, paymentMethod, proofOfPaymentUrl, notes')
        .match(queryCondition)
        .order('paymentDate', { ascending: false });

      if (error) {
        log.error('[getConsignorPayments] Query failed', {
          requestId,
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          },
          consignorId,
          queryDetails: {
            table: CONSIGNOR_PAYMENTS_TABLE,
            condition: JSON.stringify(queryCondition),
            orderBy: 'paymentDate DESC'
          }
        });
        return [];
      }

      paymentsData = data;
    }

    const processingTime = Date.now() - startTime;
    const paymentCount = paymentsData?.length || 0;

    log.info(`[getConsignorPayments] Successfully completed`, {
      requestId,
      consignorId,
      paymentCount,
      processingTime: `${processingTime}ms`,
    });

    try {
      const mappedPayments = (paymentsData ?? []).map(mapPayment);
      log.debug(`[getConsignorPayments] Data mapping successful`, {
        requestId,
        inputCount: paymentsData?.length || 0,
        outputCount: mappedPayments.length,
      });
      return mappedPayments;
    } catch (mappingError) {
      log.error('[getConsignorPayments] Error mapping payment data', {
        requestId,
        error: mappingError instanceof Error ? mappingError.message : String(mappingError),
        rawDataSample: paymentsData ? paymentsData.slice(0, 2) : null,
      });
      return [];
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error('[getConsignorPayments] Unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      consignorId,
      processingTime: `${processingTime}ms`,
    });
    return [];
  }
};

export const getConsignorPaymentsBatch = async (
  consignorIds: string[]
): Promise<Record<string, ConsignorPayment[]>> => {
  const requestId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    log.info(`[getConsignorPaymentsBatch] Starting batch request`, {
      requestId,
      consignorCount: consignorIds.length,
      consignorIds: consignorIds.slice(0, 5),
    });

    if (!consignorIds || consignorIds.length === 0) {
      log.warn(`[getConsignorPaymentsBatch] Empty consignorIds array`, { requestId });
      return {};
    }

    const validIds = consignorIds.filter((id) => id && typeof id === 'string' && id.trim().length > 0);
    if (validIds.length !== consignorIds.length) {
      log.warn(`[getConsignorPaymentsBatch] Some invalid IDs filtered`, {
        requestId,
        originalCount: consignorIds.length,
        validCount: validIds.length,
      });
    }

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
            error: error instanceof Error ? error.message : String(error),
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
            error: result.reason,
          });
          results[consignorId] = [];
        }
      });

      if (i + batchSize < validIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const processingTime = Date.now() - startTime;
    const totalPayments = Object.values(results).reduce((sum, payments) => sum + payments.length, 0);

    log.info(`[getConsignorPaymentsBatch] Batch completed`, {
      requestId,
      processedCount: validIds.length,
      totalPayments,
      processingTime: `${processingTime}ms`,
    });

    return results;
  } catch (error) {
    const processingTime = Date.now() - startTime;
    log.error(`[getConsignorPaymentsBatch] Unexpected batch error`, {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`,
    });

    return {};
  }
};

const uploadProofOfPayment = async (
  file: File,
  consignorId: string,
  paymentId: string
): Promise<string> => {
  const filePath = `${STORAGE_PAYMENT_PROOFS_PATH}/${consignorId}/${paymentId}-${file.name}`;
  return uploadFile(file, filePath);
};

export const addConsignorPayment = async (
  paymentData: Omit<ConsignorPayment, 'id' | 'paymentId' | 'paymentDate' | 'proofOfPaymentUrl'>,
  proofFile: File
): Promise<void> => {
  const paymentId = `PAY-${uuidv4().split('-')[0].toUpperCase()}`;
  const { consignorId, amountPaid } = paymentData;

  if (!consignorId) {
    throw new Error('Consignor ID is required.');
  }
  if (!proofFile) {
    throw new Error('Proof of payment file is required.');
  }

  const supabase = getSupabaseServerClient();

  try {
    const proofOfPaymentUrl = await uploadProofOfPayment(proofFile, consignorId, paymentId);
    const firestoreId = uuidv4();
    const paymentDate = nowIso();

    const payload = {
      firestore_id: firestoreId,
      paymentId,
      consignorId: consignorId,
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
    log.error('Error processing consignor payment', error instanceof Error ? error.message : String(error));
    throw error;
  }
};
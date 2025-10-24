"use server";

import { v4 as uuidv4 } from "uuid";
import { DebtPayment } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { nowIso } from "@/lib/supabase/utils";
import { uploadFile } from "./documentService";
import { getLogger } from "@/lib/logger";

const log = getLogger("debtPaymentService");

const DEBT_PAYMENTS_TABLE = "debt_payments";
const DEBTS_TABLE = "debts";
const ACCOUNTS_TABLE = "accounts";
const STORAGE_DEBT_PROOFS_PATH = "debt_proofs";

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

const uploadProof = async (
  file: File,
  debtId: string,
  paymentId: string
): Promise<string> => {
  // Sanitize the filename to remove special characters that cause StorageApiError
  const sanitizeFilename = (filename: string): string => {
    return filename
      .normalize('NFD') // Normalize to decompose accents
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special characters with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  };

  const sanitizedFilename = sanitizeFilename(file.name);
  const filePath = `${STORAGE_DEBT_PROOFS_PATH}/${debtId}/${paymentId}-${sanitizedFilename}`;
  return uploadFile(file, filePath);
};

export const addDebtPayment = async (
  paymentData: Omit<DebtPayment, "id" | "paymentId" | "paymentDate" | "proofUrl">,
  proofFile?: File
): Promise<void> => {
  const paymentId = `DPMT-${uuidv4().split("-")[0].toUpperCase()}`;
  const { debtId, amountPaid, paidFromAccountId } = paymentData;

  if (!debtId || !paidFromAccountId) {
    throw new Error("Debt ID and Account ID are required.");
  }

  const supabase = getSupabaseServerClient();

  const [{ data: debtRow, error: debtError }, { data: accountRow, error: accountError }] =
    await Promise.all([
      supabase
        .from(DEBTS_TABLE)
        .select("firestore_id,current_balance")
        .or(orIdFilter(debtId))
        .maybeSingle(),
      supabase
        .from(ACCOUNTS_TABLE)
        .select("firestore_id,current_balance")
        .or(orIdFilter(paidFromAccountId))
        .maybeSingle(),
    ]);

  if (debtError || !debtRow) {
    throw new Error("La deuda no existe.");
  }

  if (accountError || !accountRow) {
    throw new Error("La cuenta de origen no existe.");
  }

  const availableBalance = Number(accountRow.current_balance ?? 0);
  if (availableBalance < amountPaid) {
    throw new Error("Saldo insuficiente en la cuenta de origen.");
  }

  let proofUrl: string | null = null;
  if (proofFile) {
    proofUrl = await uploadProof(proofFile, debtId, paymentId);
  }

  const firestoreId = uuidv4();
  const paymentDate = nowIso();

  const { error: insertError } = await supabase.from(DEBT_PAYMENTS_TABLE).insert({
    firestore_id: firestoreId,
    paymentId,
    debtId,
    amountPaid,
    paymentDate,
    paidFromAccountId,
    proofUrl,
    notes: paymentData.notes ?? null,
  });

  if (insertError) {
    log.error("Error inserting debt payment", insertError);
    throw insertError;
  }

  const newDebtBalance = Number(debtRow.current_balance ?? 0) - amountPaid;
  const newAccountBalance = availableBalance - amountPaid;

  const [{ error: debtUpdateError }, { error: accountUpdateError }] = await Promise.all([
    supabase
      .from(DEBTS_TABLE)
      .update({ current_balance: newDebtBalance })
      .eq("firestore_id", debtRow.firestore_id ?? debtId),
    supabase
      .from(ACCOUNTS_TABLE)
      .update({ current_balance: newAccountBalance })
      .eq("firestore_id", accountRow.firestore_id ?? paidFromAccountId),
  ]);

  if (debtUpdateError || accountUpdateError) {
    log.error("Error updating balances after debt payment", {
      debtUpdateError,
      accountUpdateError,
    });
    throw new Error("No se pudieron actualizar los saldos.");
  }
};

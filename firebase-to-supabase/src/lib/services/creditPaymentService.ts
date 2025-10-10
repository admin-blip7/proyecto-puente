"use server";

import { v4 as uuidv4 } from "uuid";
import { ClientPayment } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("creditPaymentService");

const CLIENT_PAYMENTS_TABLE = "client_payments";
const CREDIT_ACCOUNTS_TABLE = "credit_accounts";
const ACCOUNTS_TABLE = "accounts";

const orIdFilter = (id: string) => `firestore_id.eq.${id},id.eq.${id}`;

export const addClientPayment = async (
  paymentData: Omit<ClientPayment, "id" | "paymentId" | "paymentDate">,
  depositAccountId: string
): Promise<void> => {
  const paymentId = `CPAY-${uuidv4().split("-")[0].toUpperCase()}`;
  const { accountId, amountPaid } = paymentData;

  if (!accountId || !depositAccountId) {
    throw new Error("Credit Account ID and Deposit Account ID are required.");
  }

  const supabase = getSupabaseServerClient();

  const [{ data: creditAccount, error: creditError }, { data: depositAccount, error: depositError }] =
    await Promise.all([
      supabase
        .from(CREDIT_ACCOUNTS_TABLE)
        .select("firestore_id,currentBalance")
        .or(orIdFilter(accountId))
        .maybeSingle(),
      supabase
        .from(ACCOUNTS_TABLE)
        .select("firestore_id,currentBalance")
        .or(orIdFilter(depositAccountId))
        .maybeSingle(),
    ]);

  if (creditError || !creditAccount) {
    throw new Error("La cuenta de crédito del cliente no existe.");
  }

  if (depositError || !depositAccount) {
    throw new Error("La cuenta de depósito no existe.");
  }

  const firestoreId = uuidv4();
  const paymentDate = nowIso();

  const { error: insertError } = await supabase.from(CLIENT_PAYMENTS_TABLE).insert({
    firestore_id: firestoreId,
    paymentId,
    accountId,
    amountPaid,
    paymentDate,
    notes: paymentData.notes ?? null,
  });

  if (insertError) {
    log.error("Error inserting client payment", insertError);
    throw insertError;
  }

  const creditBalance = Number(creditAccount.currentBalance ?? 0) - amountPaid;
  const depositBalance = Number(depositAccount.currentBalance ?? 0) + amountPaid;

  const [{ error: creditUpdateError }, { error: depositUpdateError }] = await Promise.all([
    supabase
      .from(CREDIT_ACCOUNTS_TABLE)
      .update({ currentBalance: creditBalance })
      .eq("firestore_id", creditAccount.firestore_id ?? accountId),
    supabase
      .from(ACCOUNTS_TABLE)
      .update({ currentBalance: depositBalance })
      .eq("firestore_id", depositAccount.firestore_id ?? depositAccountId),
  ]);

  if (creditUpdateError || depositUpdateError) {
    log.error("Error updating balances after payment", {
      creditUpdateError,
      depositUpdateError,
    });
    throw new Error("No se pudieron actualizar los saldos de las cuentas.");
  }
};

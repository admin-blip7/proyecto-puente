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

const CLIENT_PAYMENTS_TABLE = "client_payments";
const CREDIT_ACCOUNTS_TABLE = "credit_accounts";
const ACCOUNTS_TABLE = "accounts";

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
        .select("id,currentBalance")
        .eq("id", accountId)
        .maybeSingle(),
      supabase
        .from(ACCOUNTS_TABLE)
        .select("id,currentBalance")
        .eq("id", depositAccountId)
        .maybeSingle(),
    ]);

  if (creditError || !creditAccount) {
    throw new Error("La cuenta de crédito del cliente no existe.");
  }

  if (depositError || !depositAccount) {
    throw new Error("La cuenta de depósito no existe.");
  }

  const paymentDate = nowIso();

  const { error: insertError } = await supabase.from(CLIENT_PAYMENTS_TABLE).insert({
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
      .update({ current_balance: creditBalance })
      .eq("id", creditAccount.id),
    supabase
      .from(ACCOUNTS_TABLE)
      .update({ current_balance: depositBalance })
      .eq("id", depositAccount.id),
  ]);

  if (creditUpdateError || depositUpdateError) {
    log.error("Error updating balances after payment", {
      creditUpdateError,
      depositUpdateError,
    });
    throw new Error("No se pudieron actualizar los saldos de las cuentas.");
  }
};

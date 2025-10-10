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
  consignorId: row?.consignorId ?? "",
  amountPaid: Number(row?.amountPaid ?? 0),
  paymentDate: toDate(row?.paymentDate),
  paymentMethod: row?.paymentMethod ?? "Efectivo",
  proofOfPaymentUrl: row?.proofOfPaymentUrl ?? "",
  notes: row?.notes ?? undefined,
});

export const getConsignorPayments = async (consignorId: string): Promise<ConsignorPayment[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CONSIGNOR_PAYMENTS_TABLE)
      .select("*")
      .eq("consignorId", consignorId)
      .order("paymentDate", { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapPayment);
  } catch (error) {
    log.error("Error fetching payment history", error);
    return [];
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
      consignorId,
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
    log.error("Error processing consignor payment", error);
    throw error;
  }
};

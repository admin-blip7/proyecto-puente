"use server";

import { v4 as uuidv4 } from "uuid";
import { CashSession } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("cashSessionService");

const CASH_SESSIONS_TABLE = "cash_sessions";
const ACCOUNTS_TABLE = "accounts";

const mapSession = (row: any): CashSession => ({
  id: row?.firestore_id ?? row?.id ?? "",
  sessionId: row?.sessionId ?? "",
  status: row?.status ?? "Abierto",
  openedBy: row?.openedBy ?? "",
  openedByName: row?.openedByName ?? "",
  openedAt: toDate(row?.openedAt),
  startingFloat: Number(row?.startingFloat ?? 0),
  closedBy: row?.closedBy ?? undefined,
  closedByName: row?.closedByName ?? undefined,
  closedAt: row?.closedAt ? toDate(row.closedAt) : undefined,
  totalCashSales: Number(row?.totalCashSales ?? 0),
  totalCardSales: Number(row?.totalCardSales ?? 0),
  totalCashPayouts: Number(row?.totalCashPayouts ?? 0),
  expectedCashInDrawer: Number(row?.expectedCashInDrawer ?? 0),
  actualCashCount: row?.actualCashCount !== null ? Number(row.actualCashCount) : undefined,
  difference: row?.difference !== null ? Number(row.difference) : undefined,
});

export const getAllClosedSessions = async (): Promise<CashSession[]> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .eq("status", "Cerrado")
      .order("closedAt", { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data ?? []).map(mapSession);
  } catch (error) {
    log.error("Error fetching closed cash sessions", error);
    return [];
  }
};

export const getCurrentOpenSession = async (userId: string): Promise<CashSession | null> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from(CASH_SESSIONS_TABLE)
      .select("*")
      .eq("status", "Abierto")
      .eq("openedBy", userId)
      .order("openedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? mapSession(data) : null;
  } catch (error) {
    log.error("Error fetching open session", error);
    throw new Error("Failed to fetch open session.");
  }
};

export const openCashSession = async (
  userId: string,
  userName: string,
  startingFloat: number
): Promise<CashSession> => {
  const supabase = getSupabaseServerClient();
  const firestoreId = uuidv4();
  const sessionId = `CS-${uuidv4().split("-")[0].toUpperCase()}`;
  const openedAt = nowIso();

  const payload = {
    firestore_id: firestoreId,
    sessionId,
    status: "Abierto" as const,
    openedBy: userId,
    openedByName: userName,
    openedAt,
    startingFloat,
    totalCashSales: 0,
    totalCardSales: 0,
    totalCashPayouts: 0,
    expectedCashInDrawer: startingFloat,
  };

  const { error } = await supabase.from(CASH_SESSIONS_TABLE).insert(payload);
  if (error) {
    log.error("Error opening cash session", error);
    throw new Error("Failed to open cash session.");
  }

  return mapSession(payload);
};

export const closeCashSession = async (
  session: CashSession,
  userId: string,
  userName: string,
  actualCashCount: number
): Promise<CashSession> => {
  const supabase = getSupabaseServerClient();
  const expectedCashInDrawer = session.startingFloat + session.totalCashSales - session.totalCashPayouts;
  const difference = actualCashCount - expectedCashInDrawer;
  const closedAt = nowIso();

  const { error } = await supabase
    .from(CASH_SESSIONS_TABLE)
    .update({
      status: "Cerrado",
      closedBy: userId,
      closedByName: userName,
      closedAt,
      actualCashCount,
      expectedCashInDrawer,
      difference,
    })
    .eq("firestore_id", session.id);

  if (error) {
    log.error("Error closing cash session", error);
    throw new Error("Failed to close cash session.");
  }

  try {
    const { data: accounts, error: accountsError } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("firestore_id,name,currentBalance")
      .in("name", ["Caja Chica", "Banco Principal"]);

    if (!accountsError && accounts) {
      await Promise.all(
        accounts.map(async (account) => {
          let delta = 0;
          if (account.name === "Caja Chica") {
            delta = session.totalCashSales;
          }
          if (account.name === "Banco Principal") {
            delta = session.totalCardSales;
          }
          if (delta > 0) {
            const newBalance = Number(account.currentBalance ?? 0) + delta;
            const { error: updateError } = await supabase
              .from(ACCOUNTS_TABLE)
              .update({ currentBalance: newBalance })
              .eq("firestore_id", account.firestore_id ?? account.id);
            if (updateError) {
              throw updateError;
            }
          }
        })
      );
    }
  } catch (accountsErr) {
    log.warn("Skipping account balance updates", accountsErr);
  }

  return {
    ...session,
    status: "Cerrado",
    closedBy: userId,
    closedByName: userName,
    closedAt: new Date(closedAt),
    actualCashCount,
    expectedCashInDrawer,
    difference,
  };
};

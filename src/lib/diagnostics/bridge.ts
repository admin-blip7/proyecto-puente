import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

const ADMIN_ACCESS_TOKEN_COOKIE = "tienda_admin_access_token";
const ONLINE_WINDOW_MS = 90_000;

export type BridgeJobMode = "scan_all" | "scan_device";
export type BridgeJobStatus = "pending" | "claimed" | "completed" | "failed" | "expired";

export interface DiagnosticsBridgeAgentRow {
  id: string;
  user_id: string;
  name: string;
  platform: string | null;
  token_hash: string;
  token_last4: string;
  active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticsBridgeJobRow {
  id: string;
  requested_by: string;
  claimed_by_agent_id: string | null;
  mode: BridgeJobMode;
  target_udid: string | null;
  status: BridgeJobStatus;
  result: unknown;
  error: string | null;
  claimed_at: string | null;
  completed_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

function getRoleFromUser(user: any): string {
  return String(
    user?.user_metadata?.role ??
    user?.app_metadata?.role ??
    ""
  ).toLowerCase();
}

function isAdminLike(user: any): boolean {
  const role = getRoleFromUser(user);
  return role === "admin" || role === "master admin" || user?.app_metadata?.isAdmin === true;
}

export async function requireDiagnosticsAdminUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_ACCESS_TOKEN_COOKIE)?.value;

  if (!token) {
    throw new Error("unauthorized");
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user || !isAdminLike(data.user)) {
    throw new Error("forbidden");
  }

  return data.user;
}

export function hashAgentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createBridgeAgentForUser(input: {
  userId: string;
  name: string;
  platform?: string | null;
}) {
  const token = randomBytes(24).toString("hex");
  const supabase = getSupabaseServerClient();

  const payload = {
    user_id: input.userId,
    name: input.name.trim() || "Agente local",
    platform: input.platform?.trim() || null,
    token_hash: hashAgentToken(token),
    token_last4: token.slice(-4),
    active: true,
  };

  const { data, error } = await supabase
    .from("diagnostics_bridge_agents")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "agent_create_failed");
  }

  return { agent: data as DiagnosticsBridgeAgentRow, token };
}

export async function getBridgeAgentsForUser(userId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("diagnostics_bridge_agents")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  return (data ?? []).map((agent) => ({
    ...agent,
    online: agent.last_seen_at ? new Date(agent.last_seen_at).getTime() >= cutoff : false,
  })) as Array<DiagnosticsBridgeAgentRow & { online: boolean }>;
}

export async function createBridgeJob(input: {
  userId: string;
  mode: BridgeJobMode;
  targetUdid?: string | null;
}) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("diagnostics_bridge_jobs")
    .insert({
      requested_by: input.userId,
      mode: input.mode,
      target_udid: input.targetUdid ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "job_create_failed");
  }

  return data as DiagnosticsBridgeJobRow;
}

export async function getBridgeJobForUser(userId: string, jobId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("diagnostics_bridge_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("requested_by", userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "job_not_found");
  }

  return data as DiagnosticsBridgeJobRow;
}

export async function authenticateBridgeAgent(token: string) {
  if (!token) {
    throw new Error("agent_unauthorized");
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("diagnostics_bridge_agents")
    .select("*")
    .eq("token_hash", hashAgentToken(token))
    .eq("active", true)
    .single();

  if (error || !data) {
    throw new Error("agent_unauthorized");
  }

  return data as DiagnosticsBridgeAgentRow;
}

export async function heartbeatBridgeAgent(agentId: string) {
  const supabase = getSupabaseServerClient();
  await supabase
    .from("diagnostics_bridge_agents")
    .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", agentId);
}

export async function claimNextBridgeJob(agent: DiagnosticsBridgeAgentRow) {
  const supabase = getSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("diagnostics_bridge_jobs")
    .select("*")
    .eq("requested_by", agent.user_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  const candidates = (data ?? []) as DiagnosticsBridgeJobRow[];
  for (const job of candidates) {
    if (new Date(job.expires_at).getTime() < Date.now()) {
      await supabase
        .from("diagnostics_bridge_jobs")
        .update({ status: "expired", updated_at: nowIso })
        .eq("id", job.id)
        .eq("status", "pending");
      continue;
    }

    const { data: claimed, error: claimError } = await supabase
      .from("diagnostics_bridge_jobs")
      .update({
        status: "claimed",
        claimed_by_agent_id: agent.id,
        claimed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("*")
      .single();

    if (!claimError && claimed) {
      return claimed as DiagnosticsBridgeJobRow;
    }
  }

  return null;
}

export async function completeBridgeJob(input: {
  agent: DiagnosticsBridgeAgentRow;
  jobId: string;
  status: "completed" | "failed";
  result?: unknown;
  error?: string | null;
}) {
  const supabase = getSupabaseServerClient();
  const updatePayload = {
    status: input.status,
    result: input.result ?? null,
    error: input.error ?? null,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("diagnostics_bridge_jobs")
    .update(updatePayload)
    .eq("id", input.jobId)
    .eq("claimed_by_agent_id", input.agent.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "job_complete_failed");
  }

  return data as DiagnosticsBridgeJobRow;
}

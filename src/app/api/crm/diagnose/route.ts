import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("crmDiagnostics");

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Get all clients
    const { data: clients, error: clientsError } = await supabase
      .from("crm_clients")
      .select("id, firestore_id, first_name, last_name, phone, total_purchases, created_at")
      .order("created_at", { ascending: false });

    if (clientsError) {
      throw clientsError;
    }

    // 2. Get all sale interactions
    const { data: interactions, error: interactionsError } = await supabase
      .from("crm_interactions")
      .select("id, firestore_id, client_id, interaction_type, amount, interaction_date, description")
      .eq("interaction_type", "sale")
      .order("interaction_date", { ascending: false });

    if (interactionsError) {
      throw interactionsError;
    }

    // 3. Calculate sums for each client
    const clientSummary = (clients || []).map((client: any) => {
      const clientInteractions = (interactions || []).filter((i: any) => i.client_id === client.id);
      const calculatedTotal = clientInteractions.reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0);
      const discrepancy = parseFloat(client.total_purchases) - calculatedTotal;

      return {
        ...client,
        total_purchases: parseFloat(client.total_purchases),
        interaction_count: clientInteractions.length,
        calculated_total: calculatedTotal,
        recorded_total: parseFloat(client.total_purchases),
        discrepancy: discrepancy,
        has_discrepancy: Math.abs(discrepancy) > 0.01,
        interactions: clientInteractions
      };
    });

    const clientsWithDiscrepancies = clientSummary.filter((c: any) => c.has_discrepancy);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_clients: clients?.length || 0,
        clients_with_discrepancies: clientsWithDiscrepancies.length,
        total_interactions: interactions?.length || 0
      },
      clients_with_issues: clientsWithDiscrepancies,
      all_clients: clientSummary
    });

  } catch (error: any) {
    log.error("Error in CRM diagnostics", error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.details || error.hint || "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSupabaseClientWithAuth } from "@/lib/supabaseClientWithAuth";

export async function GET() {
  try {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get all clients with their phone numbers
    const { data: clients, error } = await supabase
      .from("crm_clients")
      .select("id, firestore_id, first_name, last_name, phone, total_purchases, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: clients?.length || 0,
      clients: clients || []
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

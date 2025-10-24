import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClientWithAuth } from "@/lib/supabaseClientWithAuth";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const phone = request.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json({ error: "Please provide ?phone=2224238987" }, { status: 400 });
    }

    // Search for customer by exact phone
    const { data: exactMatch, error: exactError } = await supabase
      .from("crm_clients")
      .select("id, firestore_id, first_name, last_name, phone")
      .eq("phone", phone)
      .single();

    // Search for all customers with similar phone pattern
    const { data: allClients, error: allError } = await supabase
      .from("crm_clients")
      .select("id, firestore_id, first_name, last_name, phone")
      .ilike("phone", `%${phone.replace(/\D/g, "")}%`);

    // Get warranties for this phone
    const { data: warranties, error: warrantyError } = await supabase
      .from("warranties_new")
      .select("id, firestore_id, customer_name, customer_phone, status, reported_at")
      .eq("customer_phone", phone);

    // Check interactions linked to any matching client
    let interactions: any[] = [];
    if (exactMatch?.id) {
      const { data: linkedInteractions } = await supabase
        .from("crm_interactions")
        .select("*")
        .eq("client_id", exactMatch.id)
        .eq("interaction_type", "warranty");
      interactions = linkedInteractions || [];
    }

    return NextResponse.json({
      phone,
      exactMatch: {
        found: !!exactMatch,
        data: exactMatch || null,
        error: exactError?.message || null
      },
      similarPhones: allClients || [],
      warranties: {
        count: warranties?.length || 0,
        data: warranties || []
      },
      linkedInteractions: {
        count: interactions.length,
        data: interactions
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

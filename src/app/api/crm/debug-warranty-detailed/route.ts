import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClientWithAuth } from "@/lib/supabaseClientWithAuth";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get Mari Ventura specifically
    const { data: mariClient, error: clientError } = await supabase
      .from("crm_clients")
      .select("*")
      .eq("phone", "2224238987")
      .single();

    if (!mariClient) {
      return NextResponse.json({ error: "Mari Ventura not found" }, { status: 404 });
    }

    // Get all warranties for Mari
    const { data: warranties, error: warrantyError } = await supabase
      .from("warranties_new")
      .select("*")
      .eq("customer_phone", "2224238987");

    // Get all interactions for Mari's client ID
    const { data: interactions, error: interactionError } = await supabase
      .from("crm_interactions")
      .select("*")
      .eq("client_id", mariClient.id);

    // Get warranty interactions specifically
    const { data: warrantyInteractions, error: warrantyIntError } = await supabase
      .from("crm_interactions")
      .select("*")
      .eq("client_id", mariClient.id)
      .eq("interaction_type", "warranty");

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: mariClient.id,
          firestore_id: mariClient.firestore_id,
          name: `${mariClient.first_name} ${mariClient.last_name}`,
          phone: mariClient.phone,
          total_purchases: mariClient.total_purchases,
          created_at: mariClient.created_at
        },
        warranties: {
          count: warranties?.length || 0,
          data: warranties || []
        },
        allInteractions: {
          count: interactions?.length || 0,
          data: interactions || []
        },
        warrantyInteractions: {
          count: warrantyInteractions?.length || 0,
          data: warrantyInteractions || []
        }
      },
      errors: {
        clientError: clientError?.message,
        warrantyError: warrantyError?.message,
        interactionError: interactionError?.message,
        warrantyIntError: warrantyIntError?.message
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

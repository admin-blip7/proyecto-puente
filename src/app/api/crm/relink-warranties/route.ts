import { NextResponse } from "next/server";
import { getSupabaseClientWithAuth } from "@/lib/supabaseClientWithAuth";
import { nowIso } from "@/lib/supabase/utils";

export async function POST() {
  try {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get all warranties
    const { data: warranties, error: warrantyError } = await supabase
      .from("warranties_new")
      .select("id, firestore_id, customer_phone, customer_name, reported_at");

    if (warrantyError) {
      return NextResponse.json({ error: warrantyError.message }, { status: 500 });
    }

    const results = {
      processed: 0,
      linked: 0,
      failed: 0,
      details: [] as any[]
    };

    for (const warranty of warranties || []) {
      try {
        if (!warranty.customer_phone) {
          results.details.push({
            warranty_id: warranty.firestore_id,
            status: "skipped",
            reason: "No customer phone"
          });
          continue;
        }

        // Normalize phone
        const normalizedPhone = warranty.customer_phone.replace(/\D/g, "");

        // Get all clients
        const { data: allClients } = await supabase
          .from("crm_clients")
          .select("id, phone");

        // Find matching client
        const matchingClient = allClients?.find(client => {
          const normalizedClientPhone = client.phone.replace(/\D/g, "");
          return normalizedClientPhone === normalizedPhone;
        });

        results.processed++;

        if (!matchingClient) {
          results.details.push({
            warranty_id: warranty.firestore_id,
            status: "not_found",
            reason: `No matching client for phone ${warranty.customer_phone} (normalized: ${normalizedPhone})`
          });
          results.failed++;
          continue;
        }

        // Check if warranty interaction already exists
        const { data: existingInteraction } = await supabase
          .from("crm_interactions")
          .select("id")
          .eq("client_id", matchingClient.id)
          .eq("interaction_type", "warranty")
          .eq("related_id", warranty.firestore_id)
          .single();

        if (existingInteraction) {
          results.details.push({
            warranty_id: warranty.firestore_id,
            client_id: matchingClient.id,
            status: "already_linked",
            reason: "Interaction already exists"
          });
          results.linked++;
          continue;
        }

        // Create interaction
        const interactionFirestoreId = `interaction-warranty-${warranty.firestore_id}`;
        const { error: interactionError } = await supabase
          .from("crm_interactions")
          .insert({
            firestore_id: interactionFirestoreId,
            client_id: matchingClient.id,
            interaction_type: "warranty",
            interaction_date: warranty.reported_at,
            amount: 0,
            description: `Warranty: ${warranty.customer_name || "Unknown"}`,
            related_table: "warranties_new",
            related_id: warranty.firestore_id,
            status: "completed"
          });

        if (interactionError) {
          results.details.push({
            warranty_id: warranty.firestore_id,
            client_id: matchingClient.id,
            status: "error",
            reason: interactionError.message
          });
          results.failed++;
          continue;
        }

        // Update last_contact_date
        const now = nowIso();
        await supabase
          .from("crm_clients")
          .update({
            last_contact_date: now
          })
          .eq("id", matchingClient.id);

        results.details.push({
          warranty_id: warranty.firestore_id,
          client_id: matchingClient.id,
          status: "linked",
          reason: `Successfully linked to client with phone ${warranty.customer_phone}`
        });
        results.linked++;

      } catch (err) {
        results.details.push({
          warranty_id: warranty.firestore_id,
          status: "error",
          reason: String(err)
        });
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: `Processed ${results.processed} warranties. Linked: ${results.linked}, Failed: ${results.failed}`,
      results
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

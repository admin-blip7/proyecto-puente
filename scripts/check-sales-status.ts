
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

async function checkSalesStatus() {
    const supabase = getSupabaseServerClient();
    console.log("--- Checking Sales Statuses ---");

    const { data: sales, error } = await supabase
        .from("sales")
        .select("status, count(*)") // count not supported directly like this in simple select usually, need group
        // simpler: just fetch statuses
        .select("status")
        .limit(100);

    if (error) {
        console.error("Error fetching sales:", error);
        return;
    }

    const statuses = new Set(sales.map(s => s.status));
    console.log("Unique statuses found:", Array.from(statuses));
}

checkSalesStatus().catch(console.error);

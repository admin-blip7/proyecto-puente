
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

async function checkAssetColumns() {
    const supabase = getSupabaseServerClient();
    console.log("--- Checking fixed_assets Columns ---");

    // Try to select a single row to see the structure
    const { data, error } = await supabase
        .from("fixed_assets")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Error fetching assets:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Columns found in returned data:", Object.keys(data[0]));
    } else {
        console.log("No data found, cannot infer columns from row. Trying to insert dummy to trigger error with column hint if possible, or just checking error from previous attempt.");
    }
}

checkAssetColumns().catch(console.error);

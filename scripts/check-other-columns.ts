
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

async function checkOtherColumns() {
    const supabase = getSupabaseServerClient();
    console.log("--- Checking purchasedate Column ---");

    const { error } = await supabase
        .from("fixed_assets")
        .select("purchasedate") // Try all lowercase
        .limit(1);

    if (error) {
        console.log("Selecting 'purchasedate' failed:", error.message);
    } else {
        console.log("Selecting 'purchasedate' SUCCEEDED! Column exists.");
    }
}

checkOtherColumns().catch(console.error);

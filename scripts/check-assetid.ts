
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

async function checkAssetIdColumn() {
    const supabase = getSupabaseServerClient();
    console.log("--- Checking assetid Column ---");

    const { error } = await supabase
        .from("fixed_assets")
        .select("assetid") // Try all lowercase
        .limit(1);

    if (error) {
        console.log("Selecting 'assetid' failed:", error.message);
    } else {
        console.log("Selecting 'assetid' SUCCEEDED! Column exists.");
    }
}

checkAssetIdColumn().catch(console.error);

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testSearch(queryText) {
    console.log(`Searching for: "${queryText}"`);
    const searchTerm = `%${queryText.trim()}%`;
    const { data, error } = await supabase
        .from('products')
        .select("*")
        .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm}`)
        .limit(5);

    if (error) {
        console.error("Entry search error:", error);
    } else {
        console.log(`Found ${data.length} results.`);
        data.forEach(p => console.log(`- [${p.sku}] ${p.name}`));
    }
}

// Test common terms
testSearch("cargador");
testSearch("a");

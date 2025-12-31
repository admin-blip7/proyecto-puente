
import { getProducts } from "@/lib/services/productService";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

async function main() {
    // 1. Get products via the service function
    console.log("Fetching products via getProducts()...");
    const serviceProducts = await getProducts();
    console.log(`getProducts() returned ${serviceProducts.length} products.`);

    // 2. Get true count from DB
    const supabase = getSupabaseServerClient();
    const { count, error } = await supabase
        .from("products")
        .select("*", { count: 'exact', head: true });

    if (error) {
        console.error("Error fetching DB count:", error);
    } else {
        console.log(`Total products in DB: ${count}`);
    }

    if (serviceProducts.length < (count || 0)) {
        console.log("MISMATCH DETECTED: Service is returning fewer products than exist in DB.");
    } else {
        console.log("Counts match.");
    }
}

main().catch(console.error);

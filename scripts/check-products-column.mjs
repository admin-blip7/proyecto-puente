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

async function check() {
    console.log("Checking columns in 'products'...");

    // Select column
    const { data, error } = await supabase
        .from('products')
        .select('image_urls')
        .limit(1);

    if (error) {
        console.log("❌ Error fetching column 'image_urls':", error.message);
        console.log("This usually means the column DOES NOT exist.");
    } else {
        console.log("✅ Column 'image_urls' detected!");
    }
}

check();

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
    console.log("Checking 'products' table...");

    // Try lowercase
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });

    if (!error) {
        console.log("✅ Table 'products' exists!");
    } else {
        console.error("❌ Error accessing 'products':", error.message);

        // Try PascalCase
        const { data: data2, error: error2 } = await supabase.from('Products').select('count', { count: 'exact', head: true });
        if (!error2) {
            console.log("✅ Table 'Products' (Capitalized) exists!");
        } else {
            console.error("❌ Error accessing 'Products':", error2.message);
        }
    }

    // Try to create bucket if possible
    console.log("\nAttempting to create bucket via Storage API...");
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('products', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
    });

    if (bucketError) {
        if (bucketError.message.includes("already exists")) {
            console.log("✅ Bucket 'products' already exists.");
        } else {
            console.error("❌ Failed to create bucket:", bucketError.message);
        }
    } else {
        console.log("✅ Bucket 'products' created successfully!");
    }
}

check();

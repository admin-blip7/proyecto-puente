
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Manually load .env.local
try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
        console.log("✅ Loaded .env.local");
    } else {
        console.warn("⚠️ .env.local not found at", envPath);
    }
} catch (e) {
    console.error("Error loading .env.local", e);
}

async function listExpenses() {
    const { getSupabaseServerClient } = await import("../src/lib/supabaseServerClient");
    const supabase = getSupabaseServerClient();

    console.log("🔍 Listing recent expenses...");

    const { data: expenses, error } = await supabase
        .from("expenses")
        .select("*")
        .order("paymentDate", { ascending: false })
        .limit(10);

    if (error) {
        console.error("❌ Error fetching expenses:", error);
        return;
    }

    console.log(`Found ${expenses.length} expenses:`);
    expenses.forEach(e => {
        console.log(`- ID: ${e.id} | Desc: ${e.description} | Amount: ${e.amount} | Date: ${e.paymentDate}`);
    });
}

listExpenses();

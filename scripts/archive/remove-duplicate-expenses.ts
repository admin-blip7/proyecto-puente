
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

async function removeDuplicateExpenses() {
    const { getSupabaseServerClient } = await import("../src/lib/supabaseServerClient");
    const supabase = getSupabaseServerClient();

    console.log("🔍 Finding duplicate expenses...");

    // Fetch all expenses
    const { data: expenses, error } = await supabase
        .from("expenses")
        .select("*")
        .order("paymentDate", { ascending: false });

    if (error) {
        console.error("❌ Error fetching expenses:", error);
        return;
    }

    // Group by description, amount, and date (approximate)
    const duplicates = [];
    const seen = new Set();

    for (const e of expenses) {
        // Create a key. For date, we'll use the day precision to catch duplicates from the same session
        const dateKey = new Date(e.paymentDate).toISOString().substring(0, 10); // YYYY-MM-DD
        const key = `${e.description}|${e.amount}|${dateKey}`;

        if (seen.has(key)) {
            duplicates.push(e);
        } else {
            seen.add(key);
        }
    }

    console.log(`Found ${duplicates.length} potential duplicates.`);

    if (duplicates.length === 0) {
        console.log("No duplicates found.");
        return;
    }

    console.log("Deleting duplicates...");
    for (const dup of duplicates) {
        console.log(`Deleting duplicate: ${dup.description} - $${dup.amount} (${dup.paymentDate}) - ID: ${dup.id || dup.firestore_id}`);

        // Use firestore_id or id
        let query = supabase.from("expenses").delete();
        if (dup.firestore_id) {
            query = query.eq("firestore_id", dup.firestore_id);
        } else {
            query = query.eq("id", dup.id);
        }

        const { error: deleteError } = await query;

        if (deleteError) {
            console.error(`Failed to delete ${dup.id}:`, deleteError);
        } else {
            console.log(`Deleted ${dup.id}`);
        }
    }

    console.log("✅ Cleanup complete.");
}

removeDuplicateExpenses();

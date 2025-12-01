
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

async function verifyAccountTransactions() {
    const { getAccountTransactions } = await import("../src/lib/services/financeService");
    const { getSupabaseServerClient } = await import("../src/lib/supabaseServerClient");

    const supabase = getSupabaseServerClient();

    console.log("🔍 Verifying Account Transactions...");

    // 1. Find an account that has expenses
    const { data: expenses } = await supabase
        .from("expenses")
        .select("paidFromAccountId")
        .limit(1);

    let accountId;

    if (expenses && expenses.length > 0) {
        accountId = expenses[0].paidFromAccountId;
        console.log(`Found active account ID from expenses: ${accountId}`);
    } else {
        // Fallback to first account
        const { data: accounts } = await supabase
            .from("accounts")
            .select("*")
            .limit(1);

        if (!accounts || accounts.length === 0) {
            console.error("❌ No accounts found.");
            return;
        }
        accountId = accounts[0].id;
        console.log(`No expenses found, using first account: ${accounts[0].name}`);
    }

    // 2. Fetch transactions
    const transactions = await getAccountTransactions(accountId);

    console.log(`Found ${transactions.length} transactions.`);

    if (transactions.length > 0) {
        console.log("First 3 transactions:");
        transactions.slice(0, 3).forEach(tx => {
            console.log(`- [${tx.type.toUpperCase()}] ${tx.date.toISOString().split('T')[0]} | ${tx.description} | $${tx.amount}`);
        });
        console.log("✅ getAccountTransactions seems to be working.");
    } else {
        console.log("⚠️ No transactions found. This might be correct if the account is new.");
    }
}

verifyAccountTransactions();

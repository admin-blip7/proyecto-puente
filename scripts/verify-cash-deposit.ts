import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

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

async function verifyCashDeposit() {
    // Dynamic imports to ensure env vars are loaded first
    const { addSaleAndUpdateStock } = await import("../src/lib/services/salesService");
    const { getSupabaseServerClient } = await import("../src/lib/supabaseServerClient");

    const supabase = getSupabaseServerClient();
    const ACCOUNTS_TABLE = "accounts";

    console.log("🔍 Starting Cash Deposit Verification...");

    try {
        // 1. Get initial balance of 'Caja Chica'
        const { data: accounts, error: fetchError } = await supabase
            .from(ACCOUNTS_TABLE)
            .select("*")
            .or(`name.eq.Caja Chica,type.eq.Efectivo`)
            .limit(1);

        if (fetchError) throw fetchError;

        if (!accounts || accounts.length === 0) {
            console.error("❌ No 'Caja Chica' account found. Cannot verify.");
            return;
        }

        const account = accounts[0];
        const initialBalance = Number(account.current_balance ?? 0);
        console.log(`💰 Initial Balance for ${account.name}: $${initialBalance}`);

        // 2. Create a test sale
        const saleAmount = 100.00;
        const saleData = {
            items: [
                {
                    id: uuidv4(),
                    productId: uuidv4(), // Mock product ID
                    name: "Test Product",
                    quantity: 1,
                    price: saleAmount,
                    priceAtSale: saleAmount,
                    subtotal: saleAmount
                }
            ],
            totalAmount: saleAmount,
            paymentMethod: "Efectivo",
            cashierId: "test-cashier",
            cashierName: "Test Cashier",
            customerName: "Test Customer",
            customerPhone: "555-0000"
        };

        console.log(`🛒 Processing test cash sale of $${saleAmount}...`);

        await addSaleAndUpdateStock(saleData as any, [], null, true);

        // 3. Get new balance
        const { data: updatedAccounts, error: fetchError2 } = await supabase
            .from(ACCOUNTS_TABLE)
            .select("*")
            .eq("id", account.id)
            .single();

        if (fetchError2) throw fetchError2;

        const newBalance = Number(updatedAccounts.current_balance ?? 0);
        console.log(`💰 New Balance for ${account.name}: $${newBalance}`);

        // 4. Verify
        if (newBalance === initialBalance + saleAmount) {
            console.log("✅ SUCCESS: Balance increased correctly!");
        } else {
            console.error(`❌ FAILURE: Balance mismatch. Expected ${initialBalance + saleAmount}, got ${newBalance}`);
        }

    } catch (error) {
        console.error("❌ Error during verification:", error);
    }
}

verifyCashDeposit();

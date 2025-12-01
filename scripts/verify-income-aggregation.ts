
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

async function verifyIncomeAggregation() {
    // Dynamic imports
    const { getIncomes, addIncome } = await import("../src/lib/services/incomeService");
    const { addSaleAndUpdateStock } = await import("../src/lib/services/salesService");
    const { getSupabaseServerClient } = await import("../src/lib/supabaseServerClient");

    const supabase = getSupabaseServerClient();
    const ACCOUNTS_TABLE = "accounts";

    console.log("🔍 Starting Income Aggregation Verification...");

    try {
        // 1. Get an account for income destination
        const { data: accounts } = await supabase
            .from(ACCOUNTS_TABLE)
            .select("*")
            .limit(1);

        if (!accounts || accounts.length === 0) {
            console.error("❌ No accounts found. Cannot verify.");
            return;
        }
        const accountId = accounts[0].firestore_id || accounts[0].id;

        // 2. Create a test sale (Cash)
        const saleAmount = 50.00;
        const saleData = {
            items: [
                {
                    id: uuidv4(),
                    productId: uuidv4(),
                    name: "Income Test Product",
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

        console.log(`🛒 Creating test sale of $${saleAmount}...`);
        const sale = await addSaleAndUpdateStock(saleData as any, [], null, true);
        console.log(`✅ Sale created: ${sale.saleId}`);

        // 3. Create a test income
        const incomeAmount = 75.00;
        const incomeData = {
            description: "Test Manual Income",
            category: "Otros",
            amount: incomeAmount,
            destinationAccountId: accountId,
            source: "Test Source"
        };

        console.log(`💰 Creating test income of $${incomeAmount}...`);
        const income = await addIncome(incomeData);
        console.log(`✅ Income created: ${income.incomeId}`);

        // 4. Fetch Incomes
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        console.log(`📊 Fetching incomes for today...`);
        const allIncomes = await getIncomes(startDate, endDate);

        // 5. Verify
        const foundSale = allIncomes.find(i => i.incomeId === sale.saleId);
        const foundIncome = allIncomes.find(i => i.incomeId === income.incomeId);

        if (foundSale) {
            console.log(`✅ Found Sale in Income list: ${foundSale.description} - $${foundSale.amount}`);
        } else {
            console.error(`❌ Sale ${sale.saleId} NOT found in Income list`);
        }

        if (foundIncome) {
            console.log(`✅ Found Manual Income in Income list: ${foundIncome.description} - $${foundIncome.amount}`);
        } else {
            console.error(`❌ Manual Income ${income.incomeId} NOT found in Income list`);
        }

        if (foundSale && foundIncome) {
            console.log("🎉 SUCCESS: Both sales and manual incomes are aggregated!");
        } else {
            console.error("❌ FAILURE: Aggregation incomplete.");
        }

    } catch (error) {
        console.error("❌ Error during verification:", error);
    }
}

verifyIncomeAggregation();

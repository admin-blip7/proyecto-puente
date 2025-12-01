
import { addExpense } from "../src/lib/services/financeService";
import { getAccounts } from "../src/lib/services/accountService";

async function reproduceExpenseError() {
    console.log("Starting reproduction...");

    try {
        // 1. Get a valid account ID
        const accounts = await getAccounts();
        if (accounts.length === 0) {
            console.error("No accounts found. Create an account first.");
            process.exit(1);
        }
        const accountId = accounts[0].id;
        console.log(`Using account ID: ${accountId}`);

        // 2. Prepare expense data
        const expenseData = {
            description: "Test Expense Reproduction",
            amount: 10,
            category: "Test Category",
            paidFromAccountId: accountId,
        };

        // 3. Call addExpense
        console.log("Calling addExpense...");
        const result = await addExpense(expenseData);
        console.log("Expense added successfully:", result);

    } catch (error) {
        console.error("Caught error during reproduction:");
        console.error(error);
    }
}

reproduceExpenseError();


import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

async function debugAccountTransactions() {
    const supabase = getSupabaseServerClient();

    console.log("--- Debugging Account Transactions ---");

    // 1. Find Caja Chica Account
    const { data: accounts, error: accountError } = await supabase
        .from("accounts")
        .select("id, firestore_id, name")
        .ilike("name", "%Caja Chica%");

    if (accountError) {
        console.error("Error fetching accounts:", accountError);
        return;
    }

    console.log(`Found ${accounts.length} accounts matching 'Caja Chica':`);
    accounts.forEach(acc => {
        console.log(`- Name: ${acc.name}`);
        console.log(`  ID (UUID): ${acc.id}`);
        console.log(`  Firestore ID: ${acc.firestore_id}`);
    });

    if (accounts.length === 0) return;

    const account = accounts[0];
    const idsToCheck = [account.id, account.firestore_id].filter(Boolean);

    // 2. Check Incomes
    console.log("\nChecking Incomes for these IDs:", idsToCheck);

    const { data: incomes, error: incomeError } = await supabase
        .from("incomes")
        .select("id, description, amount, destinationAccountId")
        .in("destinationAccountId", idsToCheck);

    if (incomeError) {
        console.error("Error fetching incomes:", incomeError);
    } else {
        console.log(`Found ${incomes.length} incomes:`);
        incomes.forEach(inc => {
            console.log(`- ${inc.description}: $${inc.amount} (Linked to: ${inc.destinationAccountId})`);
        });
    }

    // 3. Check Expenses
    /*
    console.log("\nChecking Expenses for these IDs:");
    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("id, description, amount, paidFromAccountId")
      .in("paidFromAccountId", idsToCheck);
  
      if (expenseError) {
          console.error("Error fetching expenses:", expenseError);
      } else {
          console.log(`Found ${expenses.length} expenses:`);
          expenses.forEach(exp => {
              console.log(`- ${exp.description}: $${exp.amount} (Linked to: ${exp.paidFromAccountId})`);
          });
      }
    */
}

debugAccountTransactions().catch(console.error);

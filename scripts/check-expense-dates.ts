
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

async function checkExpenseDates() {
    const supabase = getSupabaseServerClient();
    console.log("--- Checking Expense Dates ---");

    const { data: expenses, error } = await supabase
        .from("expenses")
        .select("paymentDate, description, amount")
        .order("paymentDate", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching expenses:", error);
        return;
    }

    console.log(`Found ${expenses.length} recent expenses:`);
    expenses.forEach(e => {
        console.log(`- ${e.paymentDate}: ${e.description} ($${e.amount})`);
    });
}

checkExpenseDates().catch(console.error);

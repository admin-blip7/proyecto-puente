
import { getDailySalesStats } from "@/lib/services/financeService";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

async function test() {
    console.log("Testing getDailySalesStats...");
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    console.log("Range:", start.toISOString(), "to", end.toISOString());

    const stats = await getDailySalesStats(start, end);
    console.log("Stats:", stats);

    const supabase = getSupabaseServerClient();
    const { data: allSales } = await supabase.from("sales").select("createdAt, totalAmount, status").limit(5);
    console.log("Sample Sales:", allSales);
}

test().catch(console.error);

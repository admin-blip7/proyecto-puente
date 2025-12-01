
import { getIncomes } from "@/lib/services/incomeService";

async function debugIncomes() {
    console.log("--- Debugging getIncomes ---");
    const startDate = new Date('2024-01-01');
    const endDate = new Date();

    const incomes = await getIncomes(startDate, endDate);

    console.log(`Total Incomes Fetched: ${incomes.length}`);

    const categories = new Set(incomes.map(i => i.category));
    console.log("Categories found:", Array.from(categories));

    const sales = incomes.filter(i => i.category === 'Venta');
    console.log(`Sales found: ${sales.length}`);

    if (sales.length > 0) {
        console.log("Sample Sale:", sales[0]);
    } else {
        console.log("No sales found in getIncomes output.");
    }
}

debugIncomes().catch(console.error);

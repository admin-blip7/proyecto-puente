import { Suspense } from "react";
import FinanceManagerClient from "@/components/admin/finance/expenses/FinanceManagerClient";
import { getExpensesByDateRange } from "@/lib/services/financeService";
import { getIncomes, getIncomeCategories } from "@/lib/services/incomeService";
import { getTransfers } from "@/lib/services/transferService";
import { getAccounts } from "@/lib/services/accountService";
import { getExpenseCategories } from "@/lib/services/expenseCategoryService";

export const metadata = {
    title: "Gestor de Finanzas | Admin",
    description: "Administra gastos, ingresos y transferencias del negocio"
};

async function getInitialData() {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        const [expenses, incomes, transfers, accounts, expenseCategories, incomeCategories] = await Promise.all([
            getExpensesByDateRange(startOfMonth, endOfMonth),
            getIncomes(), // Ideally filter by date too, but for now fetch all or add date range
            getTransfers(), // Ideally filter by date too
            getAccounts(),
            getExpenseCategories(),
            getIncomeCategories()
        ]);

        return { expenses, incomes, transfers, accounts, expenseCategories, incomeCategories };
    } catch (error) {
        console.error("Error fetching initial data:", error);
        return { expenses: [], incomes: [], transfers: [], accounts: [], expenseCategories: [], incomeCategories: [] };
    }
}

export default async function ExpensesPage() {
    const { expenses, incomes, transfers, accounts, expenseCategories, incomeCategories } = await getInitialData();

    return (
        <Suspense fallback={<div className="p-8">Cargando finanzas...</div>}>
            <FinanceManagerClient
                initialExpenses={expenses}
                initialIncomes={incomes}
                initialTransfers={transfers}
                initialAccounts={accounts}
                initialExpenseCategories={expenseCategories}
                initialIncomeCategories={incomeCategories}
            />
        </Suspense>
    );
}

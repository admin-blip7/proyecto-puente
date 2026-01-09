export const dynamic = "force-dynamic";

import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import FinancePageWrapper from "@/components/admin/finance/FinancePageWrapper";
import { getExpenses } from "@/lib/services/financeService";
import { getSales } from "@/lib/services/salesService";
import { getRepairOrders } from "@/lib/services/repairService";
import { getProducts } from "@/lib/services/productService";
import { getConsignors } from "@/lib/services/consignorService";
import { getConsignorPayments, getConsignorPaymentsBatch } from "@/lib/services/paymentService";
import { getAllClosedSessions } from "@/lib/services/cashSessionService";
import { getAccounts } from "@/lib/services/accountService";
import { getLogger } from "@/lib/logger";

const log = getLogger("FinancePage");

// Función wrapper para manejar errores de forma segura en SSR
async function safeFetch<T>(
  fn: () => Promise<T>,
  fallback: T,
  operationName: string
): Promise<{ data: T; error: string | null; success: boolean }> {
  try {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;

    log.info(`[FinancePage] Successfully fetched ${operationName}`, {
      operation: operationName,
      duration: `${duration}ms`,
      itemCount: Array.isArray(result) ? result.length : 'N/A'
    });

    return { data: result, error: null, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`[FinancePage] Error fetching ${operationName}`, {
      operation: operationName,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return { data: fallback, error: errorMessage, success: false };
  }
}

export default async function FinancePage() {
  const startTime = Date.now();
  log.info("[FinancePage] Starting page load", { timestamp: new Date().toISOString() });

  try {
    // Fetch datos principales con manejo de errores individual
    const [expensesResult, salesResult, repairsResult, productsResult, consignorsResult, cashSessionsResult, accountsResult] = await Promise.allSettled([
      safeFetch(() => getExpenses(), [], "expenses"),
      safeFetch(async () => {
        const result = await getSales('all', 0, 1000); // Get all sales for finance dashboard
        return result.sales; // Extract sales array from result
      }, [], "sales"),
      safeFetch(() => getRepairOrders(), [], "repairs"),
      safeFetch(() => getProducts(), [], "products"),
      safeFetch(() => getConsignors(), [], "consignors"),
      safeFetch(() => getAllClosedSessions(), [], "cash sessions"),
      safeFetch(() => getAccounts(), [], "accounts")
    ]);

    // Extraer resultados y manejar errores
    const expenses = expensesResult.status === 'fulfilled' ? expensesResult.value.data : [];
    const sales = salesResult.status === 'fulfilled' ? salesResult.value.data : [];
    const repairs = repairsResult.status === 'fulfilled' ? repairsResult.value.data : [];
    const products = productsResult.status === 'fulfilled' ? productsResult.value.data : [];
    const consignors = consignorsResult.status === 'fulfilled' ? consignorsResult.value.data : [];
    const cashSessions = cashSessionsResult.status === 'fulfilled' ? cashSessionsResult.value.data : [];
    const accounts = accountsResult.status === 'fulfilled' ? accountsResult.value.data : [];

    // Log de errores si los hay
    const failedOperations = [
      { name: 'expenses', result: expensesResult },
      { name: 'sales', result: salesResult },
      { name: 'repairs', result: repairsResult },
      { name: 'products', result: productsResult },
      { name: 'consignors', result: consignorsResult },
      { name: 'cash sessions', result: cashSessionsResult },
      { name: 'accounts', result: accountsResult }
    ].filter(op => op.result.status === 'rejected' || (op.result.status === 'fulfilled' && !op.result.value.success));

    if (failedOperations.length > 0) {
      log.warn("[FinancePage] Some operations failed", {
        failedOperations: failedOperations.map(op => op.name),
        details: failedOperations.map(op => ({
          name: op.name,
          error: op.result.status === 'rejected' ? op.result.reason : op.result.value.error
        }))
      });
    }

    // Fetch pagos de consignatarios usando el método mejorado
    let consignorPayments: any[] = [];
    if (consignors.length > 0) {
      try {
        const consignorIds = consignors.map(c => c.id).filter(Boolean);
        log.info("[FinancePage] Fetching consignor payments", {
          consignorCount: consignors.length,
          validIds: consignorIds.length
        });

        const paymentsByConsignor = await getConsignorPaymentsBatch(consignorIds);
        consignorPayments = Object.values(paymentsByConsignor).flat();

        log.info("[FinancePage] Successfully fetched consignor payments", {
          totalPayments: consignorPayments.length,
          consignorsWithPayments: Object.keys(paymentsByConsignor).length
        });
      } catch (paymentError) {
        log.error("[FinancePage] Error fetching consignor payments", {
          error: paymentError instanceof Error ? paymentError.message : String(paymentError),
          consignorCount: consignors.length
        });
        // Continuar sin pagos en caso de error
        consignorPayments = [];
      }
    } else {
      log.info("[FinancePage] No consignors found, skipping payment fetch");
    }

    const totalTime = Date.now() - startTime;
    log.info("[FinancePage] Page load completed", {
      totalTime: `${totalTime}ms`,
      dataCounts: {
        expenses: expenses.length,
        sales: sales.length,
        repairs: repairs.length,
        products: products.length,
        consignors: consignors.length,
        consignorPayments: consignorPayments.length,
        cashSessions: cashSessions.length,
        accounts: accounts.length
      }
    });

    return (
      <div className="flex h-screen w-full flex-row">
        <div className="hidden md:flex">
          <LeftSidebar />
        </div>
        <div className="absolute top-4 left-4 z-50 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-24">
              <SheetTitle className="sr-only">Finance Menu</SheetTitle>
              <LeftSidebar />
            </SheetContent>
          </Sheet>
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
          <FinancePageWrapper
            initialExpenses={expenses}
            initialSales={sales}
            initialRepairs={repairs}
            initialProducts={products}
            initialConsignors={consignors}
            initialConsignorPayments={consignorPayments}
            initialCashSessions={cashSessions}
            initialAccounts={accounts}
          />
        </main>
      </div>
    );
  } catch (criticalError) {
    const totalTime = Date.now() - startTime;
    log.error("[FinancePage] Critical error during page load", {
      error: criticalError instanceof Error ? criticalError.message : String(criticalError),
      stack: criticalError instanceof Error ? criticalError.stack : undefined,
      totalTime: `${totalTime}ms`
    });

    // En caso de error crítico, mostrar una página con datos mínimos
    return (
      <div className="flex h-screen w-full flex-row">
        <div className="hidden md:flex">
          <LeftSidebar />
        </div>
        <div className="absolute top-4 left-4 z-50 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-24">
              <SheetTitle className="sr-only">Finance Menu</SheetTitle>
              <LeftSidebar />
            </SheetContent>
          </Sheet>
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-12">
          <div className="flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-semibold mb-4">Error al cargar datos financieros</h2>
            <p className="text-muted-foreground mb-4">
              Ha ocurrido un error al cargar la información. Por favor, intente recargar la página.
            </p>
            <Button onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </div>
        </main>
      </div>
    );
  }
}

import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import DebtClient from "@/components/admin/finance/debts/DebtClient";
import { getDebts } from "@/lib/services/debtService";
import { getAccounts } from "@/lib/services/accountService";
import { getLogger } from "@/lib/logger";

const log = getLogger("DebtsPage");

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
    
    log.info(`[DebtsPage] Successfully fetched ${operationName}`, {
      operation: operationName,
      duration: `${duration}ms`,
      itemCount: Array.isArray(result) ? result.length : 'N/A'
    });
    
    return { data: result, error: null, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`[DebtsPage] Error fetching ${operationName}`, {
      operation: operationName,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return { data: fallback, error: errorMessage, success: false };
  }
}

export default async function DebtsPage() {
  const startTime = Date.now();
  log.info("[DebtsPage] Starting page load", { timestamp: new Date().toISOString() });

  try {
    // Fetch datos principales con manejo de errores individual
    const [debtsResult, accountsResult] = await Promise.allSettled([
      safeFetch(() => getDebts(), [], "debts"),
      safeFetch(() => getAccounts(), [], "accounts")
    ]);

    // Extraer resultados y manejar errores
    const initialDebts = debtsResult.status === 'fulfilled' ? debtsResult.value.data : [];
    const initialAccounts = accountsResult.status === 'fulfilled' ? accountsResult.value.data : [];

    // Log de errores si los hay
    const failedOperations = [
      { name: 'debts', result: debtsResult },
      { name: 'accounts', result: accountsResult }
    ].filter(op => op.result.status === 'rejected' || (op.result.status === 'fulfilled' && !op.result.value.success));

    if (failedOperations.length > 0) {
      log.warn("[DebtsPage] Some operations failed", {
        failedOperations: failedOperations.map(op => op.name),
        details: failedOperations.map(op => ({
          name: op.name,
          error: op.result.status === 'rejected' ? op.result.reason : op.result.value.error
        }))
      });
    }

    const totalTime = Date.now() - startTime;
    log.info("[DebtsPage] Page load completed", {
      totalTime: `${totalTime}ms`,
      dataCounts: {
        debts: initialDebts.length,
        accounts: initialAccounts.length
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
          <DebtClient
            initialDebts={initialDebts}
            initialAccounts={initialAccounts}
          />
        </main>
      </div>
    );
  } catch (criticalError) {
    const totalTime = Date.now() - startTime;
    log.error("[DebtsPage] Critical error during page load", {
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
            <h2 className="text-2xl font-semibold mb-4">Error al cargar datos de deudas</h2>
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

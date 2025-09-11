import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import FinanceDashboard from "@/components/admin/finance/FinanceDashboard";
import { getExpenses } from "@/lib/services/financeService";
import { getSales } from "@/lib/services/salesService";
import { getRepairOrders } from "@/lib/services/repairService";
import { getProducts } from "@/lib/services/productService";
import { getConsignors } from "@/lib/services/consignorService";
import { getConsignorPayments } from "@/lib/services/paymentService";
import { getAllClosedSessions } from "@/lib/services/cashSessionService";


export default async function FinancePage() {
    const expenses = await getExpenses();
    const sales = await getSales();
    const repairs = await getRepairOrders();
    const products = await getProducts();
    const consignors = await getConsignors();
    const cashSessions = await getAllClosedSessions();

    // Fetch all payments for all consignors
    const consignorPayments = (await Promise.all(
        consignors.map(c => getConsignorPayments(c.id))
    )).flat();

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
               <FinanceDashboard 
                initialExpenses={expenses}
                initialSales={sales}
                initialRepairs={repairs}
                initialProducts={products}
                initialConsignors={consignors}
                initialConsignorPayments={consignorPayments}
                initialCashSessions={cashSessions}
               />
            </main>
        </div>
    )
}

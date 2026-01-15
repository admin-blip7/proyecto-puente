export const dynamic = "force-dynamic";

import SalesHistoryClient from "@/components/admin/sales/SalesHistoryClient";
import { Sale, Product } from "@/types";
import { isToday } from 'date-fns';
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getSales } from "@/lib/services/salesService";
import { getProducts } from "@/lib/services/productService";

const calculateDailySummary = (sales: Sale[], products: Product[]) => {
    const todaySales = sales.filter(sale => isToday(sale.createdAt));

    const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    const totalCost = todaySales.reduce((sum, sale) => {
        const saleCost = sale.items.reduce((itemSum, item) => {
            const product = products.find(p => p.id === item.productId);
            return itemSum + (product ? product.cost * item.quantity : 0);
        }, 0);
        return sum + saleCost;
    }, 0);

    const totalProfit = totalRevenue - totalCost;

    return {
        dailyRevenue: totalRevenue,
        dailyCost: totalCost,
        dailyProfit: totalProfit,
    };
}


export default async function SalesPage() {
    // Initial load: no date filter, showing last 1000 sales
    const { sales: initialSales } = await getSales('all', 0, 1000, "", "", "");
    const products = await getProducts();
    const { dailyCost, dailyProfit } = calculateDailySummary(initialSales, products);

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
                        <SheetTitle className="sr-only">Sales Menu</SheetTitle>
                        <LeftSidebar />
                    </SheetContent>
                </Sheet>
            </div>
            <main className="flex-1 overflow-hidden p-4 md:p-6 md:pt-12">
                <SalesHistoryClient
                    initialSales={initialSales}
                    products={products}
                    dailyCost={dailyCost}
                    dailyProfit={dailyProfit}
                />
            </main>
        </div>
    )
}

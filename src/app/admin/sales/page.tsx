export const dynamic = "force-dynamic";

import SalesHistoryClient from "@/components/admin/sales/SalesHistoryClient";
import { Sale, Product } from "@/types";
import { isToday } from 'date-fns';
import { AdminPageLayout } from "@/components/shared/AdminPageLayout";
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
    const { sales: initialSales } = await getSales('completed', 0, 1000, "", "", "");
    const products = await getProducts();
    const { dailyCost, dailyProfit } = calculateDailySummary(initialSales, products);

    return (
        <AdminPageLayout title="Ventas">
            <SalesHistoryClient
                initialSales={initialSales}
                products={products}
                dailyCost={dailyCost}
                dailyProfit={dailyProfit}
            />
        </AdminPageLayout>
    )
}

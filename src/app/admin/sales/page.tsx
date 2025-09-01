import SalesHistoryClient from "@/components/admin/sales/SalesHistoryClient";
import { Sale, Product, SaleItem } from "@/types";
import { subDays, isToday } from 'date-fns';
import LeftSidebar from "@/components/shared/LeftSidebar";

const getProducts = async (): Promise<Product[]> => {
    const categories = ["Bebidas", "Limpieza", "Snacks", "Panadería"];
    return Array.from({ length: 12 }, (_, i) => ({
      id: `prod_${i + 1}`,
      name: `Product ${i + 1}`,
      sku: `SKU00${i + 1}`,
      price: parseFloat((Math.random() * 50 + 5).toFixed(2)),
      cost: parseFloat((Math.random() * 30 + 2).toFixed(2)),
      stock: Math.floor(Math.random() * 100),
      category: categories[i % categories.length],
      imageUrl: `https://picsum.photos/400/400?random=${i}`,
      createdAt: new Date(),
    }));
};

const getSales = async (): Promise<Sale[]> => {
    // Mock sales data
    const sales: Omit<Sale, 'id' | 'createdAt'>[] = [
        {
            saleId: 'SALE-001',
            items: [{ productId: 'prod_1', name: 'Product 1', quantity: 2, priceAtSale: 10.50 }],
            totalAmount: 21.00,
            paymentMethod: 'Efectivo',
            cashierId: 'mock-user-uid',
            cashierName: 'Admin de Tienda',
            customerName: 'Juan Pérez'
        },
        {
            saleId: 'SALE-002',
            items: [
                { productId: 'prod_3', name: 'Product 3', quantity: 1, priceAtSale: 5.00 },
                { productId: 'prod_4', name: 'Product 4', quantity: 3, priceAtSale: 2.25 }
            ],
            totalAmount: 11.75,
            paymentMethod: 'Tarjeta de Crédito',
            cashierId: 'mock-user-uid',
            cashierName: 'Admin de Tienda',
            customerName: 'Maria Garcia',
            customerPhone: '555-1234'
        },
         {
            saleId: 'SALE-003',
            items: [{ productId: 'prod_2', name: 'Product 2', quantity: 5, priceAtSale: 15.00 }],
            totalAmount: 75.00,
            paymentMethod: 'Efectivo',
            cashierId: 'mock-user-uid',
            cashierName: 'Admin de Tienda',
        },
        {
            saleId: 'SALE-004',
            items: [{ productId: 'prod_5', name: 'Product 5', quantity: 1, priceAtSale: 30.00 }],
            totalAmount: 30.00,
            paymentMethod: 'Tarjeta de Crédito',
            cashierId: 'mock-user-uid',
            cashierName: 'Admin de Tienda',
            customerName: 'Carlos Rodriguez'
        },
    ];

    const now = new Date();
    // Make first sale today
    return sales.map((sale, index) => ({
        ...sale,
        id: `sale_${index + 1}`,
        createdAt: index === 0 ? now : subDays(now, index),
    }));
};

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
    const initialSales = await getSales();
    const products = await getProducts();
    const { dailyCost, dailyProfit } = calculateDailySummary(initialSales, products);

    return (
        <div className="flex h-screen w-full flex-row">
            <LeftSidebar />
            <main className="flex-1 overflow-hidden p-4 md:p-6">
                <SalesHistoryClient 
                    initialSales={initialSales}
                    dailyCost={dailyCost}
                    dailyProfit={dailyProfit}
                />
            </main>
        </div>
    )
}

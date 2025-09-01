import { Header } from "@/components/shared/Header";
import SalesHistoryClient from "@/components/admin/sales/SalesHistoryClient";
import { Sale } from "@/types";
import { subDays, parse } from 'date-fns';

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
    return sales.map((sale, index) => ({
        ...sale,
        id: `sale_${index + 1}`,
        createdAt: subDays(now, index),
    }));
};


export default async function SalesPage() {
    const initialSales = await getSales();
    return (
        <div className="flex h-screen w-full flex-col">
            <Header />
            <main className="flex-1 overflow-hidden p-4 md:p-6">
                <SalesHistoryClient initialSales={initialSales} />
            </main>
        </div>
    )
}

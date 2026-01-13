"use client"

import { useMemo } from "react";
import { Product, Sale } from "@/types";
import { subDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, Snail } from "lucide-react";

interface ProductABCAnalysisProps {
    products: Product[];
    sales: Sale[];
}

interface ProductProfitData {
    productId: string;
    name: string;
    totalRevenue: number;
    totalProfit: number;
    profitPercentage?: number;
    cumulativePercentage?: number;
    stock: number;
    suggestedStock: number;
}

type ABCCategory = 'A' | 'B' | 'C';

const getCategoryBadge = (category: ABCCategory) => {
    switch (category) {
        case 'A':
            return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><Star className="h-3 w-3 mr-1" /> Estrella</Badge>;
        case 'B':
            return <Badge variant="secondary"><ThumbsUp className="h-3 w-3 mr-1" /> Promedio</Badge>;
        case 'C':
            return <Badge variant="outline"><Snail className="h-3 w-3 mr-1" /> Baja Rotación</Badge>;
    }
}


export default function ProductABCAnalysis({ products, sales }: ProductABCAnalysisProps) {

    const classifiedProducts = useMemo(() => {
        const productDataMap = new Map<string, { revenue: number; profit: number }>();
        const productCostMap = new Map<string, number>();

        // Create a map of product costs for quick lookup
        products.forEach(product => {
            productCostMap.set(product.id, product.cost || 0);
        });

        // Calculate revenue and profit for each product
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const current = productDataMap.get(item.productId) || { revenue: 0, profit: 0 };
                const itemRevenue = item.priceAtSale * item.quantity;
                const itemCost = (productCostMap.get(item.productId) || 0) * item.quantity;
                const itemProfit = itemRevenue - itemCost;

                productDataMap.set(item.productId, {
                    revenue: current.revenue + itemRevenue,
                    profit: current.profit + itemProfit
                });
            });
        });

        // Calculate sales velocity (last 30 days)
        const cutoffDate = subDays(new Date(), 30);
        const salesVelocityMap = new Map<string, number>();

        sales.forEach(sale => {
            const saleDate = new Date(sale.createdAt);
            if (saleDate >= cutoffDate) {
                sale.items.forEach(item => {
                    const current = salesVelocityMap.get(item.productId) || 0;
                    salesVelocityMap.set(item.productId, current + item.quantity);
                });
            }
        });

        const productProfitData: ProductProfitData[] = products.map(product => {
            const data = productDataMap.get(product.id) || { revenue: 0, profit: 0 };
            const salesLast30Days = salesVelocityMap.get(product.id) || 0;
            const dailyVelocity = salesLast30Days / 30;

            return {
                productId: product.id,
                name: product.name,
                totalRevenue: data.revenue,
                totalProfit: data.profit,
                stock: product.stock || 0,
                suggestedStock: 0, // Will be calculated after ABC classification
            };
        }).sort((a, b) => b.totalProfit - a.totalProfit); // Sort by profit, not revenue

        const totalProfitSum = productProfitData.reduce((sum, p) => sum + p.totalProfit, 0);

        // Apply proper ABC analysis using cumulative PROFIT percentage
        // A: Products that contribute to 80% of profit (30 days coverage)
        // B: Products that contribute to next 15% of profit (21 days coverage)  
        // C: Products that contribute to remaining 5% of profit (14 days coverage)
        let cumulativeProfit = 0;

        return productProfitData.map((p) => {
            cumulativeProfit += p.totalProfit;
            const cumulativePercentage = totalProfitSum > 0 ? (cumulativeProfit / totalProfitSum) * 100 : 0;

            let category: ABCCategory;
            let targetDays: number;
            if (cumulativePercentage <= 80) {
                category = 'A';
                targetDays = 30; // 30 days coverage for A products
            } else if (cumulativePercentage <= 95) {
                category = 'B';
                targetDays = 21; // 21 days coverage for B products
            } else {
                category = 'C';
                targetDays = 14; // 14 days coverage for C products
            }

            const profitPercentage = totalProfitSum > 0 ? (p.totalProfit / totalProfitSum) * 100 : 0;

            // Calculate suggested stock based on sales velocity
            const salesLast30Days = salesVelocityMap.get(p.productId) || 0;
            const dailyVelocity = salesLast30Days / 30;
            const suggestedStock = Math.ceil(dailyVelocity * targetDays);

            return {
                ...p,
                category,
                profitPercentage,
                cumulativePercentage,
                suggestedStock
            };
        });

    }, [products, sales]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Análisis ABC de Productos</CardTitle>
                <CardDescription>
                    Clasificación basada en el Principio de Pareto por ganancia: Clase A (80% ganancia), Clase B (15% ganancia), Clase C (5% ganancia).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Stock</TableHead>
                                <TableHead className="text-right">Stock Sugerido</TableHead>
                                <TableHead className="text-right">Ingresos</TableHead>
                                <TableHead className="text-right">Ganancia</TableHead>
                                <TableHead className="text-right">% Ganancia</TableHead>
                                <TableHead className="text-right">% Acumulado</TableHead>
                                <TableHead className="text-center">Categoría</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classifiedProducts.map(product => (
                                <TableRow key={product.productId}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-right font-mono">{product.stock}</TableCell>
                                    <TableCell className="text-right font-mono font-semibold text-blue-600">{product.suggestedStock}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">${product.totalRevenue.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-semibold text-green-600">${product.totalProfit.toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {product.profitPercentage?.toFixed(2) || '0.00'}%
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        {product.cumulativePercentage?.toFixed(1) || '0.0'}%
                                    </TableCell>
                                    <TableCell className="text-center">{getCategoryBadge(product.category)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

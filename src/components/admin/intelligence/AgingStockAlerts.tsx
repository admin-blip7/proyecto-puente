"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product, Sale } from "@/types";
import { differenceInDays } from "date-fns";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AgingStockAlertsProps {
    products: Product[];
    sales: Sale[];
}

interface AgingProduct extends Product {
    daysSinceLastSale: number;
    valueAtRisk: number;
}

export default function AgingStockAlerts({ products, sales }: AgingStockAlertsProps) {
    const agingProducts = useMemo(() => {
        const lastSaleDateMap = new Map<string, Date>();

        // 1. Find last sale date for every product
        sales.forEach(sale => {
            const saleDate = new Date(sale.createdAt);
            sale.items.forEach(item => {
                const current = lastSaleDateMap.get(item.productId);
                if (!current || saleDate > current) {
                    lastSaleDateMap.set(item.productId, saleDate);
                }
            });
        });

        const today = new Date();
        const results: AgingProduct[] = [];

        // 2. Identify products with stock > 0 that haven't sold in 30+ days
        products.forEach(product => {
            if ((product.stock || 0) <= 0) return;

            const lastSale = lastSaleDateMap.get(product.id);
            // If never sold, use creation date as proxy for "arrival"
            const referenceDate = lastSale || new Date(product.createdAt);
            const daysSince = differenceInDays(today, referenceDate);

            // Threshold: 30 days to start alerting
            if (daysSince > 30) {
                results.push({
                    ...product,
                    daysSinceLastSale: daysSince,
                    valueAtRisk: (product.stock || 0) * (product.cost || 0)
                });
            }
        });

        // 3. Sort by Value at Risk (Cost * Stock) to prioritize financial impact
        return results.sort((a, b) => b.valueAtRisk - a.valueAtRisk);
    }, [products, sales]);

    if (agingProducts.length === 0) return null;

    return (
        <Card className="border-amber-200 bg-amber-50/10 dark:bg-amber-950/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-600 dark:text-amber-500">
                        <Clock className="h-5 w-5" />
                        Alertas de Obsolescencia (FIFO/PEPS)
                    </CardTitle>
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                        {agingProducts.length} Productos Estancados
                    </Badge>
                </div>
                <CardDescription>
                    Productos con stock que no se han vendido en más de 30 días. Prioriza su salida para recuperar inversión.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px] w-full pr-4">
                    <div className="space-y-4">
                        {agingProducts.map(product => (
                            <div key={product.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-100 dark:border-amber-900/50 shadow-sm">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-sm">{product.name}</h4>
                                        {product.daysSinceLastSale > 60 && (
                                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                                {product.daysSinceLastSale} días
                                            </Badge>
                                        )}
                                        {product.daysSinceLastSale <= 60 && (
                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-200">
                                                {product.daysSinceLastSale} días sin venta
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        Stock: <span className="font-mono font-medium text-foreground">{product.stock}</span>
                                        <span className="text-slate-300">|</span>
                                        Costo Unitario: {formatCurrency(product.cost)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Valor en Riesgo</p>
                                    <div className="font-bold text-amber-700 dark:text-amber-500 flex items-center justify-end gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {formatCurrency(product.valueAtRisk)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

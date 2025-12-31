"use client"

import { useMemo, useState } from "react";
import { Product, Sale } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Sparkles,
    ShoppingCart,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    BrainCircuit,
    ArrowRight
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { subDays, isAfter } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface AutoOrderProps {
    products: Product[];
    sales: Sale[];
}

type ABCCategory = 'A' | 'B' | 'C';

interface ProductAnalysis {
    product: Product;
    category: ABCCategory;
    velocity: number; // Daily sales velocity
    suggestedOrder: number;
    estimatedCost: number;
    reason: string;
    coverageDays: number; // How many days of stock we currently have
}

export default function AutoOrder({ products, sales }: AutoOrderProps) {
    const [showMagic, setShowMagic] = useState(false);

    const suggestions = useMemo(() => {
        // 1. Calculate Sales Velocity (Last 30 Days)
        const daysToAnalyze = 30;
        const cutoffDate = subDays(new Date(), daysToAnalyze);

        const recentSales = sales.filter(s => isAfter(new Date(s.createdAt), cutoffDate));

        const salesMap = new Map<string, { revenue: number; units: number }>();

        recentSales.forEach(sale => {
            sale.items.forEach(item => {
                const current = salesMap.get(item.productId) || { revenue: 0, units: 0 };
                salesMap.set(item.productId, {
                    revenue: current.revenue + (item.priceAtSale * item.quantity),
                    units: current.units + item.quantity
                });
            });
        });

        // 2. ABC Classification based on Revenue
        const productStats = products.map(p => {
            const stats = salesMap.get(p.id) || { revenue: 0, units: 0 };
            return {
                ...p,
                revenue: stats.revenue,
                unitsSold: stats.units
            };
        }).sort((a, b) => b.revenue - a.revenue);

        const countA = Math.ceil(productStats.length * 0.20);
        const countB = Math.ceil(productStats.length * 0.30);

        // 3. Generate Suggestions
        const analysis: ProductAnalysis[] = productStats.map((p, index) => {
            // Determine Category
            let category: ABCCategory = 'C';
            let targetDays = 7; // Default for C

            if (index < countA) {
                category = 'A';
                targetDays = 30; // Protect star products
            } else if (index < countA + countB) {
                category = 'B';
                targetDays = 15;
            }

            // Calculate Metrics
            const velocity = p.unitsSold / daysToAnalyze;
            const currentStock = p.stock;
            const targetStock = Math.ceil(velocity * targetDays);

            // Suggestion Logic
            let suggestedOrder = targetStock - currentStock;
            if (suggestedOrder < 0) suggestedOrder = 0;

            // Coverage
            const coverageDays = velocity > 0 ? currentStock / velocity : 999;

            let reason = `Stock suficiente para ${Math.floor(coverageDays)} días.`;
            if (suggestedOrder > 0) {
                reason = `Stock bajo. Objetivo: ${targetDays} días (Clase ${category}).`;
            }

            return {
                product: p,
                category,
                velocity,
                suggestedOrder,
                estimatedCost: suggestedOrder * p.cost,
                reason,
                coverageDays
            };
        });

        // Filter only products that need ordering
        return analysis
            .filter(item => item.suggestedOrder > 0)
            .sort((a, b) => {
                // Prioritize A class, then low coverage
                if (a.category !== b.category) return a.category.localeCompare(b.category);
                return a.coverageDays - b.coverageDays;
            });

    }, [products, sales]);

    const totalEstimatedCost = suggestions.reduce((sum, item) => sum + item.estimatedCost, 0);

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            <CardHeader className="relative z-10 pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-blue-300 border-blue-500/50 bg-blue-500/10 backdrop-blur-sm">
                                <BrainCircuit className="h-3 w-3 mr-1" /> AI Powered
                            </Badge>
                            <Badge variant="outline" className="text-purple-300 border-purple-500/50 bg-purple-500/10 backdrop-blur-sm">
                                Nuevo
                            </Badge>
                        </div>
                        <CardTitle className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                            Auto-Pedido Inteligente
                        </CardTitle>
                        <CardDescription className="text-slate-300 md:text-lg">
                            Sugerencias de compra basadas en velocidad de ventas y clasificación ABC.
                        </CardDescription>
                    </div>

                    <Button
                        size="lg"
                        className={`
                            relative overflow-hidden transition-all duration-500 
                            ${showMagic ? 'bg-white text-slate-900 shadow-white/25 hover:bg-slate-100' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-purple-500/25'}
                            border-0 font-bold text-md h-12 px-8 rounded-xl
                        `}
                        onClick={() => setShowMagic(!showMagic)}
                    >
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                        <span className="relative z-10 flex items-center gap-2">
                            {showMagic ? (
                                <>Ocultar Sugerencias</>
                            ) : (
                                <>
                                    <Sparkles className="h-5 w-5 animate-pulse" />
                                    Generar Pedido Mágico
                                </>
                            )}
                        </span>
                    </Button>
                </div>
            </CardHeader>

            <AnimatePresence>
                {showMagic && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <CardContent className="relative z-10 pt-4">

                            {/* Stats Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                                    <p className="text-sm text-slate-400">Productos a Reabastecer</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-bold text-white">{suggestions.length}</span>
                                        <span className="text-sm text-slate-400 mb-1">items</span>
                                    </div>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                                    <p className="text-sm text-slate-400">Inversión Estimada</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-3xl font-bold text-emerald-400">{formatCurrency(totalEstimatedCost)}</span>
                                    </div>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors">
                                    <div>
                                        <p className="text-sm text-slate-400">Acción Rápida</p>
                                        <p className="text-white font-semibold">Crear Orden de Compra</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <ArrowRight className="h-5 w-5 text-blue-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Suggestions Table */}
                            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
                                <ScrollArea className="h-[400px] w-full">
                                    <Table>
                                        <TableHeader className="bg-white/5">
                                            <TableRow className="hover:bg-white/5 border-white/10">
                                                <TableHead className="text-slate-300">Producto</TableHead>
                                                <TableHead className="text-center text-slate-300">Clase</TableHead>
                                                <TableHead className="text-center text-slate-300">Stock Actual</TableHead>
                                                <TableHead className="text-center text-slate-300">Velocidad (Día)</TableHead>
                                                <TableHead className="text-center text-emerald-300 font-bold">Sugerido</TableHead>
                                                <TableHead className="text-right text-slate-300">Costo Est.</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {suggestions.length === 0 ? (
                                                <TableRow className="hover:bg-transparent border-white/5">
                                                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                                            <p>¡Todo en orden! Tu inventario está optimizado.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                suggestions.map((item) => (
                                                    <TableRow key={item.product.id} className="hover:bg-white/5 border-white/5 transition-colors">
                                                        <TableCell className="font-medium text-white">
                                                            <div className="flex flex-col">
                                                                <span>{item.product.name}</span>
                                                                <span className="text-xs text-slate-500">{item.reason}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {item.category === 'A' && <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30">A</Badge>}
                                                            {item.category === 'B' && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30">B</Badge>}
                                                            {item.category === 'C' && <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/50 hover:bg-slate-500/30">C</Badge>}
                                                        </TableCell>
                                                        <TableCell className="text-center text-slate-300 font-mono">
                                                            {item.product.stock}
                                                        </TableCell>
                                                        <TableCell className="text-center text-slate-300">
                                                            {item.velocity.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 text-base px-3 py-1">
                                                                +{item.suggestedOrder}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right text-emerald-400 font-mono">
                                                            {formatCurrency(item.estimatedCost)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}

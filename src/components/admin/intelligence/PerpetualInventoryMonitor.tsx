"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowDownRight, ArrowUpRight, Box, DollarSign, History, RefreshCw } from "lucide-react";
import { Product } from "@/types";
import { getRecentKardexEntries, RecentKardexEntry } from "@/lib/services/kardexService";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";

interface PerpetualInventoryMonitorProps {
    products: Product[];
}

export default function PerpetualInventoryMonitor({ products }: PerpetualInventoryMonitorProps) {
    const [movements, setMovements] = useState<RecentKardexEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadMovements = async () => {
        setLoading(true);
        try {
            const data = await getRecentKardexEntries(15);
            setMovements(data);
        } catch (error) {
            console.error("Failed to load kardex movements:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMovements();
        // Optional: Set up an interval to refresh meaningful "Real Time" feel
        const interval = setInterval(loadMovements, 30000);
        return () => clearInterval(interval);
    }, []);

    const inventoryStats = useMemo(() => {
        const totalItems = products.reduce((sum, p) => sum + (p.stock || 0), 0);
        const totalCost = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.cost || 0)), 0);
        const potentialRevenue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
        const potentialProfit = potentialRevenue - totalCost;

        return { totalItems, totalCost, potentialRevenue, potentialProfit };
    }, [products]);

    return (
        <div className="grid gap-4 md:grid-cols-7">
            {/* Inventory Value Cards */}
            <Card className="md:col-span-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Box className="h-5 w-5 text-blue-400" />
                        Valoración de Inventario Perpetuo
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                        Estado actual del valor de tu stock en tiempo real.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-sm text-slate-400">Costo Total (Inversión)</span>
                            <div className="text-2xl font-bold font-mono tracking-tight">
                                {formatCurrency(inventoryStats.totalCost)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-sm text-slate-400">Valor de Venta Potencial</span>
                            <div className="text-2xl font-bold font-mono tracking-tight text-green-400">
                                {formatCurrency(inventoryStats.potentialRevenue)}
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-slate-700" />

                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <span className="text-sm text-slate-400">Ganancia Proyectada</span>
                            <div className="text-3xl font-bold text-blue-400">
                                +{formatCurrency(inventoryStats.potentialProfit)}
                            </div>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-full border border-slate-700">
                            <span className="text-xs font-medium text-slate-400 block mb-1">Total Items</span>
                            <div className="text-xl font-bold flex items-center gap-1">
                                <Box className="h-4 w-4" />
                                {inventoryStats.totalItems}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Live Movement Feed */}
            <Card className="md:col-span-3 flex flex-col h-[350px]">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <History className="h-5 w-5 text-muted-foreground" />
                            Movimientos Recientes
                        </CardTitle>
                        <Badge variant="outline" className="animate-pulse gap-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-6 pb-4">
                        {loading && movements.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" /> Cargando...
                            </div>
                        ) : (
                            <div className="space-y-4 pt-1">
                                {movements.map((move, index) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        key={move.id}
                                        className="flex items-start justify-between group"
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 h-2 w-2 rounded-full ${move.tipo === 'INGRESO' ? 'bg-green-500' : 'bg-red-500'} ring-4 ring-opacity-20 ${move.tipo === 'INGRESO' ? 'ring-green-500' : 'ring-red-500'}`} />
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-medium leading-none">
                                                    {move.productoNombre}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {move.concepto}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`flex items-center justify-end text-sm font-bold ${move.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                                                {move.tipo === 'INGRESO' ? '+' : '-'}{move.cantidad}
                                                {move.tipo === 'INGRESO' ? <ArrowUpRight className="h-3 w-3 ml-0.5" /> : <ArrowDownRight className="h-3 w-3 ml-0.5" />}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                {new Date(move.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

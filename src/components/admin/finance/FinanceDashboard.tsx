"use client";

import { useState, useMemo, FC } from "react";
import { Expense, Sale, RepairOrder, Product, Consignor, ConsignorPayment, CashSession } from "@/types";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { startOfMonth, subMonths, startOfYear } from "date-fns";
import { DatePickerWithRange } from "./DatePickerWithRange";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Landmark, Scale, MinusCircle, PlusCircle, Package } from "lucide-react";
import StatCard from "./StatCard";
import { Separator } from "@/components/ui/separator";

interface FinanceDashboardProps {
  initialExpenses: Expense[];
  initialSales: Sale[];
  initialRepairs: RepairOrder[];
  initialProducts: Product[];
  initialConsignors: Consignor[];
  initialConsignorPayments: ConsignorPayment[];
  initialCashSessions: CashSession[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const FinanceDashboard: FC<FinanceDashboardProps> = ({
    initialExpenses,
    initialSales,
    initialRepairs,
    initialProducts,
    initialConsignors,
    initialConsignorPayments,
    initialCashSessions,
}) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });

    const handleDatePresetChange = (preset: string) => {
        const now = new Date();
        switch (preset) {
            case 'this_month':
                setDateRange({ from: startOfMonth(now), to: now });
                break;
            case 'last_month':
                const lastMonth = subMonths(now, 1);
                setDateRange({ from: startOfMonth(lastMonth), to: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0) });
                break;
            case 'this_year':
                setDateRange({ from: startOfYear(now), to: now });
                break;
        }
    };

    const filteredData = useMemo(() => {
        const from = dateRange?.from;
        const to = dateRange?.to;

        if (!from || !to) {
            return {
                sales: [], repairs: [], expenses: [], consignorPayments: [], cashSessions: []
            };
        }

        const filterByDate = <T extends { createdAt?: Date; paymentDate?: Date; closedAt?: Date }>(items: T[], dateField: 'createdAt' | 'paymentDate' | 'closedAt'): T[] => {
            return items.filter(item => {
                const itemDate = item[dateField];
                return itemDate && itemDate >= from && itemDate <= to;
            });
        };
        
        return {
            sales: filterByDate(initialSales, 'createdAt'),
            repairs: filterByDate(initialRepairs, 'createdAt'),
            expenses: filterByDate(initialExpenses, 'paymentDate'),
            consignorPayments: filterByDate(initialConsignorPayments, 'paymentDate'),
            cashSessions: filterByDate(initialCashSessions, 'closedAt'),
        };
    }, [dateRange, initialSales, initialRepairs, initialExpenses, initialConsignorPayments, initialCashSessions]);

    const financialSummary = useMemo(() => {
        // --- REVENUE ---
        const productSalesRevenue = filteredData.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const repairRevenue = filteredData.repairs.reduce((sum, repair) => sum + repair.totalPrice, 0);
        const totalRevenue = productSalesRevenue + repairRevenue;
        
        // --- COGS ---
        const costOfGoodsSold = filteredData.sales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => {
                const product = initialProducts.find(p => p.id === item.productId);
                return itemSum + ((product?.cost || 0) * item.quantity);
            }, 0);
        }, 0);
        
        const costOfRepairParts = filteredData.repairs.reduce((sum, repair) => {
            return sum + repair.partsUsed.reduce((partSum, part) => partSum + (part.cost * part.quantity), 0);
        }, 0);

        const totalCOGS = costOfGoodsSold + costOfRepairParts;
        
        // --- PROFIT ---
        const grossProfit = totalRevenue - totalCOGS;

        // --- EXPENSES ---
        const generalExpenses = filteredData.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const consignorPayments = filteredData.consignorPayments.reduce((sum, payment) => sum + payment.amountPaid, 0);
        const cashShortages = filteredData.cashSessions.reduce((sum, session) => {
            return session.difference && session.difference < 0 ? sum + Math.abs(session.difference) : sum;
        }, 0);
        const totalOperatingExpenses = generalExpenses + consignorPayments + cashShortages;

        // --- NET PROFIT ---
        const netProfit = grossProfit - totalOperatingExpenses;
        
        // Health Indicators
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        const inventoryValue = initialProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0);
        const consignorDebt = initialConsignors.reduce((sum, c) => sum + c.balanceDue, 0);

        return {
            productSalesRevenue, repairRevenue, totalRevenue,
            costOfGoodsSold, costOfRepairParts, totalCOGS,
            grossProfit,
            generalExpenses, consignorPayments, cashShortages, totalOperatingExpenses,
            netProfit,
            grossMargin, netMargin, inventoryValue, consignorDebt
        };
    }, [filteredData, initialProducts, initialConsignors]);

    const {
        totalRevenue, grossProfit, totalOperatingExpenses, netProfit,
        productSalesRevenue, repairRevenue,
        costOfGoodsSold, costOfRepairParts, totalCOGS,
        generalExpenses, consignorPayments, cashShortages,
        grossMargin, netMargin, inventoryValue, consignorDebt
    } = financialSummary;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                 <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Centro de Control de Negocios</h1>
                    <p className="text-muted-foreground">Una vista completa de la salud financiera de tu empresa.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select onValueChange={handleDatePresetChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Seleccionar Rango" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="this_month">Este Mes</SelectItem>
                            <SelectItem value="last_month">Mes Pasado</SelectItem>
                            <SelectItem value="this_year">Este Año</SelectItem>
                        </SelectContent>
                    </Select>
                    <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Ingresos Totales" value={formatCurrency(totalRevenue)} icon={DollarSign} />
                <StatCard title="Utilidad Bruta" value={formatCurrency(grossProfit)} icon={TrendingUp} description={`${grossMargin.toFixed(1)}% margen`} />
                <StatCard title="Gastos Totales" value={formatCurrency(totalOperatingExpenses)} icon={TrendingDown} description="Costos + Gastos Operativos" />
                <StatCard title="Utilidad Neta (Ganancia Real)" value={formatCurrency(netProfit)} icon={Landmark} description={`${netMargin.toFixed(1)}% margen`} isPrimary/>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profit & Loss Section */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Estado de Resultados (P&L)</CardTitle>
                        <CardDescription>Desglose de ingresos, costos y gastos para el período seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow className="font-bold bg-muted/30">
                                    <TableCell><PlusCircle className="inline-block mr-2 h-5 w-5 text-green-600"/>INGRESOS</TableCell>
                                    <TableCell className="text-right text-lg">{formatCurrency(totalRevenue)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-10">Ventas de Productos</TableCell>
                                    <TableCell className="text-right">{formatCurrency(productSalesRevenue)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-10">Ingresos por Reparaciones</TableCell>
                                    <TableCell className="text-right">{formatCurrency(repairRevenue)}</TableCell>
                                </TableRow>

                                <TableRow className="font-bold bg-muted/30">
                                    <TableCell><MinusCircle className="inline-block mr-2 h-5 w-5 text-orange-600"/>COSTO DE BIENES VENDIDOS (CMV)</TableCell>
                                    <TableCell className="text-right text-lg">{formatCurrency(totalCOGS)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-10">Costo de Productos Vendidos</TableCell>
                                    <TableCell className="text-right">{formatCurrency(costOfGoodsSold)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-10">Costo de Refacciones Usadas</TableCell>
                                    <TableCell className="text-right">{formatCurrency(costOfRepairParts)}</TableCell>
                                </TableRow>

                                <TableRow className="font-bold text-lg bg-blue-50 dark:bg-blue-900/20">
                                    <TableCell><TrendingUp className="inline-block mr-2 h-5 w-5"/>UTILIDAD BRUTA</TableCell>
                                    <TableCell className="text-right">{formatCurrency(grossProfit)}</TableCell>
                                </TableRow>

                                 <TableRow className="font-bold bg-muted/30">
                                    <TableCell><MinusCircle className="inline-block mr-2 h-5 w-5 text-red-600"/>GASTOS OPERATIVOS</TableCell>
                                    <TableCell className="text-right text-lg">{formatCurrency(totalOperatingExpenses)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell className="pl-10">Gastos Generales (Renta, Luz, etc.)</TableCell>
                                    <TableCell className="text-right">{formatCurrency(generalExpenses)}</TableCell>
                                </TableRow>
                                 <TableRow>
                                    <TableCell className="pl-10">Pagos a Consignadores</TableCell>
                                    <TableCell className="text-right">{formatCurrency(consignorPayments)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="pl-10">Faltante de Caja</TableCell>
                                    <TableCell className="text-right">{formatCurrency(cashShortages)}</TableCell>
                                </TableRow>

                                <TableRow className="font-extrabold text-xl bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                    <TableCell><Landmark className="inline-block mr-2 h-5 w-5"/>UTILIDAD NETA (GANANCIA REAL)</TableCell>
                                    <TableCell className="text-right">{formatCurrency(netProfit)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Financial Health Section */}
                 <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Salud Financiera</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex justify-between items-center">
                                <span className="font-medium text-muted-foreground">Margen de Utilidad Bruta</span>
                                <span className="font-bold text-lg">{grossMargin.toFixed(1)}%</span>
                           </div>
                           <div className="flex justify-between items-center">
                                <span className="font-medium text-muted-foreground">Margen de Utilidad Neta</span>
                                <span className="font-bold text-lg">{netMargin.toFixed(1)}%</span>
                           </div>
                           <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Package />
                                        <span className="font-medium">Valor del Inventario</span>
                                    </div>
                                    <span className="font-bold text-lg">{formatCurrency(inventoryValue)}</span>
                                </div>
                                 <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2 text-muted-foreground">
                                        <Scale />
                                        <span className="font-medium">Deuda con Consignadores</span>
                                    </div>
                                    <span className="font-bold text-lg">{formatCurrency(consignorDebt)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FinanceDashboard;

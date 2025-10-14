
"use client";

import * as React from "react";
import { useState, useMemo, FC } from "react";
import { Expense, Sale, RepairOrder, Product, Consignor, ConsignorPayment, CashSession, Account } from "@/types";
import { DateRange } from "react-day-picker";
import { startOfMonth, subMonths, startOfYear, isWithinInterval, format, parseISO, getDay, getHours } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Landmark, Brain, Lightbulb, UserCheck, ShieldCheck, Truck, BarChart as BarChartIcon } from "lucide-react";
import StatCard from "./StatCard";
import { DatePickerWithRange } from "./DatePickerWithRange";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';
import PeakHoursHeatmap from "./PeakHoursHeatmap";
import { formatCurrency as formatCurrencyMXN } from "@/lib/utils";

interface FinanceDashboardProps {
  initialExpenses: Expense[];
  initialSales: Sale[];
  initialRepairs: RepairOrder[];
  initialProducts: Product[];
  initialConsignors: Consignor[];
  initialConsignorPayments: ConsignorPayment[];
  initialCashSessions: CashSession[];
  initialAccounts: Account[];
}

const formatCurrency = (value: number) => {
    return formatCurrencyMXN(value);
};

const calculateMetrics = (
    sales: Sale[],
    expenses: Expense[],
    repairs: RepairOrder[],
    products: Product[],
    dateRange?: DateRange
) => {
    const range = {
        start: dateRange?.from || new Date(0),
        end: dateRange?.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : new Date(),
    };

    const salesInRange = sales.filter(sale => isWithinInterval(sale.createdAt, range));
    const expensesInRange = expenses.filter(expense => isWithinInterval(expense.paymentDate, range));
    const repairsInRange = repairs.filter(repair => repair.completedAt && isWithinInterval(repair.completedAt, range));

    let salesRevenue = 0, salesCost = 0, ownProductsRevenue = 0, consignaProductsRevenue = 0, ownProductsProfit = 0, consignaProductsProfit = 0;

    salesInRange.forEach(sale => {
        salesRevenue += sale.totalAmount;
        sale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            const cost = product?.cost || 0;
            const itemRevenue = item.priceAtSale * item.quantity;
            const itemProfit = itemRevenue - (cost * item.quantity);
            salesCost += cost * item.quantity;

            if (product?.ownershipType === 'Consigna') {
                consignaProductsRevenue += itemRevenue;
                consignaProductsProfit += itemProfit;
            } else {
                ownProductsRevenue += itemRevenue;
                ownProductsProfit += itemProfit;
            }
        });
    });

    const repairsRevenue = repairsInRange.reduce((sum, repair) => sum + repair.totalPrice, 0);
    const repairsProfit = repairsInRange.reduce((sum, repair) => sum + repair.profit, 0);

    const totalRevenue = salesRevenue + repairsRevenue;
    const operationalExpenses = expensesInRange.reduce((sum, expense) => sum + expense.amount, 0);
    const totalCost = salesCost + repairsInRange.reduce((sum, r) => sum + r.totalCost, 0) + operationalExpenses;
    const netProfit = totalRevenue - totalCost;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const averageTicket = salesInRange.length > 0 ? salesRevenue / salesInRange.length : 0;

    const soldQuantities = new Map<string, number>();
    salesInRange.forEach(sale => {
        sale.items.forEach(item => {
            soldQuantities.set(item.productId, (soldQuantities.get(item.productId) || 0) + item.quantity);
        });
    });

    const lowRotationProducts = products
        .filter(p => p.type === 'Venta')
        .map(p => ({ ...p, sold: soldQuantities.get(p.id) || 0 }))
        .sort((a,b) => a.sold - b.sold)
        .slice(0, 3);

    const dailyData: Record<string, { revenue: number, profit: number }> = {};
    salesInRange.forEach(sale => {
        const date = format(sale.createdAt, 'yyyy-MM-dd');
        if (!dailyData[date]) dailyData[date] = { revenue: 0, profit: 0 };
        const saleCost = sale.items.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + ((product?.cost || 0) * item.quantity);
        }, 0);
        dailyData[date].revenue += sale.totalAmount;
        dailyData[date].profit += (sale.totalAmount - saleCost);
    });

    repairsInRange.forEach(repair => {
         if (!repair.completedAt) return;
         const date = format(repair.completedAt, 'yyyy-MM-dd');
         if (!dailyData[date]) dailyData[date] = { revenue: 0, profit: 0 };
         dailyData[date].revenue += repair.totalPrice;
         dailyData[date].profit += repair.profit;
    });

    expensesInRange.forEach(expense => {
        const date = format(expense.paymentDate, 'yyyy-MM-dd');
        if (!dailyData[date]) dailyData[date] = { revenue: 0, profit: 0 };
        dailyData[date].profit -= expense.amount;
    });

    const chartData = Object.entries(dailyData)
        .map(([date, values]) => ({
            date: format(parseISO(date), 'dd MMM'),
            Ingresos: values.revenue,
            Ganancias: values.profit
        }))
        .sort((a,b) => a.date.localeCompare(b.date));

    const revenueBreakdown = [
        { name: "Ventas Propias", Ingresos: ownProductsRevenue, Ganancia: ownProductsProfit, Costo: ownProductsRevenue - ownProductsProfit },
        { name: "Consigna", Ingresos: consignaProductsRevenue, Ganancia: consignaProductsProfit, Costo: consignaProductsRevenue - consignaProductsProfit },
        { name: "Reparaciones", Ingresos: repairsRevenue, Ganancia: repairsProfit, Costo: repairsRevenue - repairsProfit },
    ];

    const customerVisits = new Map<string, number>();
    salesInRange.forEach(sale => {
        if (sale.customerPhone) {
            customerVisits.set(sale.customerPhone, (customerVisits.get(sale.customerPhone) || 0) + 1);
        }
    });

    let newCustomers = 0, recurrentCustomers = 0;
    customerVisits.forEach(count => (count === 1 ? newCustomers++ : recurrentCustomers++));

    const customerAnalysis = {
        new: newCustomers,
        recurrent: recurrentCustomers,
        chartData: [ { name: 'Nuevos', value: newCustomers }, { name: 'Recurrentes', value: recurrentCustomers } ]
    };
    
    const activityByHour: Record<number, Record<number, number>> = {};
    for (let i = 0; i < 7; i++) activityByHour[i] = {};

    [...salesInRange, ...repairsInRange].forEach((transaction: any) => {
        const date = 'createdAt' in transaction ? transaction.createdAt : transaction.completedAt!;
        const day = (getDay(date) + 6) % 7; // Monday = 0
        const hour = getHours(date);
        const amount = 'totalAmount' in transaction ? transaction.totalAmount : transaction.totalPrice;
        activityByHour[day][hour] = (activityByHour[day][hour] || 0) + amount;
    });

    const heatmapData = Array.from({ length: 24 }, (_, hour) => {
        const dataPoint: any = { hour: `${hour}:00` };
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        days.forEach((day, index) => {
            dataPoint[day] = activityByHour[index][hour] || 0;
        });
        return dataPoint;
    });


    return { totalRevenue, totalCost, netProfit, netMargin, averageTicket, lowRotationProducts, chartData, revenueBreakdown, customerAnalysis, heatmapData };
};


const InfoWidget = ({ icon, title, children }: { icon: React.ElementType, title: string, children: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="flex-shrink-0">
               {React.createElement(icon, { className: "h-8 w-8 text-primary"})}
            </div>
            <div className="flex-1">
                <CardTitle className="text-lg">{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            {children}
        </CardContent>
    </Card>
);

const FinanceDashboard: FC<FinanceDashboardProps> = ({
    initialExpenses,
    initialSales,
    initialRepairs,
    initialProducts,
}) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });

    const handleDatePresetChange = (preset: string) => {
        const now = new Date();
        switch (preset) {
            case 'today':
                setDateRange({ from: now, to: now });
                break;
            case 'this_week':
                 setDateRange({ from: new Date(now.setDate(now.getDate() - now.getDay())), to: new Date() });
                break;
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
    
    const { 
        totalRevenue, 
        totalCost, 
        netProfit, 
        netMargin,
        averageTicket,
        lowRotationProducts,
        chartData,
        revenueBreakdown,
        customerAnalysis,
        heatmapData
     } = useMemo(() => calculateMetrics(initialSales, initialExpenses, initialRepairs, initialProducts, dateRange), [dateRange, initialSales, initialExpenses, initialRepairs, initialProducts]);

    const inventoryValue = useMemo(() => initialProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0), [initialProducts]);


    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Super Dashboard</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Una vista 360° de la salud y el potencial de tu negocio.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
                     <Select onValueChange={handleDatePresetChange} defaultValue="this_month">
                        <SelectTrigger className="w-full sm:w-[120px]">
                            <SelectValue placeholder="Periodo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hoy</SelectItem>
                            <SelectItem value="this_week">Esta Semana</SelectItem>
                            <SelectItem value="this_month">Este Mes</SelectItem>
                            <SelectItem value="last_month">Mes Pasado</SelectItem>
                            <SelectItem value="this_year">Este Año</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <StatCard title="Ganancia Neta" value={formatCurrency(netProfit)} icon={TrendingUp} description="Ganancia después de todos los costos." isPrimary />
                <StatCard title="Ingresos Totales" value={formatCurrency(totalRevenue)} icon={DollarSign} />
                <StatCard title="Costos Totales" value={formatCurrency(totalCost)} icon={TrendingDown} />
                <StatCard title="Margen Neto" value={`${netMargin.toFixed(1)}%`} icon={BarChartIcon} />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                {/* Internal KPIs Column */}
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Desglose de Ingresos y Ganancias (Diario)</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="h-80 w-full rounded-md">
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                data={chartData}
                                margin={{
                                    top: 5,
                                    right: 20,
                                    left: -10,
                                    bottom: 5,
                                }}
                                >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis tickFormatter={(value) => `$${value/1000}k`} />
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                <Legend />
                                <Line type="monotone" dataKey="Ingresos" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Ganancias" stroke="#16a34a" strokeWidth={2} dot={false}/>
                                </LineChart>
                            </ResponsiveContainer>
                           </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Card>
                            <CardHeader>
                                <CardTitle>Desglose de Ingresos por Categoría</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-80 w-full rounded-md">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={revenueBreakdown} layout="vertical" margin={{ left: 20, right: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" tickFormatter={(value) => `$${value/1000}k`} />
                                            <YAxis type="category" dataKey="name" width={100} />
                                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                            <Legend />
                                            <Bar dataKey="Ganancia" stackId="a" fill="#16a34a" name="Ganancia" />
                                            <Bar dataKey="Costo" stackId="a" fill="#e2e8f0" name="Costo" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Mapa de Calor de Horas Pico</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <PeakHoursHeatmap data={heatmapData} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Salud del Inventario</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">Valor Total del Inventario</span> <span className="font-bold">{formatCurrency(inventoryValue)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">Rotación de Inventario</span> <span className="font-bold">N/A</span></div>
                                <div>
                                    <p className="text-muted-foreground font-medium">Productos de Baja Rotación</p>
                                     <ul className="text-sm list-disc pl-5 mt-1">
                                        {lowRotationProducts.map((p, index) => (
                                            <li key={`${p.id}-${index}`}>{p.name} <span className="text-muted-foreground">({p.sold} vendidos)</span></li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Análisis de Clientes (CRM)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                 <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Nuevos vs Recurrentes</span> 
                                    <span className="font-bold">{customerAnalysis.new} Nuevos / {customerAnalysis.recurrent} Rec.</span>
                                </div>
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">Ticket Promedio</span> <span className="font-bold">{formatCurrency(averageTicket)}</span></div>
                                <div className="h-24 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={customerAnalysis.chartData} layout="vertical" margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                            <XAxis type="number" hide />
                                            <YAxis type="category" dataKey="name" hide />
                                            <Tooltip formatter={(value, name) => [value, name === 'new' ? 'Nuevos' : 'Recurrentes']} />
                                            <Bar dataKey="value" name="Nuevos" fill="#8884d8" stackId="a" />
                                            <Bar dataKey="value" name="Recurrentes" fill="#82ca9d" stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* External Intelligence Column */}
                 <div className="lg:col-span-1 space-y-6">
                    <InfoWidget icon={Brain} title="Tendencias de Consumo 2025">
                        <p><UserCheck className="inline h-4 w-4 mr-1"/> <span className="font-semibold">Hiper-personalización:</span> Adapta ofertas a historiales de compra.</p>
                        <p><ShieldCheck className="inline h-4 w-4 mr-1"/> <span className="font-semibold">Sostenibilidad:</span> Promociona tus servicios de reparación y productos de segunda mano.</p>
                        <p><Truck className="inline h-4 w-4 mr-1"/> <span className="font-semibold">Inmediatez:</span> Usa WhatsApp para servicio al cliente y ventas rápidas.</p>
                    </InfoWidget>
                     <InfoWidget icon={Landmark} title="Clima Económico y Oportunidades 2025">
                        <p><span className="font-semibold">Nearshoring:</span> El poder adquisitivo está creciendo en zonas industriales. ¿Estás en una?</p>
                        <p><span className="font-semibold">Adopción Digital:</span> Asegura compatibilidad con CoDi, Mercado Pago y otros pagos sin contacto.</p>
                         <p><span className="font-semibold">Ciberseguridad:</span> Comunica la seguridad de tu sistema para generar confianza en tus clientes.</p>
                    </InfoWidget>
                      <InfoWidget icon={Lightbulb} title="Innovación Tecnológica para PYMES 2025">
                        <p><span className="font-semibold">IA Generativa:</span> Usa la IA integrada para crear imágenes y estrategias como un diferenciador clave.</p>
                        <p><span className="font-semibold">Automatización:</span> Analiza las horas pico para optimizar horarios y campañas de marketing.</p>
                         <p><span className="font-semibold">Análisis Predictivo:</span> El siguiente paso es usar tus datos de ventas para predecir la demanda futura.</p>
                    </InfoWidget>
                </div>
            </div>
        </div>
    );
};

export default FinanceDashboard;

    
"use client";

import { useState, useMemo } from "react";
import { Expense, Sale, RepairOrder, Product, FixedAsset } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Download, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import AddExpenseDialog from "./AddExpenseDialog";
import { DollarSign, TrendingUp, TrendingDown, Landmark, FileText, Banknote } from "lucide-react";
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth, format } from "date-fns";
import { DatePickerWithRange } from "./DatePickerWithRange";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssetClient from "./assets/AssetClient";
import BalanceSheetClient from "./balance-sheet/BalanceSheetClient";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ExpenseCategoryClient from "./categories/ExpenseCategoryClient";
import { getExpenseCategories } from "@/lib/services/expenseCategoryService";
import { addExpense } from "@/lib/services/financeService";
import { useToast } from "@/hooks/use-toast";


interface FinanceDashboardProps {
  initialExpenses: Expense[];
  sales: Sale[];
  repairs: RepairOrder[];
  initialAssets: FixedAsset[];
  products: Product[];
}

export default function FinanceDashboard({ initialExpenses, sales, repairs, initialAssets, products }: FinanceDashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isAddExpenseOpen, setAddExpenseOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const pathname = usePathname();
  const { toast } = useToast();

  const handleExpenseAdded = (newExpense: Expense) => {
    setExpenses(prev => [newExpense, ...prev].sort((a,b) => b.paymentDate.getTime() - a.paymentDate.getTime()));
     toast({
        title: "Gasto Registrado",
        description: `Se registró un gasto de $${newExpense.amount.toFixed(2)}.`,
      });
  };
  
  const getCurrentTab = () => {
    if (pathname.includes('/assets')) return 'assets';
    if (pathname.includes('/balance-sheet')) return 'balance-sheet';
    if (pathname.includes('/categories')) return 'categories';
    if (pathname.includes('/cash-history')) return 'cash-history';
    return 'dashboard';
  }

  const filteredData = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to;

    const filteredExpenses = from && to ? expenses.filter(e => e.paymentDate >= from && e.paymentDate <= to) : expenses;
    const filteredSales = from && to ? sales.filter(s => s.createdAt >= from && s.createdAt <= to) : sales;
    const filteredRepairs = from && to ? repairs.filter(r => r.completedAt && r.completedAt >= from && r.completedAt <= to) : repairs;

    return { filteredExpenses, filteredSales, filteredRepairs };
  }, [expenses, sales, repairs, dateRange]);


  const kpis = useMemo(() => {
    const { filteredSales, filteredRepairs, filteredExpenses } = filteredData;
    
    const totalRevenueFromSales = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalRevenueFromRepairs = filteredRepairs.reduce((sum, repair) => sum + repair.totalPrice, 0);
    const totalRevenue = totalRevenueFromSales + totalRevenueFromRepairs;

    const totalOperatingExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Note: A more accurate COGS would require fetching product cost at time of sale from logs.
    // This is a simplified calculation.
    const cogs = 0; // Placeholder for now.
    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - totalOperatingExpenses;

    return { totalRevenue, grossProfit, totalOperatingExpenses, netProfit };
  }, [filteredData]);
  
  const inventoryValue = products.reduce((total, p) => total + (p.stock * p.cost), 0);
  const fixedAssetsValue = initialAssets.reduce((total, a) => total + a.currentValue, 0);


  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Financiero</h1>
         <div className="flex items-center gap-2">
           {getCurrentTab() === 'dashboard' && <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />}
          <Button onClick={() => setAddExpenseOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Registrar Gasto
          </Button>
        </div>
      </div>
      
      <Tabs value={getCurrentTab()}>
        <TabsList className="mb-4 grid grid-cols-2 sm:grid-cols-5 h-auto">
          <TabsTrigger value="dashboard" asChild><Link href="/admin/finance">Dashboard</Link></TabsTrigger>
          <TabsTrigger value="assets" asChild><Link href="/admin/finance/assets">Activos Fijos</Link></TabsTrigger>
          <TabsTrigger value="balance-sheet" asChild><Link href="/admin/finance/balance-sheet">Balance General</Link></TabsTrigger>
          <TabsTrigger value="categories" asChild><Link href="/admin/finance/categories">Categorías</Link></TabsTrigger>
          <TabsTrigger value="cash-history" asChild><Link href="/admin/finance/cash-history">Cortes de Caja</Link></TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${kpis.totalRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Ventas y reparaciones en el período</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilidad Bruta</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${kpis.grossProfit.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Ingresos menos costo de productos (simple)</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gastos Operativos</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${kpis.totalOperatingExpenses.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Renta, sueldos, servicios, etc.</p>
                </CardContent>
                </Card>
                <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${kpis.netProfit.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">La ganancia real del período</p>
                </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                <CardTitle>Gastos Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                <ScrollArea className="h-[calc(100vh-520px)] w-full">
                    <div className="relative w-full overflow-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.filteredExpenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{format(expense.paymentDate, "dd MMM yyyy", { locale: es })}</TableCell>
                                    <TableCell className="font-medium max-w-xs truncate">{expense.description}</TableCell>
                                    <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                                    <TableCell className="text-right font-semibold">${expense.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        {expense.receiptUrl && (
                                            <Button asChild variant="outline" size="sm">
                                                <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">
                                                    Ver Recibo
                                                </a>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>
        {/* The content for these tabs is managed by their respective pages */}
      </Tabs>
      
      <AddExpenseDialog
        isOpen={isAddExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        onExpenseAdded={handleExpenseAdded}
      />
    </>
  );
}

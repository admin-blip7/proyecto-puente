"use client";

import { useState, useMemo } from "react";
import { Expense, Sale, RepairOrder } from "@/types";
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
import { DollarSign, TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth, format } from "date-fns";
import { DatePickerWithRange } from "./DatePickerWithRange";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface FinanceDashboardProps {
  initialExpenses: Expense[];
  sales: Sale[];
  repairs: RepairOrder[];
}

export default function FinanceDashboard({ initialExpenses, sales, repairs }: FinanceDashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isAddExpenseOpen, setAddExpenseOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const handleExpenseAdded = (newExpense: Expense) => {
    setExpenses(prev => [newExpense, ...prev].sort((a,b) => b.paymentDate.getTime() - a.paymentDate.getTime()));
  };

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


  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Financiero</h1>
         <div className="flex items-center gap-2">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button onClick={() => setAddExpenseOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Registrar Gasto
          </Button>
        </div>
      </div>
      
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
          <ScrollArea className="h-[calc(100vh-450px)] w-full">
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
      
      <AddExpenseDialog
        isOpen={isAddExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        onExpenseAdded={handleExpenseAdded}
      />
    </>
  );
}

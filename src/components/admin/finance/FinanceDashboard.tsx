"use client";

import { useState, useMemo, FC } from "react";
import { Expense, Sale, RepairOrder, Product, Consignor, ConsignorPayment, CashSession, Account } from "@/types";
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
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Landmark, Scale, MinusCircle, PlusCircle, Package, Wallet, Banknote, ArrowRightLeft } from "lucide-react";
import StatCard from "./StatCard";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import AddExpenseDialog from "./AddExpenseDialog";
import { addExpense } from "@/lib/services/financeService";
import { useToast } from "@/hooks/use-toast";

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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const getAccountIcon = (type: Account['type']) => {
    switch (type) {
        case 'Banco': return <Landmark className="h-6 w-6 text-muted-foreground" />;
        case 'Efectivo': return <Banknote className="h-6 w-6 text-muted-foreground" />;
        case 'Billetera Digital': return <Wallet className="h-6 w-6 text-muted-foreground" />;
        default: return <DollarSign className="h-6 w-6 text-muted-foreground" />;
    }
}

const FinanceDashboard: FC<FinanceDashboardProps> = ({
    initialExpenses,
    initialSales,
    initialRepairs,
    initialProducts,
    initialConsignors,
    initialConsignorPayments,
    initialCashSessions,
    initialAccounts,
}) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });
    const [accounts, setAccounts] = useState(initialAccounts);
    const [expenses, setExpenses] = useState(initialExpenses);
    const [isExpenseDialogOpen, setExpenseDialogOpen] = useState(false);
    const { toast } = useToast();

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
    
    const handleExpenseAdded = (newExpense: Expense) => {
        setExpenses(prev => [newExpense, ...prev]);
        // Optimistically update account balance
        setAccounts(prev => prev.map(acc => 
            acc.id === newExpense.paidFromAccountId 
                ? { ...acc, currentBalance: acc.currentBalance - newExpense.amount }
                : acc
        ));
    }

    const totalLiquidity = useMemo(() => accounts.reduce((sum, acc) => sum + acc.currentBalance, 0), [accounts]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                 <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Centro de Control de Negocios</h1>
                    <p className="text-muted-foreground">Una vista completa de la salud financiera de tu empresa.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setExpenseDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        Registrar Gasto
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Liquidez Total" value={formatCurrency(totalLiquidity)} icon={Wallet} isPrimary/>
                <StatCard title="Deudas Totales" value={formatCurrency(0)} icon={Scale} />
                <StatCard title="Ganancia Neta (Mes)" value={formatCurrency(0)} icon={TrendingUp} />
                <StatCard title="Gastos (Mes)" value={formatCurrency(0)} icon={TrendingDown} />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Accounts Section */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Cuentas</CardTitle>
                            <CardDescription>El dinero disponible en tus cuentas de banco, efectivo y digitales.</CardDescription>
                        </div>
                        <Button asChild variant="outline">
                            <Link href="/admin/finance/accounts"><ArrowRightLeft className="mr-2 h-4 w-4" />Gestionar</Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cuenta</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Saldo Actual</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                               {accounts.map(account => (
                                 <TableRow key={account.id}>
                                    <TableCell className="font-medium flex items-center gap-3">
                                        {getAccountIcon(account.type)}
                                        {account.name}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{account.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-lg">{formatCurrency(account.currentBalance)}</TableCell>
                                 </TableRow>
                               ))}
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
                                <span className="font-bold text-lg">N/A</span>
                           </div>
                           <div className="flex justify-between items-center">
                                <span className="font-medium text-muted-foreground">Margen de Utilidad Neta</span>
                                <span className="font-bold text-lg">N/A</span>
                           </div>
                           <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Package />
                                        <span className="font-medium">Valor del Inventario</span>
                                    </div>
                                    <span className="font-bold text-lg">N/A</span>
                                </div>
                                 <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2 text-muted-foreground">
                                        <Scale />
                                        <span className="font-medium">Deuda con Consignadores</span>
                                    </div>
                                    <span className="font-bold text-lg">N/A</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
             <AddExpenseDialog 
                isOpen={isExpenseDialogOpen}
                onOpenChange={setExpenseDialogOpen}
                onExpenseAdded={handleExpenseAdded}
            />
        </div>
    );
};

export default FinanceDashboard;

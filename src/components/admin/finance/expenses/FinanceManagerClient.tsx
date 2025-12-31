"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/hooks";
import { Expense, Account, ExpenseCategory, Income, IncomeCategory, Transfer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { DateRange } from "react-day-picker";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Wallet,
    Calendar as CalendarIcon,
    ChevronDown,
    PlusCircle,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    ShoppingCart,
    Car,
    Home,
    Briefcase,
    Film,
    MoreHorizontal,
    CreditCard,
    ArrowLeft,
    ArrowRightLeft,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AddExpenseDialog from "../AddExpenseDialog";
import AddIncomeDialog from "../income/AddIncomeDialog";
import AddTransferDialog from "../transfers/AddTransferDialog";
import AccountTransactionsDialog from "../accounts/AccountTransactionsDialog";

interface FinanceManagerClientProps {
    initialExpenses: Expense[];
    initialIncomes: Income[];
    initialTransfers: Transfer[];
    initialAccounts: Account[];
    initialExpenseCategories: ExpenseCategory[];
    initialIncomeCategories: IncomeCategory[];
}

export default function FinanceManagerClient({
    initialExpenses,
    initialIncomes,
    initialTransfers,
    initialAccounts,
    initialExpenseCategories,
    initialIncomeCategories
}: FinanceManagerClientProps) {
    const { userProfile } = useAuth();
    const { toast } = useToast();

    // Data State
    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
    const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
    const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);
    const [accounts, setAccounts] = useState<Account[]>(initialAccounts);

    // Account Dialog State
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [isAccountTransactionsOpen, setIsAccountTransactionsOpen] = useState(false);

    // Date Filter State - Default to current month
    const [date, setDate] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    // Dialog States
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
    const [isAddTransferOpen, setIsAddTransferOpen] = useState(false);

    // Filtered Data
    const filteredExpenses = useMemo(() => {
        if (!date?.from) return expenses;
        const from = date.from;
        const to = date.to || date.from;
        return expenses.filter(e => isWithinInterval(new Date(e.paymentDate), { start: from, end: to }));
    }, [expenses, date]);

    const filteredIncomes = useMemo(() => {
        if (!date?.from) return incomes;
        const from = date.from;
        const to = date.to || date.from;
        return incomes.filter(i => isWithinInterval(new Date(i.paymentDate), { start: from, end: to }));
    }, [incomes, date]);

    // Calculations based on FILTERED data
    const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0), [filteredExpenses]);
    const totalIncomes = useMemo(() => filteredIncomes.reduce((sum, item) => sum + (item.amount || 0), 0), [filteredIncomes]);
    const periodBalance = useMemo(() => totalIncomes - totalExpenses, [totalIncomes, totalExpenses]);

    // Donut Chart Calculations of Categories (Filtered)
    const expenseCategoriesData = useMemo(() => {
        const categoriesMap = new Map<string, number>();
        filteredExpenses.forEach(e => {
            const current = categoriesMap.get(e.category) || 0;
            categoriesMap.set(e.category, current + e.amount);
        });

        const total = totalExpenses > 0 ? totalExpenses : 1;
        const data = Array.from(categoriesMap.entries())
            .map(([name, value]) => ({
                name,
                value,
                percentage: Math.round((value / total) * 100)
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 4);

        return data;
    }, [filteredExpenses, totalExpenses]);

    // Combined Transactions (Filtered)
    const recentTransactions = useMemo(() => {
        const combined = [
            ...filteredExpenses.map(e => ({ ...e, type: 'expense' as const, date: new Date(e.paymentDate) })),
            ...filteredIncomes.map(i => ({ ...i, type: 'income' as const, date: new Date(i.paymentDate) })),
        ].sort((a, b) => b.date.getTime() - a.date.getTime());

        return combined;
    }, [filteredExpenses, filteredIncomes]);


    // Handlers
    const handleExpenseAdded = (newExpense: Expense) => {
        setExpenses(prev => [newExpense, ...prev]);
        setAccounts(prev => prev.map(acc => {
            if (acc.id === newExpense.paidFromAccountId) {
                return { ...acc, currentBalance: acc.currentBalance - newExpense.amount };
            }
            return acc;
        }));
    };

    const handleIncomeAdded = (newIncome: Income) => {
        setIncomes(prev => [newIncome, ...prev]);
        setAccounts(prev => prev.map(acc => {
            if (acc.id === newIncome.destinationAccountId) {
                return { ...acc, currentBalance: acc.currentBalance + newIncome.amount };
            }
            return acc;
        }));
    };

    const handleTransferAdded = (newTransfer: Transfer) => {
        setTransfers(prev => [newTransfer, ...prev]);
        setAccounts(prev => prev.map(acc => {
            if (acc.id === newTransfer.sourceAccountId) return { ...acc, currentBalance: acc.currentBalance - newTransfer.amount };
            if (acc.id === newTransfer.destinationAccountId) return { ...acc, currentBalance: acc.currentBalance + newTransfer.amount };
            return acc;
        }));
    };

    // Helper for icons
    const getCategoryIcon = (category: string) => {
        const lower = category ? category.toLowerCase() : "";
        if (lower.includes('comida') || lower.includes('food')) return <ShoppingCart className="text-[20px]" />;
        if (lower.includes('transporte') || lower.includes('uber') || lower.includes('gasolina')) return <Car className="text-[20px]" />;
        if (lower.includes('renta') || lower.includes('casa')) return <Home className="text-[20px]" />;
        if (lower.includes('ingreso') || lower.includes('salary')) return <Briefcase className="text-[20px]" />;
        if (lower.includes('entretenimiento') || lower.includes('netflix')) return <Film className="text-[20px]" />;
        return <CreditCard className="text-[20px]" />;
    };

    const getCategoryColor = (index: number) => {
        const colors = ['bg-violet-500', 'bg-emerald-500', 'bg-pink-500', 'bg-orange-500'];
        return colors[index % colors.length];
    };

    const getCategoryShadow = (index: number) => {
        const shadows = ['shadow-[0_0_8px_rgba(139,92,246,0.5)]', 'shadow-[0_0_8px_rgba(16,185,129,0.5)]', 'shadow-[0_0_8px_rgba(236,72,153,0.5)]', 'shadow-[0_0_8px_rgba(249,115,22,0.5)]'];
        return shadows[index % shadows.length];
    }

    const getAccountGradient = (index: number) => {
        const gradients = [
            'bg-gradient-to-br from-violet-600 to-indigo-600',
            'bg-gradient-to-br from-emerald-500 to-teal-600',
            'bg-gradient-to-br from-blue-500 to-cyan-500',
            'bg-gradient-to-br from-pink-500 to-rose-500',
            'bg-gradient-to-br from-amber-500 to-orange-600',
            'bg-gradient-to-br from-fuchsia-600 to-purple-600'
        ];
        return gradients[index % gradients.length];
    };


    return (
        <div className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary/20 selection:text-primary p-4 md:p-8">

            {/* Header */}
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    </Link>
                    <div className="flex flex-col justify-center">
                        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
                        <p className="text-muted-foreground">Resumen de tus finanzas</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 self-end md:self-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-[260px] justify-start text-left font-normal bg-card border-border",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                            {format(date.to, "LLL dd, y", { locale: es })}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y", { locale: es })
                                    )
                                ) : (
                                    <span>Seleccionar fechas</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={setDate}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-[1200px] mx-auto flex flex-col gap-8">

                {/* Welcome Banner */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-3 rounded-2xl bg-gradient-to-br from-primary to-blue-500 shadow-xl shadow-blue-500/20 text-primary-foreground p-8 relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-full bg-white/10 skew-x-12 translate-x-20"></div>
                        <div className="absolute right-20 top-0 w-32 h-full bg-white/5 skew-x-12 translate-x-10"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                            <div>
                                <h2 className="text-3xl font-bold mb-2">¡Hola de nuevo!</h2>
                                <p className="text-blue-100 max-w-lg leading-relaxed opacity-90">
                                    Mostrando {recentTransactions.length} transacciones {date?.from ? 'del periodo seleccionado' : 'recientes'}.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsAddIncomeOpen(true)}
                                    className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2 backdrop-blur-sm"
                                >
                                    <PlusCircle className="h-5 w-5" />
                                    Ingreso
                                </button>
                                <button
                                    onClick={() => setIsAddExpenseOpen(true)}
                                    className="bg-white text-primary hover:bg-blue-50 font-bold py-3 px-6 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                                >
                                    <PlusCircle className="h-5 w-5" />
                                    Gasto
                                </button>
                                <button
                                    onClick={() => setIsAddTransferOpen(true)}
                                    className="bg-white/10 hover:bg-white/20 text-white font-bold p-3 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center backdrop-blur-sm"
                                    title="Transferir"
                                >
                                    <ArrowRightLeft className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Period Balance */}
                    {/* Period Balance */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-400 text-white p-6 rounded-2xl shadow-lg hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-white/20 rounded-xl text-white">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <Link href="/admin/finance/accounts">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                        <p className="text-sm font-medium text-blue-100 mb-1">Balance del Periodo</p>
                        <h3 className="text-3xl font-bold text-white shadow-sm">{formatCurrency(periodBalance)}</h3>
                    </div>

                    {/* Monthly Income */}
                    {/* Monthly Income */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-400 text-white p-6 rounded-2xl shadow-lg hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-white/20 rounded-xl text-white">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-emerald-100 mb-1">Ingresos</p>
                        <h3 className="text-3xl font-bold text-white shadow-sm">{formatCurrency(totalIncomes)}</h3>
                    </div>

                    {/* Monthly Expenses */}
                    {/* Monthly Expenses */}
                    <div className="bg-gradient-to-br from-rose-500 to-pink-500 text-white p-6 rounded-2xl shadow-lg hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-white/20 rounded-xl text-white">
                                <TrendingDown className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-rose-100 mb-1">Gastos</p>
                        <h3 className="text-3xl font-bold text-white shadow-sm">{formatCurrency(totalExpenses)}</h3>
                    </div>
                </div>

                {/* Accounts Grid */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-foreground">Mis Cuentas</h3>
                        <Link href="/admin/finance/accounts">
                            <Button variant="ghost" className="text-sm font-semibold text-primary hover:text-blue-600 flex items-center gap-1">
                                Gestionar <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {accounts.map((account, index) => (
                            <div
                                key={account.id}
                                onClick={() => {
                                    setSelectedAccount(account);
                                    setIsAccountTransactionsOpen(true);
                                }}
                                className={cn(
                                    "p-6 rounded-2xl shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden",
                                    getAccountGradient(index)
                                )}
                            >
                                {/* Decorative elements */}
                                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="p-2.5 bg-white/20 rounded-xl text-white backdrop-blur-sm">
                                        <Wallet className="h-6 w-6" />
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-white/90 mb-1 relative z-10">{account.name}</p>
                                <h3 className="text-2xl font-bold text-white relative z-10 shadow-sm">{formatCurrency(Number(account.currentBalance))}</h3>
                            </div>
                        ))}
                        {accounts.length === 0 && (
                            <div className="col-span-full text-center py-8 text-slate-500">No hay cuentas registradas.</div>
                        )}
                    </div>
                </div>

                {/* Main Content Grid: Transactions & Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Transactions Table (2/3 width) */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground">Transacciones</h3>
                        </div>
                        <div className="bg-card text-card-foreground rounded-2xl shadow-soft border border-border overflow-hidden max-h-[800px] overflow-y-auto">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-muted/50 sticky top-0 backdrop-blur-sm z-10">
                                        <tr className="text-xs font-semibold tracking-wide text-muted-foreground uppercase border-b border-border">
                                            <th className="px-6 py-4">Transacción</th>
                                            <th className="px-6 py-4 whitespace-nowrap">Fecha</th>
                                            <th className="px-6 py-4">Categoría</th>
                                            <th className="px-6 py-4 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {recentTransactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No hay transacciones en este periodo.</td>
                                            </tr>
                                        ) : (
                                            recentTransactions.map((tx, idx) => (
                                                <tr key={`${tx.type}-${tx.id}`} className="group hover:bg-muted/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn("size-10 rounded-full flex items-center justify-center shrink-0",
                                                                tx.type === 'income' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                                                                    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                                            )}>
                                                                {getCategoryIcon(tx.category)}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-foreground text-sm">{tx.description}</p>
                                                                <p className="text-xs text-muted-foreground capitalize">{tx.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(tx.paymentDate), "dd MMM, yyyy", { locale: es })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                            {tx.category}
                                                        </span>
                                                    </td>
                                                    <td className={cn("px-6 py-4 text-right font-semibold text-sm",
                                                        tx.type === 'income' ? "text-emerald-600" : "text-foreground"
                                                    )}>
                                                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Expense Breakdown Chart (1/3 width) */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-foreground">Gastos por Categoría</h3>
                            <button className="text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="bg-card text-card-foreground rounded-2xl shadow-soft border border-border p-6 flex flex-col items-center justify-between h-full min-h-[400px]">
                            <div className="relative size-56 mt-4 flex items-center justify-center">
                                {/* Chart */}
                                <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                                    <circle className="dark:stroke-slate-800" cx="50" cy="50" fill="transparent" r="40" stroke="#f1f5f9" strokeWidth="10"></circle>
                                    {expenseCategoriesData.map((cat, i) => {
                                        const C = 251.2;
                                        const strokeLength = (cat.percentage / 100) * C;
                                        const colors = ["#8b5cf6", "#10b981", "#ec4899", "#f97316"];
                                        if (i === 0) return (
                                            <circle key={cat.name} className="drop-shadow-sm" cx="50" cy="50" fill="transparent" r="40"
                                                stroke={colors[i]} strokeDasharray={`${strokeLength} ${C}`} strokeLinecap="round" strokeWidth="10"
                                            />
                                        );
                                        return null;
                                    })}
                                    {expenseCategoriesData.length === 0 && (
                                        <circle className="drop-shadow-sm" cx="50" cy="50" fill="transparent" r="40" stroke="#e2e8f0" strokeDasharray="251.2 251.2" strokeWidth="10"></circle>
                                    )}
                                </svg>

                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-sm text-muted-foreground font-medium">Total Gastado</span>
                                    <span className="text-2xl font-bold text-foreground tracking-tight">{formatCurrency(totalExpenses)}</span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="w-full flex flex-col gap-4 mt-8">
                                {expenseCategoriesData.map((cat, i) => (
                                    <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-default">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("size-3 rounded-full", getCategoryColor(i), getCategoryShadow(i))}></div>
                                            <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-bold text-foreground">{cat.percentage}%</span>
                                            <span className="text-xs text-muted-foreground">{formatCurrency(cat.value)}</span>
                                        </div>
                                    </div>
                                ))}
                                {expenseCategoriesData.length === 0 && <p className="text-center text-muted-foreground text-sm">No hay datos de gastos</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <AddExpenseDialog
                isOpen={isAddExpenseOpen}
                onOpenChange={setIsAddExpenseOpen}
                onExpenseAdded={handleExpenseAdded}
            />

            <AddIncomeDialog
                isOpen={isAddIncomeOpen}
                onOpenChange={setIsAddIncomeOpen}
                onIncomeAdded={handleIncomeAdded}
            />

            <AddTransferDialog
                isOpen={isAddTransferOpen}
                onOpenChange={setIsAddTransferOpen}
                onTransferAdded={handleTransferAdded}
            />

            <AccountTransactionsDialog
                isOpen={isAccountTransactionsOpen}
                onOpenChange={setIsAccountTransactionsOpen}
                account={selectedAccount}
            />
        </div>
    );
}

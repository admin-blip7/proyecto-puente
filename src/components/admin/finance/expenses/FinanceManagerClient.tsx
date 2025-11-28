"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/hooks";
import { Expense, Account, ExpenseCategory, Income, IncomeCategory, Transfer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { TrendingDown, TrendingUp, ArrowRightLeft, Plus, Receipt, ArrowUpDown, Trash2, ArrowLeft, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import AddExpenseDialog from "../AddExpenseDialog";
import AddIncomeDialog from "../income/AddIncomeDialog";
import AddTransferDialog from "../transfers/AddTransferDialog";
import { deleteIncome } from "@/lib/services/incomeService";
import { deleteTransfer } from "@/lib/services/transferService";
import { deleteExpense } from "@/lib/services/financeService";

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

    const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
    const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
    const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);
    const [accounts, setAccounts] = useState<Account[]>(initialAccounts);

    // Dialog States
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
    const [isAddTransferOpen, setIsAddTransferOpen] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Calculate totals
    const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + (item.amount || 0), 0), [expenses]);
    const totalIncomes = useMemo(() => incomes.reduce((sum, item) => sum + (item.amount || 0), 0), [incomes]);

    // Sorting Helper
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = <T extends Record<string, any>>(data: T[], dateKey: keyof T) => {
        if (!sortConfig) return data;

        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    };

    const sortedExpenses = useMemo(() => sortedData(expenses, 'paymentDate'), [expenses, sortConfig]);
    const sortedIncomes = useMemo(() => sortedData(incomes, 'paymentDate'), [incomes, sortConfig]);
    const sortedTransfers = useMemo(() => sortedData(transfers, 'transferDate'), [transfers, sortConfig]);

    // Delete Handlers
    const handleDeleteExpense = async (expense: Expense) => {
        if (!confirm("¿Estás seguro de eliminar este gasto? Esta acción revertirá el saldo de la cuenta.")) return;
        try {
            await deleteExpense(expense.id);
            setExpenses(prev => prev.filter(e => e.id !== expense.id));
            // Revert balance locally
            setAccounts(prev => prev.map(acc => {
                if (acc.id === expense.paidFromAccountId || acc.firestore_id === expense.paidFromAccountId) {
                    return { ...acc, currentBalance: Number(acc.currentBalance) + Number(expense.amount) };
                }
                return acc;
            }));
            toast({ title: "Gasto eliminado", description: "El gasto ha sido eliminado correctamente." });
        } catch (error) {
            console.error("Error deleting expense:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el gasto." });
        }
    };

    const handleDeleteIncome = async (income: Income) => {
        if (!confirm("¿Estás seguro de eliminar este ingreso? Esta acción revertirá el saldo de la cuenta.")) return;
        try {
            await deleteIncome(income.id);
            setIncomes(prev => prev.filter(i => i.id !== income.id));
            // Revert balance locally
            setAccounts(prev => prev.map(acc => {
                if (acc.id === income.destinationAccountId || acc.firestore_id === income.destinationAccountId) {
                    return { ...acc, currentBalance: Number(acc.currentBalance) - Number(income.amount) };
                }
                return acc;
            }));
            toast({ title: "Ingreso eliminado", description: "El ingreso ha sido eliminado correctamente." });
        } catch (error) {
            console.error("Error deleting income:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el ingreso." });
        }
    };

    const handleDeleteTransfer = async (transfer: Transfer) => {
        if (!confirm("¿Estás seguro de eliminar esta transferencia? Esta acción revertirá los saldos de las cuentas.")) return;
        try {
            await deleteTransfer(transfer.id);
            setTransfers(prev => prev.filter(t => t.id !== transfer.id));
            // Revert balances locally
            setAccounts(prev => prev.map(acc => {
                if (acc.id === transfer.sourceAccountId || acc.firestore_id === transfer.sourceAccountId) {
                    return { ...acc, currentBalance: Number(acc.currentBalance) + Number(transfer.amount) };
                }
                if (acc.id === transfer.destinationAccountId || acc.firestore_id === transfer.destinationAccountId) {
                    return { ...acc, currentBalance: Number(acc.currentBalance) - Number(transfer.amount) };
                }
                return acc;
            }));
            toast({ title: "Transferencia eliminada", description: "La transferencia ha sido eliminada correctamente." });
        } catch (error) {
            console.error("Error deleting transfer:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la transferencia." });
        }
    };

    // Handlers
    const handleExpenseAdded = (newExpense: Expense) => {
        setExpenses(prev => [newExpense, ...prev]);
        // Update account balance locally
        setAccounts(prev => prev.map(acc => {
            if (acc.id === newExpense.paidFromAccountId || acc.id === newExpense.paidFromAccountId) { // Check ID matching logic
                return { ...acc, currentBalance: acc.currentBalance - newExpense.amount };
            }
            return acc;
        }));
    };

    const handleIncomeAdded = (newIncome: Income) => {
        setIncomes(prev => [newIncome, ...prev]);
        // Update account balance locally
        setAccounts(prev => prev.map(acc => {
            if (acc.id === newIncome.destinationAccountId) {
                return { ...acc, currentBalance: acc.currentBalance + newIncome.amount };
            }
            return acc;
        }));
    };

    const handleTransferAdded = (newTransfer: Transfer) => {
        setTransfers(prev => [newTransfer, ...prev]);
        // Update account balances locally
        setAccounts(prev => prev.map(acc => {
            if (acc.id === newTransfer.sourceAccountId) {
                return { ...acc, currentBalance: acc.currentBalance - newTransfer.amount };
            }
            if (acc.id === newTransfer.destinationAccountId) {
                return { ...acc, currentBalance: acc.currentBalance + newTransfer.amount };
            }
            return acc;
        }));
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <Link href="/admin">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Menú Principal
                    </Button>
                </Link>
                <Link href="/admin/finance/accounts">
                    <Button variant="outline">
                        <CreditCard className="mr-2 h-4 w-4" /> Cuentas
                    </Button>
                </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card className="relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-red-500/5 dark:bg-red-500/10 rounded-full"></div>
                    <CardHeader>
                        <CardTitle className="text-base font-medium text-muted-foreground">Gastos del Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="h-5 w-5 text-red-500" />
                            <p className="text-3xl font-bold">{formatCurrency(totalExpenses)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-green-500/5 dark:bg-green-500/10 rounded-full"></div>
                    <CardHeader>
                        <CardTitle className="text-base font-medium text-muted-foreground">Ingresos del Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <p className="text-3xl font-bold">{formatCurrency(totalIncomes)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                    <div className="absolute -top-8 -right-8 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-full"></div>
                    <CardHeader>
                        <CardTitle className="text-base font-medium text-muted-foreground">Balance Neto</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <p className={cn("text-3xl font-bold", (totalIncomes - totalExpenses) >= 0 ? "text-green-600" : "text-red-600")}>
                                {formatCurrency(totalIncomes - totalExpenses)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="expenses" className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <TabsList className="w-full sm:w-auto flex-wrap h-auto">
                        <TabsTrigger value="expenses" className="flex-1 sm:flex-none">Gastos</TabsTrigger>
                        <TabsTrigger value="incomes" className="flex-1 sm:flex-none">Ingresos</TabsTrigger>
                        <TabsTrigger value="transfers" className="flex-1 sm:flex-none">Transferencias</TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button onClick={() => setIsAddExpenseOpen(true)} size="sm" className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Gasto
                        </Button>
                        <Button onClick={() => setIsAddIncomeOpen(true)} size="sm" className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Ingreso
                        </Button>
                        <Button onClick={() => setIsAddTransferOpen(true)} size="sm" variant="outline" className="w-full sm:w-auto">
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir
                        </Button>
                    </div>
                </div>

                <TabsContent value="expenses" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Gastos</CardTitle>
                            <CardDescription>Registro detallado de gastos operativos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('paymentDate')}>
                                                Fecha <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[200px]" onClick={() => handleSort('description')}>
                                                Descripción <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('category')}>
                                                Categoría <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('amount')}>
                                                Monto <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="hidden md:table-cell">Comprobante</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {expenses.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay gastos registrados.</TableCell>
                                            </TableRow>
                                        ) : (
                                            sortedExpenses.map((expense) => (
                                                <TableRow key={expense.id}>
                                                    <TableCell className="whitespace-nowrap">{format(new Date(expense.paymentDate), "dd MMM, yyyy", { locale: es })}</TableCell>
                                                    <TableCell className="font-medium">{expense.description}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{expense.category}</TableCell>
                                                    <TableCell className="text-right font-bold text-red-600 whitespace-nowrap">-{formatCurrency(expense.amount)}</TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {expense.receiptUrl ? (
                                                            <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                                <Receipt className="h-4 w-4" /> Ver
                                                            </a>
                                                        ) : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="incomes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Ingresos</CardTitle>
                            <CardDescription>Registro de ingresos adicionales.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('paymentDate')}>
                                                Fecha <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[200px]" onClick={() => handleSort('description')}>
                                                Descripción <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('source')}>
                                                Origen <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('category')}>
                                                Categoría <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('amount')}>
                                                Monto <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="hidden md:table-cell">Comprobante</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {incomes.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay ingresos registrados.</TableCell>
                                            </TableRow>
                                        ) : (
                                            sortedIncomes.map((income) => (
                                                <TableRow key={income.id}>
                                                    <TableCell className="whitespace-nowrap">{format(new Date(income.paymentDate), "dd MMM, yyyy", { locale: es })}</TableCell>
                                                    <TableCell className="font-medium">{income.description}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{income.source}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{income.category}</TableCell>
                                                    <TableCell className="text-right font-bold text-green-600 whitespace-nowrap">+{formatCurrency(income.amount)}</TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {income.receiptUrl ? (
                                                            <a href={income.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                                                <Receipt className="h-4 w-4" /> Ver
                                                            </a>
                                                        ) : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteIncome(income)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transfers" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Transferencias</CardTitle>
                            <CardDescription>Movimientos entre cuentas propias.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('transferDate')}>
                                                Fecha <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="cursor-pointer hover:bg-muted/50 min-w-[200px]" onClick={() => handleSort('description')}>
                                                Descripción <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="whitespace-nowrap">Origen</TableHead>
                                            <TableHead className="whitespace-nowrap">Destino</TableHead>
                                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('amount')}>
                                                Monto <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                                            </TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transfers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay transferencias registradas.</TableCell>
                                            </TableRow>
                                        ) : (
                                            sortedTransfers.map((transfer) => {
                                                const sourceAccount = accounts.find(a => a.id === transfer.sourceAccountId || a.id === transfer.sourceAccountId);
                                                const destAccount = accounts.find(a => a.id === transfer.destinationAccountId || a.id === transfer.destinationAccountId);
                                                return (
                                                    <TableRow key={transfer.id}>
                                                        <TableCell className="whitespace-nowrap">{format(new Date(transfer.transferDate), "dd MMM, yyyy", { locale: es })}</TableCell>
                                                        <TableCell className="font-medium">{transfer.description || "Transferencia"}</TableCell>
                                                        <TableCell className="whitespace-nowrap">{sourceAccount?.name || "Cuenta Desconocida"}</TableCell>
                                                        <TableCell className="whitespace-nowrap">{destAccount?.name || "Cuenta Desconocida"}</TableCell>
                                                        <TableCell className="text-right font-bold whitespace-nowrap">{formatCurrency(transfer.amount)}</TableCell>
                                                        <TableCell>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTransfer(transfer)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

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
        </div>
    );
}



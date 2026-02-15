
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Account } from "@/types";
import { getAccountTransactions, AccountTransaction } from "@/lib/services/financeService";
import { Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/appPreferences";

interface AccountTransactionsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    account: Account | null;
}

export default function AccountTransactionsDialog({ isOpen, onOpenChange, account }: AccountTransactionsDialogProps) {
    const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && account) {
            setLoading(true);
            getAccountTransactions(account.id)
                .then(setTransactions)
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setTransactions([]);
        }
    }, [isOpen, account]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Historial de Movimientos</DialogTitle>
                    <DialogDescription>
                        Movimientos recientes para la cuenta <span className="font-semibold">{account?.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay movimientos registrados para esta cuenta.
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px] rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx, index) => (
                                        <TableRow key={tx.id || `tx-${index}-${tx.date}`}>
                                            <TableCell className="whitespace-nowrap">
                                                {format(new Date(tx.date), "dd MMM yyyy", { locale: getDateFnsLocale() })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {tx.type === 'income' ? (
                                                        <ArrowUpCircle className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <ArrowDownCircle className="h-4 w-4 text-red-500" />
                                                    )}
                                                    <span className={tx.type === 'income' ? "text-green-600" : "text-red-600"}>
                                                        {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-normal">
                                                    {tx.category || 'General'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-mono ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState } from "react";
import { Account } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, MoreHorizontal, Landmark, Wallet, Banknote, Trash2 } from "lucide-react";
import { deleteAccount } from "@/lib/services/accountService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import AddEditAccountDialog from "./AddEditAccountDialog";
import AccountTransactionsDialog from "./AccountTransactionsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { History } from "lucide-react";

interface AccountsClientProps {
  initialAccounts: Account[];
}

export default function AccountsClient({ initialAccounts }: AccountsClientProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isAddEditOpen, setAddEditOpen] = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);

  const handleOpenAddDialog = () => {
    setSelectedAccount(null);
    setAddEditOpen(true);
  };

  const handleOpenEditDialog = (e: React.MouseEvent, account: Account) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedAccount(account);
    setAddEditOpen(true);
  };

  const handleOpenHistoryDialog = (e: React.MouseEvent, account: Account) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedAccount(account);
    setHistoryOpen(true);
  };

  const handleAccountAdded = (newAccount: Account) => {
    setAccounts(prev => [newAccount, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleAccountUpdated = (updatedAccount: Account) => {
    setAccounts(prev => prev.map(a => (a.id === updatedAccount.id ? updatedAccount : a)));
  };

  const handleDeleteAccount = async (account: Account) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la cuenta "${account.name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteAccount(account.id);
        setAccounts(prev => prev.filter(a => a.id !== account.id));
      } catch (error) {
        console.error("Error deleting account:", error);
        alert("Hubo un error al eliminar la cuenta.");
      }
    }
  };

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'Banco': return <Landmark className="h-5 w-5 text-muted-foreground" />;
      case 'Efectivo': return <Banknote className="h-5 w-5 text-muted-foreground" />;
      case 'Billetera Digital': return <Wallet className="h-5 w-5 text-muted-foreground" />;
      default: return <Landmark className="h-5 w-5 text-muted-foreground" />;
    }
  }


  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Cuentas</h1>
          <p className="text-muted-foreground">Administra tus cuentas de banco, efectivo y billeteras digitales.</p>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Cuenta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Cuentas</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-250px)] w-full">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre de la Cuenta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Saldo Actual</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium flex items-center gap-3">
                        {getAccountIcon(account.type)}
                        {account.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg">{formatCurrency(account.currentBalance ?? 0)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <div
                                className="flex items-center w-full"
                                onClick={(e) => handleOpenHistoryDialog(e, account)}
                              >
                                <History className="mr-2 h-4 w-4" />
                                <span>Ver Movimientos</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <div
                                className="flex items-center w-full"
                                onClick={(e) => handleOpenEditDialog(e, account)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <div
                                className="flex items-center w-full text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAccount(account);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Eliminar</span>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AddEditAccountDialog
        isOpen={isAddEditOpen}
        onOpenChange={setAddEditOpen}
        account={selectedAccount}
        onAccountAdded={handleAccountAdded}
        onAccountUpdated={handleAccountUpdated}
      />

      <AccountTransactionsDialog
        isOpen={isHistoryOpen}
        onOpenChange={setHistoryOpen}
        account={selectedAccount}
      />
    </>
  );
}

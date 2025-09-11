"use client"

import { useState } from 'react';
import { Debt, Account } from '@/types';
import { Button } from '@/components/ui/button';
import { BrainCircuit, CreditCard, Landmark, MoreHorizontal, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import DebtStrategyDialog from './DebtStrategyDialog';
import AddEditDebtDialog from './AddEditDebtDialog';
import DeleteDebtDialog from './DeleteDebtDialog';

interface DebtClientProps {
    initialDebts: Debt[];
    initialAccounts: Account[];
}

export default function DebtClient({ initialDebts, initialAccounts }: DebtClientProps) {
    const [debts, setDebts] = useState<Debt[]>(initialDebts);
    const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
    const [isStrategyOpen, setStrategyOpen] = useState(false);
    const [isAddEditOpen, setAddEditOpen] = useState(false);
    const [isDeleteOpen, setDeleteOpen] = useState(false);

    const totalDebt = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
    const creditCardDebts = debts.filter(d => d.debtType === 'Tarjeta de Crédito');
    const otherDebts = debts.filter(d => d.debtType !== 'Tarjeta de Crédito');

    const handleOpenAddDialog = () => {
        setSelectedDebt(null);
        setAddEditOpen(true);
    }
    
    const handleOpenEditDialog = (debt: Debt) => {
        setSelectedDebt(debt);
        setAddEditOpen(true);
    }

    const handleOpenDeleteDialog = (debt: Debt) => {
        setSelectedDebt(debt);
        setDeleteOpen(true);
    }
    
    const handleDebtAdded = (newDebt: Debt) => {
        setDebts(prev => [...prev, newDebt].sort((a,b) => a.creditorName.localeCompare(b.creditorName)));
    }

    const handleDebtUpdated = (updatedDebt: Debt) => {
        setDebts(prev => prev.map(d => d.id === updatedDebt.id ? updatedDebt : d));
    }
    
    const handleDebtDeleted = (debtId: string) => {
        setDebts(prev => prev.filter(d => d.id !== debtId));
    }


    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestión de Deudas</h1>
                    <p className="text-muted-foreground">Administra tus tarjetas de crédito, préstamos y otras deudas.</p>
                </div>
                <div className='flex items-center gap-2'>
                     <Button variant="outline" onClick={() => setStrategyOpen(true)} disabled={creditCardDebts.length === 0}>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        Generar Estrategia
                    </Button>
                    <Button onClick={handleOpenAddDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Deuda
                    </Button>
                </div>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Deuda Total</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">${totalDebt.toFixed(2)}</p>
                </CardContent>
            </Card>

            <div className='space-y-6'>
                <div>
                    <h2 className="text-xl font-semibold mb-2">Tarjetas de Crédito</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {creditCardDebts.map(debt => {
                            const usage = debt.totalLimit ? (debt.currentBalance / debt.totalLimit) * 100 : 0;
                            return (
                                <Card key={debt.id}>
                                    <CardHeader className='flex-row items-center justify-between pb-2'>
                                        <CardTitle className='text-lg'>{debt.creditorName}</CardTitle>
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Registrar Pago</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenEditDialog(debt)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Editar</span>
                                                </DropdownMenuItem>
                                                 <DropdownMenuItem onClick={() => handleOpenDeleteDialog(debt)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Eliminar</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardHeader>
                                    <CardContent className='space-y-3'>
                                        <div className='text-2xl font-mono'>${debt.currentBalance.toFixed(2)}</div>
                                        {debt.totalLimit && (
                                            <div>
                                                <div className='flex justify-between text-xs text-muted-foreground mb-1'>
                                                    <span>Límite: ${debt.totalLimit.toFixed(2)}</span>
                                                    <span>Uso: {usage.toFixed(1)}%</span>
                                                </div>
                                                <Progress value={usage} />
                                            </div>
                                        )}
                                        <div className='flex justify-between text-xs pt-2 border-t'>
                                            <span>Corte: Día {debt.closingDate}</span>
                                            <span>Pago: Día {debt.paymentDueDate}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>

                 <div>
                    <h2 className="text-xl font-semibold mb-2">Otros Préstamos y Deudas</h2>
                     <Card>
                        <CardContent className='p-0'>
                            {otherDebts.map(debt => (
                                <div key={debt.id} className='flex items-center justify-between p-4 border-b last:border-b-0'>
                                    <div>
                                        <p className='font-semibold'>{debt.creditorName}</p>
                                        <p className='text-sm text-muted-foreground'>{debt.debtType}</p>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <p className='font-semibold text-lg'>${debt.currentBalance.toFixed(2)}</p>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Registrar Pago</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenEditDialog(debt)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    <span>Editar</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenDeleteDialog(debt)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Eliminar</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                     </Card>
                </div>
            </div>
            
            <DebtStrategyDialog 
                isOpen={isStrategyOpen}
                onOpenChange={setStrategyOpen}
                debts={creditCardDebts}
            />

            <AddEditDebtDialog
                isOpen={isAddEditOpen}
                onOpenChange={setAddEditOpen}
                debt={selectedDebt}
                onDebtAdded={handleDebtAdded}
                onDebtUpdated={handleDebtUpdated}
            />

            {selectedDebt && (
                <DeleteDebtDialog
                    isOpen={isDeleteOpen}
                    onOpenChange={setDeleteOpen}
                    debt={selectedDebt}
                    onDebtDeleted={handleDebtDeleted}
                />
            )}
        </>
    )
}

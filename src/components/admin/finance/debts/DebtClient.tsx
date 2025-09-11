"use client"

import { useState } from 'react';
import { Debt, Account } from '@/types';
import { Button } from '@/components/ui/button';
import { BrainCircuit, CreditCard, Landmark, MoreHorizontal, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import DebtStrategyDialog from './DebtStrategyDialog';

interface DebtClientProps {
    initialDebts: Debt[];
    initialAccounts: Account[];
}

export default function DebtClient({ initialDebts, initialAccounts }: DebtClientProps) {
    const [debts, setDebts] = useState<Debt[]>(initialDebts);
    const [isStrategyOpen, setStrategyOpen] = useState(false);

    const totalDebt = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
    const creditCardDebts = debts.filter(d => d.debtType === 'Tarjeta de Crédito');
    const otherDebts = debts.filter(d => d.debtType !== 'Tarjeta de Crédito');


    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestión de Deudas</h1>
                    <p className="text-muted-foreground">Administra tus tarjetas de crédito, préstamos y otras deudas.</p>
                </div>
                <div className='flex items-center gap-2'>
                     <Button variant="outline" onClick={() => setStrategyOpen(true)}>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        Generar Estrategia de Pago
                    </Button>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Registrar Nueva Deuda
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
                                    <CardHeader className='flex-row items-center justify-between'>
                                        <CardTitle className='text-lg'>{debt.creditorName}</CardTitle>
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>Pagar</DropdownMenuItem>
                                                <DropdownMenuItem>Editar</DropdownMenuItem>
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
                                    <div className='text-right'>
                                        <p className='font-semibold text-lg'>${debt.currentBalance.toFixed(2)}</p>
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
        </>
    )
}

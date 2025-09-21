"use client";

import { useState } from "react";
import { ClientProfile, Account } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, DollarSign, FileText, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getCreditStatusVariant } from "@/lib/utils";
import AddEditClientDialog from "./AddEditClientDialog";
import AddCreditPaymentDialog from "./AddCreditPaymentDialog";
import PaymentPlanDialog from "./PaymentPlanDialog";
import GenerateContractDialog from "./GenerateContractDialog";

interface CreditClientProps {
    initialClients: ClientProfile[];
    initialAccounts: Account[];
}

export default function CreditClient({ initialClients, initialAccounts }: CreditClientProps) {
    const [clients, setClients] = useState<ClientProfile[]>(initialClients);
    const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
    const [isAddEditOpen, setAddEditOpen] = useState(false);
    const [isPaymentOpen, setPaymentOpen] = useState(false);
    const [isPlanOpen, setPlanOpen] = useState(false);
    const [isContractOpen, setContractOpen] = useState(false);

    const handleOpenAddDialog = () => {
        setSelectedClient(null);
        setAddEditOpen(true);
    };
    
    const handleOpenEditDialog = (client: ClientProfile) => {
        setSelectedClient(client);
        setAddEditOpen(true);
    };
    
    const handleOpenPaymentDialog = (client: ClientProfile) => {
        setSelectedClient(client);
        setPaymentOpen(true);
    }

    const handleOpenPlanDialog = (client: ClientProfile) => {
        setSelectedClient(client);
        setPlanOpen(true);
    }
    
    const handleOpenContractDialog = (client: ClientProfile) => {
        setSelectedClient(client);
        setContractOpen(true);
    }

    const handleClientAdded = (newClient: ClientProfile) => {
        setClients(prev => [...prev, newClient].sort((a,b) => a.name.localeCompare(b.name)));
    };
    
    const handleClientUpdated = (updatedClient: ClientProfile) => {
        setClients(prev => prev.map(c => (c.id === updatedClient.id ? updatedClient : c)));
    };

    const handlePaymentAdded = (clientId: string, amount: number) => {
        setClients(prev => prev.map(c => {
            if (c.id === clientId && c.creditAccount) {
                return {
                    ...c,
                    creditAccount: {
                        ...c.creditAccount,
                        currentBalance: c.creditAccount.currentBalance - amount
                    }
                }
            }
            return c;
        }));
    }

    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Crédito y Cobranza</h1>
                    <p className="text-muted-foreground">Administra tus clientes a crédito, saldos y pagos.</p>
                </div>
                <Button onClick={handleOpenAddDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Cliente a Crédito
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Clientes a Crédito</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead className="text-right">Límite Crédito</TableHead>
                                    <TableHead className="text-right">Saldo Actual</TableHead>
                                    <TableHead className="text-center">Tasa Interés</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.name}</TableCell>
                                        <TableCell>{client.phone}</TableCell>
                                        <TableCell className="text-right">${client.creditAccount?.creditLimit.toFixed(2) ?? 'N/A'}</TableCell>
                                        <TableCell className="text-right font-semibold">${client.creditAccount?.currentBalance.toFixed(2) ?? 'N/A'}</TableCell>
                                        <TableCell className="text-center">{client.creditAccount?.interestRate ? `${client.creditAccount.interestRate}%` : 'N/A'}</TableCell>
                                        <TableCell className="text-center">
                                            {client.creditAccount && (
                                                <Badge variant={getCreditStatusVariant(client.creditAccount.status)}>
                                                    {client.creditAccount.status}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                     <DropdownMenuItem onClick={() => handleOpenPaymentDialog(client)}>
                                                        <DollarSign className="mr-2 h-4 w-4" />
                                                        <span>Registrar Abono</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenPlanDialog(client)} disabled={!client.creditAccount || !client.creditAccount.interestRate}>
                                                        <BarChart className="mr-2 h-4 w-4" />
                                                        <span>Generar Plan de Pagos</span>
                                                    </DropdownMenuItem>
                                                     <DropdownMenuItem onClick={() => handleOpenContractDialog(client)} disabled={!client.creditAccount}>
                                                        <FileText className="mr-2 h-4 w-4" />
                                                        <span>Generar Contrato</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenEditDialog(client)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        <span>Editar Cliente</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AddEditClientDialog 
                isOpen={isAddEditOpen}
                onOpenChange={setAddEditOpen}
                client={selectedClient}
                onClientAdded={handleClientAdded}
                onClientUpdated={handleClientUpdated}
            />

            {selectedClient && selectedClient.creditAccount && (
              <>
                <AddCreditPaymentDialog
                    isOpen={isPaymentOpen}
                    onOpenChange={setPaymentOpen}
                    client={selectedClient}
                    accounts={initialAccounts}
                    onPaymentAdded={handlePaymentAdded}
                />
                <PaymentPlanDialog
                    isOpen={isPlanOpen}
                    onOpenChange={setPlanOpen}
                    client={selectedClient}
                />
                 <GenerateContractDialog
                    isOpen={isContractOpen}
                    onOpenChange={setContractOpen}
                    client={selectedClient}
                />
              </>
            )}
        </>
    );
}

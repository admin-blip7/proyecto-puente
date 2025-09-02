"use client"

import { useState, useMemo, useEffect } from "react";
import { Consignor, ConsignorPayment, Product, Sale } from "@/types";
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
import { Button } from "@/components/ui/button";
import { DollarSign, ChevronDown, ChevronRight, Download } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { getConsignorPayments } from "@/lib/services/paymentService";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import RegisterPaymentDialog from "./RegisterPaymentDialog";

interface ConsignorClientProps {
  initialConsignors: Consignor[];
  allProducts: Product[];
  allSales: Sale[];
}

export default function ConsignorClient({ initialConsignors, allProducts, allSales }: ConsignorClientProps) {
  const [consignors, setConsignors] = useState<Consignor[]>(initialConsignors);
  const [selectedConsignor, setSelectedConsignor] = useState<Consignor | null>(null);
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [paymentHistory, setPaymentHistory] = useState<Record<string, ConsignorPayment[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  const handleOpenPaymentDialog = (consignor: Consignor) => {
    setSelectedConsignor(consignor);
    setPaymentDialogOpen(true);
  };
  
  const handlePaymentRegistered = (consignorId: string, amountPaid: number) => {
    setConsignors(prev => prev.map(c => 
        c.id === consignorId ? { ...c, balanceDue: c.balanceDue - amountPaid } : c
    ));
    // Refresh history for the consignor
    fetchPaymentHistory(consignorId);
  }

  const toggleCollapsible = async (consignorId: string) => {
    const isOpen = !openCollapsibles[consignorId];
    setOpenCollapsibles(prev => ({ ...prev, [consignorId]: isOpen }));
    
    // Fetch history only when opening for the first time
    if (isOpen && !paymentHistory[consignorId]) {
       await fetchPaymentHistory(consignorId);
    }
  };

  const fetchPaymentHistory = async (consignorId: string) => {
    setLoadingHistory(prev => ({...prev, [consignorId]: true}));
    try {
        const payments = await getConsignorPayments(consignorId);
        setPaymentHistory(prev => ({...prev, [consignorId]: payments}));
    } catch (error) {
        console.error("Failed to fetch payment history", error);
    } finally {
        setLoadingHistory(prev => ({...prev, [consignorId]: false}));
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Reporte de Consignadores</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldos Pendientes</CardTitle>
          <CardDescription>
            Esta tabla muestra el saldo pendiente de pago para cada consignador y su historial de pagos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-200px)]">
             <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Nombre del Consignador</TableHead>
                        <TableHead>Información de Contacto</TableHead>
                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {consignors.map((consignor) => (
                      <Collapsible asChild key={consignor.id} open={openCollapsibles[consignor.id] || false} onOpenChange={() => toggleCollapsible(consignor.id)}>
                        <>
                          <TableRow className="cursor-pointer">
                              <TableCell>
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        {openCollapsibles[consignor.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        <span className="sr-only">Ver historial</span>
                                    </Button>
                                </CollapsibleTrigger>
                              </TableCell>
                              <TableCell className="font-medium">{consignor.name}</TableCell>
                              <TableCell>{consignor.contactInfo}</TableCell>
                              <TableCell className="text-right font-bold text-lg text-destructive">
                                <div className="flex items-center justify-end">
                                    <DollarSign className="h-5 w-5 mr-1" />
                                    {consignor.balanceDue.toFixed(2)}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button onClick={() => handleOpenPaymentDialog(consignor)} disabled={consignor.balanceDue <= 0}>
                                    Registrar Pago
                                </Button>
                              </TableCell>
                          </TableRow>
                           <TableRow>
                                <TableCell colSpan={5} className="p-0 border-0">
                                    <CollapsibleContent>
                                      <div className="p-4 bg-muted/50">
                                        <h4 className="font-semibold mb-2">Historial de Pagos</h4>
                                        {loadingHistory[consignor.id] && <p>Cargando historial...</p>}
                                        {!loadingHistory[consignor.id] && paymentHistory[consignor.id]?.length === 0 && <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>}
                                        {paymentHistory[consignor.id]?.length > 0 && (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>ID Pago</TableHead>
                                                        <TableHead>Fecha</TableHead>
                                                        <TableHead>Método</TableHead>
                                                        <TableHead className="text-right">Monto</TableHead>
                                                        <TableHead className="text-center">Comprobante</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paymentHistory[consignor.id]?.map(payment => (
                                                        <TableRow key={payment.id}>
                                                            <TableCell className="font-mono text-xs">{payment.paymentId}</TableCell>
                                                            <TableCell>{format(payment.paymentDate, "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
                                                            <TableCell><Badge variant="outline">{payment.paymentMethod}</Badge></TableCell>
                                                            <TableCell className="text-right font-medium">${payment.amountPaid.toFixed(2)}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Button asChild variant="outline" size="icon">
                                                                    <a href={payment.proofOfPaymentUrl} target="_blank" rel="noopener noreferrer">
                                                                        <Download className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                      </div>
                                    </CollapsibleContent>
                                </TableCell>
                           </TableRow>
                        </>
                      </Collapsible>
                    ))}
                </TableBody>
                </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      {selectedConsignor && (
        <RegisterPaymentDialog
            isOpen={isPaymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            consignor={selectedConsignor}
            onPaymentRegistered={handlePaymentRegistered}
        />
      )}
    </>
  );
}

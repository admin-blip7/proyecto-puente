"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClientProfile } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { addMonths } from "date-fns";
import jsPDF from 'jspdf';
import 'jspdf-autotable';


interface PaymentPlanDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    client: ClientProfile;
}

interface AmortizationRow {
    paymentNumber: number;
    paymentDate: string;
    paymentAmount: number;
    interest: number;
    principal: number;
    remainingBalance: number;
}

export default function PaymentPlanDialog({ isOpen, onOpenChange, client }: PaymentPlanDialogProps) {
    const [termInMonths, setTermInMonths] = useState(12);
    const { toast } = useToast();

    const amortizationTable = useMemo((): AmortizationRow[] => {
        if (!client.creditAccount || client.creditAccount.currentBalance <= 0 || !client.creditAccount.interestRate || termInMonths <= 0) {
            return [];
        }

        const balance = client.creditAccount.currentBalance;
        const annualRate = client.creditAccount.interestRate / 100;
        const monthlyRate = annualRate / 12;

        // Formula del pago mensual fijo (Anualidad)
        const monthlyPayment = (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termInMonths));

        let remainingBalance = balance;
        const table: AmortizationRow[] = [];
        const startDate = new Date();

        for (let i = 1; i <= termInMonths; i++) {
            const interest = remainingBalance * monthlyRate;
            const principal = monthlyPayment - interest;
            remainingBalance -= principal;

            table.push({
                paymentNumber: i,
                paymentDate: format(addMonths(startDate, i), "dd MMM yyyy", { locale: es }),
                paymentAmount: monthlyPayment,
                interest,
                principal,
                remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
            });
        }
        return table;

    }, [client, termInMonths]);

    const handleDownloadPdf = () => {
        if (!client.creditAccount) return;

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Plan de Pagos de Crédito", 14, 22);

        doc.setFontSize(11);
        doc.text(`Cliente: ${client.name}`, 14, 32);
        doc.text(`Monto del Crédito: $${client.creditAccount.currentBalance.toFixed(2)}`, 14, 38);
        doc.text(`Tasa de Interés Anual: ${client.creditAccount.interestRate?.toFixed(2) ?? 'N/A'}%`, 14, 44);
        doc.text(`Plazo: ${termInMonths} meses`, 14, 50);

        (doc as any).autoTable({
            startY: 60,
            head: [['#', 'Fecha', 'Pago Mensual', 'Interés', 'Capital', 'Saldo Restante']],
            body: amortizationTable.map(row => [
                row.paymentNumber,
                row.paymentDate,
                `$${row.paymentAmount.toFixed(2)}`,
                `$${row.interest.toFixed(2)}`,
                `$${row.principal.toFixed(2)}`,
                `$${row.remainingBalance.toFixed(2)}`
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        });
        
        doc.save(`plan-de-pagos-${client.name.replace(/ /g, '_')}.pdf`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Generar Plan de Pagos para {client.name}</DialogTitle>
                    <DialogDescription>
                        Calcula y visualiza la tabla de amortización para el saldo actual de ${client.creditAccount?.currentBalance.toFixed(2)}.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-4 py-4">
                    <Label htmlFor="term">Número de Pagos (Meses):</Label>
                    <Input 
                        id="term" 
                        type="number" 
                        className="w-24"
                        value={termInMonths}
                        onChange={(e) => setTermInMonths(parseInt(e.target.value) || 0)}
                        min="1"
                    />
                </div>

                <ScrollArea className="flex-grow border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead># Pago</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Pago Mensual</TableHead>
                                <TableHead className="text-right">Interés</TableHead>
                                <TableHead className="text-right">Capital</TableHead>
                                <TableHead className="text-right">Saldo Restante</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {amortizationTable.length > 0 ? (
                                amortizationTable.map(row => (
                                    <TableRow key={row.paymentNumber}>
                                        <TableCell>{row.paymentNumber}</TableCell>
                                        <TableCell>{row.paymentDate}</TableCell>
                                        <TableCell className="text-right font-medium">${row.paymentAmount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-destructive">${row.interest.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-green-600">${row.principal.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold">${row.remainingBalance.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No se puede generar la tabla. Verifica el saldo, la tasa de interés y el plazo.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    <Button onClick={handleDownloadPdf} disabled={amortizationTable.length === 0}>
                        Descargar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

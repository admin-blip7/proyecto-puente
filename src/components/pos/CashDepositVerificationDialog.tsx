"use client"

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, Printer } from "lucide-react";
import { CashSession } from "@/types";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CashDepositVerificationDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    session: CashSession;
    onReprint: () => void;
}

export default function CashDepositVerificationDialog({
    isOpen,
    onOpenChange,
    session,
    onReprint
}: CashDepositVerificationDialogProps) {

    // Auto-focus the close or print button?
    useEffect(() => {
        // Optional: auto-reprint logic if desired, but user asked for explicit option
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto bg-green-100 p-3 rounded-full mb-2">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <DialogTitle className="text-center">Corte de Caja Exitoso</DialogTitle>
                    <DialogDescription className="text-center">
                        El turno ha sido cerrado y la información guardada.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm py-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Ventas (Efectivo):</span>
                            <span className="font-bold">{formatCurrency(session.totalCashSales || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Efectivo Contado:</span>
                            <span className="font-medium">{formatCurrency(session.actualCashCount || 0)}</span>
                        </div>

                        {session.difference !== undefined && session.difference !== 0 && (
                            <>
                                <Separator className="my-2" />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Diferencia:</span>
                                    <span className={`font-bold ${session.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {session.difference > 0 ? '+' : ''}{formatCurrency(session.difference)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="text-xs text-muted-foreground text-center">
                        Puedes imprimir el comprobante de cierre ahora.
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-center">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onReprint}
                        className="w-full sm:w-auto"
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Ticket
                    </Button>
                    <Button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

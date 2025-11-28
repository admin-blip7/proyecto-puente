"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, AlertCircle } from "lucide-react";
import { CashSession } from "@/types";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CashDepositVerificationDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    session: CashSession;
    onConfirm: (depositAmount: number) => Promise<void>;
    onSkip: () => void;
}

const formSchema = z.object({
    depositAmount: z.coerce.number().min(0, "El depósito no puede ser negativo."),
});

export default function CashDepositVerificationDialog({
    isOpen,
    onOpenChange,
    session,
    onConfirm,
    onSkip
}: CashDepositVerificationDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            depositAmount: session.totalCashSales || 0,
        },
    });

    const { watch, reset } = form;
    const depositAmount = watch('depositAmount', 0);

    useEffect(() => {
        if (isOpen) {
            reset({ depositAmount: session.totalCashSales || 0 });
            setError(null);
        }
    }, [isOpen, reset, session.totalCashSales]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        const maxDeposit = session.totalCashSales || 0;

        if (values.depositAmount > maxDeposit) {
            setError(`No puedes depositar más de ${formatCurrency(maxDeposit)} (total de ventas en efectivo)`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await onConfirm(values.depositAmount);
            onOpenChange(false);
        } catch (err) {
            setError("Error al procesar el depósito. Por favor intenta nuevamente.");
            console.error("Error processing deposit:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        onSkip();
        onOpenChange(false);
    };

    const handleClose = (open: boolean) => {
        if (!open && !loading) {
            form.reset();
            setError(null);
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Verificar Depósito a Caja Chica</DialogTitle>
                    <DialogDescription>
                        Confirma la cantidad de efectivo que se depositará en Caja Chica.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 text-sm py-4">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            El turno ha sido cerrado exitosamente. Ahora confirma cuánto efectivo se depositará en Caja Chica.
                        </AlertDescription>
                    </Alert>

                    <Separator />

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Ventas en Efectivo del Turno:</span>
                        <span className="font-bold text-green-600">{formatCurrency(session.totalCashSales || 0)}</span>
                    </div>

                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Efectivo Contado en Caja:</span>
                        <span className="font-medium">{formatCurrency(session.actualCashCount || 0)}</span>
                    </div>

                    {session.difference !== undefined && session.difference !== 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Diferencia:</span>
                            <span className={`font-medium ${session.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {session.difference > 0 ? '+' : ''}{formatCurrency(session.difference)}
                            </span>
                        </div>
                    )}
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="depositAmount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cantidad a Depositar en Caja Chica</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            {...field}
                                            autoFocus
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Por defecto muestra el total de ventas en efectivo. Puedes ajustar si es necesario.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <DialogFooter className="flex-col sm:flex-row gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleSkip}
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                Omitir Depósito
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2" />
                                        Procesando...
                                    </>
                                ) : (
                                    `Depositar ${formatCurrency(depositAmount)}`
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

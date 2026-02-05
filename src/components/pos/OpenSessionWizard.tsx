"use client"

/**
 * CASH FLOAT MANAGEMENT FEATURE: Enhanced Opening Session Wizard with Float Support
 *
 * This component now supports automatic float carryover from previous session:
 * - Pre-fills starting float from previous session's closing float
 * - User can verify or adjust the amount before confirming
 * - Ensures change money is always available for transactions
 *
 * Cash Float Logic:
 * - Previous session's closing float becomes this session's starting float
 * - User can verify that the physical cash matches the recorded amount
 * - Allows adjustment if physical count differs from recorded closing float
 *
 * Previous complexity eliminated (from refactoring):
 * - Removed all bag input fields (recargas, mimovil, servicios)
 * - Removed bag validation and tracking
 * - Removed previous session bag confirmation flow
 *
 * The simplified workflow:
 * - System auto-fills starting float from previous closing float
 * - User verifies the physical cash amount
 * - User can adjust if needed
 * - Streamlined single-step process with float management support
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Info } from "lucide-react";
import { CashSession } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OpenSessionWizardProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (startingFloat: number, previousSessionConfirmedAt?: Date) => Promise<void>;
    lastClosedSession: CashSession | null;
}

// SIMPLIFICATION: Removed all bag-related fields
// Schema now only validates starting float amount
const formSchema = z.object({
    previousSessionConfirmed: z.boolean().default(false),
    cashStayedInDrawer: z.boolean().default(false),
    startingFloat: z.coerce.number().min(0, "El monto no puede ser negativo."),
});

export default function OpenSessionWizard({ isOpen, onOpenChange, onConfirm, lastClosedSession }: OpenSessionWizardProps) {
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            previousSessionConfirmed: false,
            cashStayedInDrawer: false,
            startingFloat: 0,
        }
    });

    const { watch, setValue, control } = form;
    const cashStayedInDrawer = watch('cashStayedInDrawer');
    const previousSessionConfirmed = watch('previousSessionConfirmed');

    // CASH FLOAT MANAGEMENT: Auto-fill starting float from previous session's closing float
    // Use cashLeftForNextSession (closing float) from previous session as default
    useEffect(() => {
        if (isOpen && lastClosedSession) {
            // CASH FLOAT MANAGEMENT: Use the closing float from previous session as default
            // This is the amount intended to stay in drawer for change money
            const closingFloat = lastClosedSession.cashLeftForNextSession ?? 0;
            setValue('startingFloat', closingFloat);
        }
    }, [isOpen, lastClosedSession, setValue]);

    const correctedPreviousCash = watch('startingFloat');

    useEffect(() => {
        if (cashStayedInDrawer) {
            setValue('startingFloat', correctedPreviousCash);
        }
    }, [cashStayedInDrawer, correctedPreviousCash, setValue]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            const previousSessionConfirmedAt = values.previousSessionConfirmed ? new Date() : undefined;
            await onConfirm(values.startingFloat, previousSessionConfirmedAt);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            form.reset();
        }
        onOpenChange(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Abrir Turno de Caja</DialogTitle>
                    <DialogDescription>
                        Ingresa el monto inicial para el turno de caja.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {lastClosedSession && (
                            <div className="space-y-4 py-2">
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Información del Turno Anterior</AlertTitle>
                                    <AlertDescription>
                                        El turno anterior dejó {formatCurrency(lastClosedSession.cashLeftForNextSession ?? 0)} como fondo de cambio.
                                    </AlertDescription>
                                </Alert>

                                <FormField
                                    control={control}
                                    name="previousSessionConfirmed"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Confirmar Cierre Anterior
                                                </FormLabel>
                                                <p className="text-sm text-muted-foreground">
                                                    Marque esta casilla si verificó que el monto coincide con lo físico.
                                                </p>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="cashStayedInDrawer"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    ¿El efectivo se quedó en caja?
                                                </FormLabel>
                                                <p className="text-sm text-muted-foreground">
                                                    Si marca esto, el fondo inicial será igual al cierre anterior ({formatCurrency(correctedPreviousCash || 0)}).
                                                </p>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                <Separator />
                            </div>
                        )}

                        <div className="space-y-4 py-2">
                            <FormField
                                control={control}
                                name="startingFloat"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fondo de Caja Inicial (Efectivo)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                                <Input className="pl-7" type="number" step="0.01" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Alert variant="default" className="bg-amber-50 border-amber-200">
                                <Info className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-amber-800">Nota</AlertTitle>
                                <AlertDescription className="text-amber-700">
                                    Este monto será el punto de partida para calcular el corte final del turno.
                                    Se han simplificado los procesos eliminando el seguimiento de bolsas de saldo.
                                    <br />
                                    <strong className="text-amber-900">El fondo de cambio (float) se retiene entre turnos para facilitar las transacciones.</strong>
                                </AlertDescription>
                            </Alert>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="secondary" onClick={() => handleClose(false)} disabled={loading}>
                                Cancelar
                            </Button>

                            {lastClosedSession ? (
                                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={!previousSessionConfirmed || loading}>
                                    {loading ? <><Loader2 className="animate-spin mr-2" /> Abriendo...</> : "Confirmar y Abrir Turno"}
                                </Button>
                            ) : (
                                <Button type="submit" disabled={loading}>
                                    {loading ? <><Loader2 className="animate-spin mr-2" /> Abriendo...</> : "Confirmar y Abrir Turno"}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

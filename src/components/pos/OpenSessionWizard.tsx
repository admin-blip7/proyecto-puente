"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowRight, ArrowLeft, Info } from "lucide-react";
import { CashSession } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OpenSessionWizardProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (startingFloat: number, bagsStartAmounts: Record<string, number>, previousSessionConfirmedAt?: Date) => Promise<void>;
    lastClosedSession: CashSession | null;
}

const formSchema = z.object({
    previousSessionConfirmed: z.boolean().default(false),
    cashStayedInDrawer: z.boolean().default(false),
    startingFloat: z.coerce.number().min(0, "El monto no puede ser negativo."),
    bagRecargas: z.coerce.number(),
    bagMimovil: z.coerce.number(),
    bagServicios: z.coerce.number(),
});

export default function OpenSessionWizard({ isOpen, onOpenChange, onConfirm, lastClosedSession }: OpenSessionWizardProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            previousSessionConfirmed: false,
            cashStayedInDrawer: false,
            startingFloat: 0,
            bagRecargas: 0,
            bagMimovil: 0,
            bagServicios: 0,
        }
    });

    const { watch, setValue, control } = form;
    const cashStayedInDrawer = watch('cashStayedInDrawer');
    const previousSessionConfirmed = watch('previousSessionConfirmed');

    // Skip step 1 if no previous session
    useEffect(() => {
        if (isOpen && !lastClosedSession) {
            setStep(2);
        } else if (isOpen) {
            setStep(1);
        }
    }, [isOpen, lastClosedSession]);

    useEffect(() => {
        if (lastClosedSession) {
            // Pre-fill bag values from last session ending amounts
            const bags = lastClosedSession.bagsEndAmounts || {};
            setValue('bagRecargas', bags['recargas'] || 0);
            setValue('bagMimovil', bags['mimovil'] || 0);
            setValue('bagServicios', bags['servicios'] || 0);
        }
    }, [lastClosedSession, setValue]);

    useEffect(() => {
        if (cashStayedInDrawer && lastClosedSession) {
            setValue('startingFloat', lastClosedSession.actualCashCount || 0);
        }
    }, [cashStayedInDrawer, lastClosedSession, setValue]);

    const handleNext = () => {
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            const bagsStartAmounts = {
                'recargas': values.bagRecargas,
                'mimovil': values.bagMimovil,
                'servicios': values.bagServicios
            };

            const previousSessionConfirmedAt = values.previousSessionConfirmed ? new Date() : undefined;

            await onConfirm(values.startingFloat, bagsStartAmounts, previousSessionConfirmedAt);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            form.reset();
            setStep(1);
        }
        onOpenChange(open);
    }

    // Calculate Bags Expected (from UI perspective just showing what comes from prev session)
    const prevBags = lastClosedSession?.bagsEndAmounts || {};

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Abrir Turno de Caja</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? "Verifica los saldos del turno anterior." : "Ingresa los montos iniciales para este turno."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {step === 1 && lastClosedSession && (
                            <div className="space-y-4 py-2">
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Resumen del Corte Anterior ({new Date(lastClosedSession.closedAt!).toLocaleDateString()})</AlertTitle>
                                    <AlertDescription>
                                        Revisa que estos montos coincidan con lo que encontraste.
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="border p-3 rounded bg-muted/20">
                                        <div className="font-semibold mb-2">Efectivo en Caja</div>
                                        <div className="text-2xl font-bold">{formatCurrency(lastClosedSession.actualCashCount || 0)}</div>
                                    </div>
                                    <div className="border p-3 rounded bg-muted/20">
                                        <div className="font-semibold mb-2">Saldos Electrónicos</div>
                                        <div className="flex justify-between py-1 border-b border-dashed">
                                            <span>Recargas:</span>
                                            <span>{formatCurrency(prevBags['recargas'] || 0)}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-dashed">
                                            <span>MiMovil:</span>
                                            <span>{formatCurrency(prevBags['mimovil'] || 0)}</span>
                                        </div>
                                        <div className="flex justify-between py-1">
                                            <span>Servicios:</span>
                                            <span>{formatCurrency(prevBags['servicios'] || 0)}</span>
                                        </div>
                                    </div>
                                </div>

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
                                                    Confirmar Saldos Anteriores
                                                </FormLabel>
                                                <p className="text-sm text-muted-foreground">
                                                    Marque esta casilla si verificó que los montos físicos/reales coinciden con el sistema.
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
                                                    Si marca esto, el Efectivo Inicial del nuevo turno será igual al cierre anterior ({formatCurrency(lastClosedSession.actualCashCount || 0)}).
                                                </p>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 py-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={control}
                                        name="startingFloat"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fondo de Caja (Efectivo)</FormLabel>
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

                                    <FormField
                                        control={control}
                                        name="bagRecargas"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Saldo Inicial Recargas</FormLabel>
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

                                    <FormField
                                        control={control}
                                        name="bagMimovil"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Saldo Inicial MiMovil</FormLabel>
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

                                    <FormField
                                        control={control}
                                        name="bagServicios"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Saldo Inicial Servicios</FormLabel>
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
                                </div>

                                <Alert variant="default" className="bg-blue-50 border-blue-200">
                                    <Info className="h-4 w-4 text-blue-600" />
                                    <AlertTitle className="text-blue-800">Nota</AlertTitle>
                                    <AlertDescription className="text-blue-700">
                                        Estos saldos serán el punto de partida para calcular el corte final del día.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0">
                            {step === 2 && lastClosedSession && (
                                <Button type="button" variant="outline" onClick={handleBack} className="mr-auto">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
                                </Button>
                            )}

                            <Button type="button" variant="secondary" onClick={() => handleClose(false)} disabled={loading}>
                                Cancelar
                            </Button>

                            {step === 1 && lastClosedSession ? (
                                <Button type="button" onClick={handleNext} disabled={!previousSessionConfirmed}>
                                    Siguiente <ArrowRight className="ml-2 h-4 w-4" />
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

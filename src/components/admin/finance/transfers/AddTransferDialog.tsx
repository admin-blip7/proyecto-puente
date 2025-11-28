"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Transfer, Account } from "@/types";
import { addTransfer } from "@/lib/services/transferService";
import { getAccounts } from "@/lib/services/accountService";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface AddTransferDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onTransferAdded: (transfer: Transfer) => void;
}

const formSchema = z.object({
    sourceAccountId: z.string({ required_error: "Seleccione cuenta de origen." }),
    destinationAccountId: z.string({ required_error: "Seleccione cuenta de destino." }),
    amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
    description: z.string().optional(),
    reference: z.string().optional(),
}).refine((data) => data.sourceAccountId !== data.destinationAccountId, {
    message: "La cuenta de destino no puede ser igual a la de origen",
    path: ["destinationAccountId"],
});

export default function AddTransferDialog({ isOpen, onOpenChange, onTransferAdded }: AddTransferDialogProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
            description: "",
            reference: "",
        },
    });

    useEffect(() => {
        if (isOpen) {
            getAccounts().then(setAccounts);
        }
    }, [isOpen]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            const transfer = await addTransfer({
                sourceAccountId: values.sourceAccountId,
                destinationAccountId: values.destinationAccountId,
                amount: values.amount,
                description: values.description,
                reference: values.reference,
            });

            onTransferAdded(transfer);
            toast({
                title: "Transferencia Exitosa",
                description: `Se transfirieron $${values.amount.toFixed(2)}.`,
            });
            handleDialogClose(false);
        } catch (error: any) {
            console.error("Error creating transfer:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "No se pudo realizar la transferencia.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            form.reset();
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nueva Transferencia</DialogTitle>
                    <DialogDescription>
                        Mueve dinero entre tus cuentas registradas.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">

                        <div className="grid grid-cols-1 gap-4">
                            <FormField
                                control={form.control}
                                name="sourceAccountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Desde (Origen)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione cuenta de origen..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accounts.map((account) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.name} (${account.currentBalance.toFixed(2)})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-center">
                                <ArrowRightLeft className="text-muted-foreground h-5 w-5 rotate-90 sm:rotate-0" />
                            </div>

                            <FormField
                                control={form.control}
                                name="destinationAccountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Para (Destino)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione cuenta de destino..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {accounts.map((account) => (
                                                    <SelectItem key={account.id} value={account.id}>
                                                        {account.name} (${account.currentBalance.toFixed(2)})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Monto a Transferir</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Ahorro mensual" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="reference"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Referencia (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: REF-12345" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="secondary" onClick={() => handleDialogClose(false)} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <><Loader2 className="animate-spin mr-2" /> Procesando...</> : "Transferir Fondos"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

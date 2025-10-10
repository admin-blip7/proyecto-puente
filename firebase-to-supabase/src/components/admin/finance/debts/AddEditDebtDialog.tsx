"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Debt, debtTypes, DebtType } from "@/types";
import { addDebt, updateDebt } from "@/lib/services/debtService";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddEditDebtDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  onDebtAdded: (debt: Debt) => void;
  onDebtUpdated: (debt: Debt) => void;
}

const formSchema = z.object({
  creditorName: z.string().min(3, "El nombre del acreedor es requerido."),
  debtType: z.enum(debtTypes, { required_error: "Debe seleccionar un tipo." }),
  currentBalance: z.coerce.number().min(0, "El saldo no puede ser negativo."),
  totalLimit: z.coerce.number().optional(),
  closingDate: z.coerce.number().optional(),
  paymentDueDate: z.coerce.number().optional(),
  interestRate: z.coerce.number().optional(),
  cat: z.coerce.number().optional(),
}).refine(data => {
    if (data.debtType === 'Tarjeta de Crédito') {
        return !!data.totalLimit && !!data.closingDate && !!data.paymentDueDate && !!data.interestRate;
    }
    return true;
}, {
    message: "Para tarjetas de crédito, todos los campos específicos son requeridos.",
    path: ["totalLimit"],
});


export default function AddEditDebtDialog({
  isOpen,
  onOpenChange,
  debt,
  onDebtAdded,
  onDebtUpdated,
}: AddEditDebtDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const isEditMode = !!debt;
  const debtType = form.watch("debtType");

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        form.reset({
            creditorName: debt.creditorName,
            debtType: debt.debtType,
            currentBalance: debt.currentBalance,
            totalLimit: debt.totalLimit,
            closingDate: debt.closingDate,
            paymentDueDate: debt.paymentDueDate,
            interestRate: debt.interestRate,
            cat: debt.cat,
        });
      } else {
        form.reset({
            creditorName: "",
            debtType: "Tarjeta de Crédito",
            currentBalance: 0,
            totalLimit: 0,
            closingDate: 1,
            paymentDueDate: 1,
            interestRate: 0,
            cat: 0,
        });
      }
    }
  }, [isOpen, debt, isEditMode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      if (isEditMode) {
        await updateDebt(debt.id, values);
        onDebtUpdated({ ...debt, ...values });
        toast({ title: "Deuda Actualizada", description: "La información ha sido guardada." });
      } else {
        const newDebt = await addDebt(values);
        onDebtAdded(newDebt);
        toast({ title: "Deuda Registrada", description: "La nueva deuda ha sido creada." });
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error processing debt:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: isEditMode ? "No se pudo actualizar la deuda." : "No se pudo registrar la deuda.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Deuda" : "Registrar Nueva Deuda"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles de la deuda." : "Completa la información de la nueva deuda."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[70vh] pr-6">
                <div className="space-y-4 py-4">
                    <FormField
                    control={form.control}
                    name="creditorName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nombre del Acreedor</FormLabel>
                        <FormControl>
                            <Input placeholder="Ej: BBVA Azul, Préstamo de Auto" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="debtType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tipo de Deuda</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {debtTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                    {type}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                            control={form.control}
                            name="currentBalance"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Saldo Actual</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    {debtType === "Tarjeta de Crédito" && (
                        <div className="space-y-4 rounded-lg border p-4">
                            <h4 className="font-semibold text-center">Detalles de Tarjeta de Crédito</h4>
                            <FormField
                                control={form.control}
                                name="totalLimit"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Límite de Crédito Total</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                 <FormField
                                    control={form.control}
                                    name="closingDate"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Día de Corte</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="1" max="31" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="paymentDueDate"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Día Límite de Pago</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="1" max="31" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <FormField
                                    control={form.control}
                                    name="interestRate"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Tasa de Interés Anual (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="cat"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>CAT (%) (Opcional)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t mt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2"/> Guardando...</> : (isEditMode ? "Guardar Cambios" : "Agregar Deuda")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

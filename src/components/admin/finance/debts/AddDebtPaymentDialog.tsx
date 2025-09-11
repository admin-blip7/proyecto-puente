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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Debt, Account } from "@/types";
import { addDebtPayment } from "@/lib/services/debtPaymentService";
import { Loader2 } from "lucide-react";

interface AddDebtPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt;
  accounts: Account[];
  onPaymentAdded: (debtId: string, amount: number) => void;
}

const formSchema = z.object({
  amountPaid: z.coerce.number().positive("El monto debe ser mayor a cero."),
  paidFromAccountId: z.string({ required_error: "Debe seleccionar una cuenta de origen." }),
  proof: z.custom<FileList>().optional(),
  notes: z.string().optional(),
});


export default function AddDebtPaymentDialog({
  isOpen,
  onOpenChange,
  debt,
  accounts,
  onPaymentAdded,
}: AddDebtPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  useEffect(() => {
    if (debt) {
        form.reset({ amountPaid: debt.currentBalance });
    }
  }, [debt, form]);

  const proofFileRef = form.register("proof");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (values.amountPaid > debt.currentBalance) {
        form.setError("amountPaid", { message: "El pago no puede exceder el saldo pendiente."});
        return;
    }

    setLoading(true);
    try {
      const proofFile = values.proof?.[0];
      
      await addDebtPayment({
        debtId: debt.id,
        amountPaid: values.amountPaid,
        paidFromAccountId: values.paidFromAccountId,
        notes: values.notes,
      }, proofFile);

      onPaymentAdded(debt.id, values.amountPaid);
      toast({
        title: "Pago Registrado",
        description: `Se registró un abono de $${values.amountPaid.toFixed(2)} a ${debt.creditorName}.`,
      });
      handleDialogClose(false);
    } catch (error) {
      console.error("Error registering debt payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el pago.",
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
          <DialogTitle>Registrar Abono a {debt.creditorName}</DialogTitle>
          <DialogDescription>
            Saldo Pendiente Actual:{" "}
            <span className="font-bold text-destructive">${debt.currentBalance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Monto a Pagar</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="paidFromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pagado desde la Cuenta</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una cuenta..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id} disabled={account.currentBalance < form.getValues('amountPaid')}>
                          {account.name} (${account.currentBalance.toFixed(2)})
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
                name="proof"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Comprobante de Pago (Opcional)</FormLabel>
                        <FormControl>
                           <Input type="file" accept="image/*,application/pdf" {...proofFileRef} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Pago de mensualidad, folio..."
                      {...field}
                    />
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
                {loading ? <><Loader2 className="animate-spin mr-2"/> Registrando...</> : "Confirmar Pago"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

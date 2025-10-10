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
import { ClientProfile, Account } from "@/types";
import { addClientPayment } from "@/lib/services/creditPaymentService";
import { Loader2 } from "lucide-react";

interface AddCreditPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientProfile;
  accounts: Account[];
  onPaymentAdded: (clientId: string, amount: number) => void;
}

const formSchema = z.object({
  amountPaid: z.coerce.number().positive("El monto debe ser mayor a cero."),
  depositAccountId: z.string({ required_error: "Debe seleccionar una cuenta de depósito." }),
  notes: z.string().optional(),
});


export default function AddCreditPaymentDialog({
  isOpen,
  onOpenChange,
  client,
  accounts,
  onPaymentAdded,
}: AddCreditPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });
  
  useEffect(() => {
    if (client.creditAccount) {
        form.reset({ amountPaid: client.creditAccount.currentBalance });
    }
  }, [client, form]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!client.creditAccount) return;

    if (values.amountPaid > client.creditAccount.currentBalance) {
        form.setError("amountPaid", { message: "El pago no puede exceder el saldo pendiente."});
        return;
    }

    setLoading(true);
    try {
      await addClientPayment({
        accountId: client.creditAccount.id,
        amountPaid: values.amountPaid,
        notes: values.notes,
      }, values.depositAccountId);

      onPaymentAdded(client.id, values.amountPaid);
      toast({
        title: "Pago Registrado",
        description: `Se registró un abono de $${values.amountPaid.toFixed(2)} a ${client.name}.`,
      });
      handleDialogClose(false);
    } catch (error) {
      console.error("Error registering client payment:", error);
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
          <DialogTitle>Registrar Abono para {client.name}</DialogTitle>
          <DialogDescription>
            Saldo Pendiente Actual:{" "}
            <span className="font-bold text-destructive">${client.creditAccount?.currentBalance.toFixed(2)}</span>
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
              name="depositAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Depositar en la Cuenta</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una cuenta..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id} disabled={account.type === 'Billetera Digital'}>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Abono semanal, folio..."
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
                {loading ? <><Loader2 className="animate-spin mr-2"/> Registrando...</> : "Confirmar Abono"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

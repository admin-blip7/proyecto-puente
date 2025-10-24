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
import { Consignor, paymentMethods, PaymentMethod } from "@/types";
import { addConsignorPayment } from "@/lib/services/paymentService";
import { Loader2 } from "lucide-react";

interface RegisterPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  consignor: Consignor | null;
  onPaymentRegistered: (consignorId: string, amountPaid: number) => void;
}

const formSchema = z.object({
  amountPaid: z.coerce
    .number()
    .positive("El monto debe ser mayor a cero."),
  paymentMethod: z.enum(paymentMethods, {
    required_error: "Debe seleccionar un método de pago.",
  }),
  proofOfPayment: z.custom<FileList>().optional(),
  notes: z.string().optional(),
});

export default function RegisterPaymentDialogFixed({
  isOpen,
  onOpenChange,
  consignor,
  onPaymentRegistered,
}: RegisterPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amountPaid: 100,
      paymentMethod: "Transferencia Bancaria",
      notes: "",
    },
  });

  const proofFileRef = form.register("proofOfPayment");

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen && consignor) {
      form.reset({
        amountPaid: consignor.balanceDue > 0 ? Math.min(100, consignor.balanceDue) : 100,
        paymentMethod: "Transferencia Bancaria",
        notes: "",
      });
    }
  }, [isOpen, consignor, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!consignor) return;

    // Si el balance es 0, no permitir pagos
    if (consignor.balanceDue <= 0) {
        form.setError("amountPaid", { message: "No hay saldo pendiente para registrar pagos."});
        return;
    }

    if (values.amountPaid > consignor.balanceDue) {
        form.setError("amountPaid", { message: "El pago no puede exceder el saldo pendiente."});
        return;
    }

    setLoading(true);
    try {
      // Handle optional proof file
      let proofFile: File | undefined;
      if (values.proofOfPayment && values.proofOfPayment.length > 0) {
        proofFile = values.proofOfPayment[0];
      }

      // If no proof file, use a simple API call instead
      if (!proofFile) {
        const response = await fetch(`/api/consignors/${consignor.id}/register-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: values.amountPaid,
            paymentMethod: values.paymentMethod,
            notes: values.notes,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to register payment');
        }
      } else {
        // Use the existing service with file
        await addConsignorPayment({
          consignorId: consignor.id,
          amountPaid: values.amountPaid,
          paymentMethod: values.paymentMethod,
          notes: values.notes,
        }, proofFile);
      }

      onPaymentRegistered(consignor.id, values.amountPaid);
      toast({
        title: "Pago Registrado",
        description: `Se registró un pago de $${values.amountPaid.toFixed(2)} para ${consignor.name}.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error registering payment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo registrar el pago.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen && !!consignor} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago para {consignor?.name || 'Seleccionar Consignador'}</DialogTitle>
          <DialogDescription>
            Saldo Pendiente Actual:{" "}
            <span className="font-bold text-destructive">${(consignor?.balanceDue || 0).toFixed(2)}</span>
          </DialogDescription>
          {(consignor?.balanceDue || 0) <= 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ No hay saldo pendiente para registrar pagos.
              </p>
              <p className="mt-2 text-xs text-yellow-700">
                Este consignador no tiene deudas pendientes en este momento.
              </p>
            </div>
          )}
        </DialogHeader>
        {consignor && (
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
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un método..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
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
                  name="proofOfPayment"
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
                        placeholder="Ej: Pago de la semana 3, folio de transferencia..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancelar
                </Button>
                {consignor.balanceDue <= 0 ? (
                  <Button type="button" onClick={() => onOpenChange(false)}>
                    Cerrar
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading}>
                    {loading ? <><Loader2 className="animate-spin mr-2"/> Registrando...</> : "Confirmar Pago"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
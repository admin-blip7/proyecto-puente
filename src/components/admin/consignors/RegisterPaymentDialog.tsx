"use client";

import { useState } from "react";
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
  consignor: Consignor;
  onPaymentRegistered: (consignorId: string, amountPaid: number) => void;
}

const formSchema = z.object({
  amountPaid: z.coerce
    .number()
    .positive("El monto debe ser mayor a cero."),
  paymentMethod: z.enum(paymentMethods, {
    required_error: "Debe seleccionar un método de pago.",
  }),
  proofOfPayment: z.custom<FileList>().refine((files) => files?.length === 1, "Debe adjuntar un comprobante."),
  notes: z.string().optional(),
}).refine(data => data.proofOfPayment?.length === 1, {
    message: "Debe adjuntar un comprobante de pago.",
    path: ["proofOfPayment"],
});


export default function RegisterPaymentDialog({
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
      amountPaid: consignor.balanceDue,
      paymentMethod: "Transferencia Bancaria",
      notes: "",
    },
  });

  const proofFileRef = form.register("proofOfPayment");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (values.amountPaid > consignor.balanceDue) {
        form.setError("amountPaid", { message: "El pago no puede exceder el saldo pendiente."});
        return;
    }

    setLoading(true);
    try {
      const proofFile = values.proofOfPayment[0];
      
      await addConsignorPayment({
        consignorId: consignor.id,
        amountPaid: values.amountPaid,
        paymentMethod: values.paymentMethod,
        notes: values.notes,
      }, proofFile);

      onPaymentRegistered(consignor.id, values.amountPaid);
      toast({
        title: "Pago Registrado",
        description: `Se registró un pago de $${values.amountPaid.toFixed(2)} para ${consignor.name}.`,
      });
      handleDialogClose(false);
    } catch (error) {
      console.error("Error registering payment:", error);
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
          <DialogTitle>Registrar Pago para {consignor.name}</DialogTitle>
          <DialogDescription>
            Saldo Pendiente Actual:{" "}
            <span className="font-bold text-destructive">${consignor.balanceDue.toFixed(2)}</span>
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
                        <FormLabel>Comprobante de Pago</FormLabel>
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

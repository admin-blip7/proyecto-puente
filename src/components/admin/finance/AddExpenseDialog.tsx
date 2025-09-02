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
import { Expense, expenseCategories, ExpenseCategory } from "@/types";
import { addExpense } from "@/lib/services/financeService";
import { Loader2 } from "lucide-react";

interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded: (expense: Expense) => void;
}

const formSchema = z.object({
  description: z.string().min(5, "La descripción es requerida."),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
  category: z.enum(expenseCategories, { required_error: "Debe seleccionar una categoría." }),
  receipt: z.custom<FileList>().optional(),
});

export default function AddExpenseDialog({
  isOpen,
  onOpenChange,
  onExpenseAdded,
}: AddExpenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "Otros",
    },
  });

  const receiptFileRef = form.register("receipt");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const receiptFile = values.receipt?.[0];
      const expenseData = {
          description: values.description,
          amount: values.amount,
          category: values.category,
      };

      const newExpense = await addExpense(expenseData, receiptFile);

      onExpenseAdded(newExpense);
      toast({
        title: "Gasto Registrado",
        description: `Se registró un gasto de $${values.amount.toFixed(2)}.`,
      });
      handleDialogClose(false);
    } catch (error) {
      console.error("Error registering expense:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el gasto.",
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
          <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
          <DialogDescription>
            Añade un gasto operativo para mantener tus finanzas al día.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descripción del Gasto</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej: Pago de luz CFE" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {expenseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                            {category}
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
                name="receipt"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Recibo (Opcional)</FormLabel>
                        <FormControl>
                           <Input type="file" accept="image/*,application/pdf" {...receiptFileRef} />
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
                {loading ? <><Loader2 className="animate-spin mr-2"/> Registrando...</> : "Agregar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

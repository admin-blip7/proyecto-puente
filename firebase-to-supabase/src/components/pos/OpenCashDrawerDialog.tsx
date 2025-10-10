"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

interface OpenCashDrawerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (startingFloat: number) => Promise<void>;
}

const formSchema = z.object({
  startingFloat: z.coerce.number().min(0, "El fondo de caja no puede ser negativo."),
});

export default function OpenCashDrawerDialog({ isOpen, onOpenChange, onConfirm }: OpenCashDrawerDialogProps) {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startingFloat: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        await onConfirm(values.startingFloat);
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
            Ingresa el monto inicial de efectivo en la caja para comenzar a vender.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="startingFloat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fondo de Caja Inicial</FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                        autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => handleClose(false)} disabled={loading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? <><Loader2 className="animate-spin mr-2"/> Abriendo...</> : "Confirmar e Iniciar Turno"}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

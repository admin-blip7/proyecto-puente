"use client"

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { CashSession } from "@/types";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface CloseCashDrawerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  session: CashSession;
  onConfirm: (actualCash: number, bagsSalesAmounts: Record<string, number>) => Promise<void>;
}

const formSchema = z.object({
  actualCashCount: z.coerce.number().min(0, "El conteo no puede ser negativo."),
  bagRecargasSale: z.coerce.number().min(0),
  bagMimovilSale: z.coerce.number().min(0),
  bagServiciosSale: z.coerce.number().min(0),
});

export default function CloseCashDrawerDialog({ isOpen, onOpenChange, session, onConfirm }: CloseCashDrawerDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const { watch, reset } = form;
  const actualCashCount = watch('actualCashCount', 0);

  useEffect(() => {
    if (isOpen) {
      reset({
        actualCashCount: 0,
        bagRecargasSale: 0,
        bagMimovilSale: 0,
        bagServiciosSale: 0
      });
    }
  }, [isOpen, reset]);

  const expectedCashInDrawer = useMemo(() => {
    return session.startingFloat + session.totalCashSales - session.totalCashPayouts;
  }, [session]);

  const difference = useMemo(() => {
    return actualCashCount - expectedCashInDrawer;
  }, [actualCashCount, expectedCashInDrawer]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const bagsSalesAmounts = {
        'recargas': values.bagRecargasSale,
        'mimovil': values.bagMimovilSale,
        'servicios': values.bagServiciosSale
      };
      await onConfirm(values.actualCashCount, bagsSalesAmounts);
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
          <DialogTitle>Realizar Corte de Caja</DialogTitle>
          <DialogDescription>
            Confirma los totales del turno y registra el efectivo final para cerrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm py-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fondo de Caja Inicial:</span>
            <span className="font-medium">{formatCurrency(session.startingFloat ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ventas en Efectivo:</span>
            <span className="font-medium text-green-600">+ {formatCurrency(session.totalCashSales ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ventas con Tarjeta:</span>
            <span className="font-medium">{formatCurrency(session.totalCardSales ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gastos de Caja:</span>
            <span className="font-medium text-red-600">- {formatCurrency(session.totalCashPayouts ?? 0)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Efectivo Esperado en Caja:</span>
            <span>{formatCurrency(expectedCashInDrawer ?? 0)}</span>
            <span>{formatCurrency(expectedCashInDrawer ?? 0)}</span>
          </div>

          <Separator className="my-2" />
          <div className="font-semibold mb-2">Saldos de Bolsas</div>
          {(['recargas', 'mimovil', 'servicios'] as const).map(key => {
            const start = session.bagsStartAmounts?.[key] || 0;
            const sale = form.watch(key === 'recargas' ? 'bagRecargasSale' : key === 'mimovil' ? 'bagMimovilSale' : 'bagServiciosSale') || 0;
            const end = start - sale;
            return (
              <div key={key} className="flex justify-between text-xs py-1">
                <span className="capitalize">{key}:</span>
                <span>
                  Inicial: {formatCurrency(start)} - Venta: {formatCurrency(sale)} = <strong>{formatCurrency(end)}</strong>
                </span>
              </div>
            );
          })}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actualCashCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteo de Efectivo Real</FormLabel>
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

            <div className="grid grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="bagRecargasSale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Venta Recargas</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} className="h-8 text-xs" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bagMimovilSale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Venta MiMovil</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} className="h-8 text-xs" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bagServiciosSale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Venta Servicios</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} className="h-8 text-xs" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {form.formState.isDirty && (
              <div className={cn(
                "flex justify-between font-bold text-base p-2 rounded-md",
                difference === 0 && "bg-muted",
                difference > 0 && "bg-green-100 text-green-800",
                difference < 0 && "bg-red-100 text-red-800",
              )}>
                <span>Diferencia (Sobrante/Faltante):</span>
                <span>{difference >= 0 ? '+' : '-'}{formatCurrency(Math.abs(difference))}</span>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => handleClose(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2" /> Cerrando...</> : "Confirmar y Cerrar Turno"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

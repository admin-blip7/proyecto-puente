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
  onConfirm: (actualCash: number, bagsSalesAmounts: Record<string, number>, bagsActualEndAmounts: Record<string, number>) => Promise<void>;
}

const formSchema = z.object({
  actualCashCount: z.coerce.number().min(0, "El conteo no puede ser negativo."),
  bagRecargasSale: z.coerce.number().min(0),
  bagMimovilSale: z.coerce.number().min(0),
  bagServiciosSale: z.coerce.number().min(0),
  bagRecargasActualEnd: z.coerce.number().min(0).optional(),
  bagMimovilActualEnd: z.coerce.number().min(0).optional(),
  bagServiciosActualEnd: z.coerce.number().min(0).optional(),
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
        bagServiciosSale: 0,
        bagRecargasActualEnd: 0,
        bagMimovilActualEnd: 0,
        bagServiciosActualEnd: 0
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
      const bagsActualEndAmounts = {
        'recargas': values.bagRecargasActualEnd || 0,
        'mimovil': values.bagMimovilActualEnd || 0,
        'servicios': values.bagServiciosActualEnd || 0
      };
      await onConfirm(values.actualCashCount, bagsSalesAmounts, bagsActualEndAmounts);
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
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Realizar Corte de Caja</DialogTitle>
          <DialogDescription>
            Confirma los totales del turno y registra el efectivo final para cerrar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-center border-b pb-1">Recargas</h4>
                  <FormField
                    control={form.control}
                    name="bagRecargasSale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Venta</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} className="h-8 text-xs" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bagRecargasActualEnd"
                    render={({ field }) => {
                      // Calculate difference for visual feedback
                      const start = session.bagsStartAmounts?.['recargas'] || 0;
                      const sale = form.watch('bagRecargasSale') || 0;
                      const expectedEnd = start - sale;
                      const actualEnd = field.value || 0;
                      const diff = Number(actualEnd) - expectedEnd;

                      return (
                        <FormItem>
                          <FormLabel className="text-xs">Saldo en Bolsa</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className={cn(
                                "h-8 text-xs",
                                field.value !== undefined && Math.abs(diff) > 0.01 ? "border-red-400 bg-red-50" : ""
                              )}
                            />
                          </FormControl>
                          {field.value !== undefined && Math.abs(diff) > 0.01 && (
                            <div className="text-[10px] text-red-600 font-bold">
                              Diferencia: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </div>
                          )}
                        </FormItem>
                      )
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-center border-b pb-1">MiMovil</h4>
                  <FormField
                    control={form.control}
                    name="bagMimovilSale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Venta</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} className="h-8 text-xs" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bagMimovilActualEnd"
                    render={({ field }) => {
                      const start = session.bagsStartAmounts?.['mimovil'] || 0;
                      const sale = form.watch('bagMimovilSale') || 0;
                      const expectedEnd = start - sale;
                      const actualEnd = field.value || 0;
                      const diff = Number(actualEnd) - expectedEnd;

                      return (
                        <FormItem>
                          <FormLabel className="text-xs">Saldo en Bolsa</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className={cn(
                                "h-8 text-xs",
                                field.value !== undefined && Math.abs(diff) > 0.01 ? "border-red-400 bg-red-50" : ""
                              )}
                            />
                          </FormControl>
                          {field.value !== undefined && Math.abs(diff) > 0.01 && (
                            <div className="text-[10px] text-red-600 font-bold">
                              Diff: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </div>
                          )}
                        </FormItem>
                      )
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-center border-b pb-1">Servicios</h4>
                  <FormField
                    control={form.control}
                    name="bagServiciosSale"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Venta</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} className="h-8 text-xs" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bagServiciosActualEnd"
                    render={({ field }) => {
                      const start = session.bagsStartAmounts?.['servicios'] || 0;
                      const sale = form.watch('bagServiciosSale') || 0;
                      const expectedEnd = start - sale;
                      const actualEnd = field.value || 0;
                      const diff = Number(actualEnd) - expectedEnd;

                      return (
                        <FormItem>
                          <FormLabel className="text-xs">Saldo en Bolsa</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className={cn(
                                "h-8 text-xs",
                                field.value !== undefined && Math.abs(diff) > 0.01 ? "border-red-400 bg-red-50" : ""
                              )}
                            />
                          </FormControl>
                          {field.value !== undefined && Math.abs(diff) > 0.01 && (
                            <div className="text-[10px] text-red-600 font-bold">
                              Diff: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                            </div>
                          )}
                        </FormItem>
                      )
                    }}
                  />
                </div>
              </div>

              {form.formState.isDirty && (
                <div className={cn(
                  "flex flex-col gap-2 p-3 rounded-md border",
                  difference === 0 && "bg-muted border-transparent",
                  difference > 0 && "bg-green-50 text-green-800 border-green-200",
                  difference < 0 && "bg-red-50 text-red-800 border-red-200",
                )}>
                  <div className="flex justify-between font-bold text-base items-center">
                    <span>Diferencia (Sobrante/Faltante):</span>
                    <span>{difference >= 0 ? '+' : '-'}{formatCurrency(Math.abs(difference))}</span>
                  </div>
                  {difference !== 0 && (
                    <div className="flex items-start gap-2 text-xs mt-1">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <p className="font-semibold">Atención: El efectivo no cuadra.</p>
                        <p>Por favor verifique que contó correctamente todo el dinero en caja.</p>
                        {difference < 0 && <p className="mt-1 font-bold">Faltan {formatCurrency(Math.abs(difference))}</p>}
                        {difference > 0 && <p className="mt-1 font-bold">Sobran {formatCurrency(Math.abs(difference))}</p>}
                      </div>
                    </div>
                  )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

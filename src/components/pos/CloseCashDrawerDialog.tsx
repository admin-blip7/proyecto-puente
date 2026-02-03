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
import { getAccounts } from "@/lib/services/accountService";
import { Account } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pin, PinOff } from "lucide-react";

interface CloseCashDrawerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  session: CashSession;
  onConfirm: (actualCash: number, bagsSalesAmounts: Record<string, number>, bagsActualEndAmounts: Record<string, number>, depositAccountId?: string, cashLeftForNextSession?: number, balanceBagAccountId?: string, dailySalesAccountId?: string) => Promise<void>;
}

// Schema dinámico que valida según las ventas de la sesión
const createFormSchema = (hasCashSales: boolean, expectedCash: number) => z.object({
  actualCashCount: z.coerce.number()
    .min(0, "El conteo no puede ser negativo.")
    .refine(
      (val) => !hasCashSales || val > 0,
      { message: "Debes ingresar el conteo real de efectivo antes de cerrar." }
    )
    .refine(
      (val) => !hasCashSales || Math.abs(val - expectedCash) <= expectedCash * 0.5,
      { message: `El conteo parece incorrecto. Se esperan aproximadamente ${expectedCash.toFixed(2)}` }
    ),
  bagRecargasSale: z.coerce.number().min(0),
  bagMimovilSale: z.coerce.number().min(0),
  bagServiciosSale: z.coerce.number().min(0),
  bagRecargasActualEnd: z.string().optional(),
  bagMimovilActualEnd: z.string().optional(),
  bagServiciosActualEnd: z.string().optional(),
  depositAccountId: z.string().optional(),
  cashLeftForNextSession: z.coerce.number().min(0, "El efectivo a dejar no puede ser negativo."),
  balanceBagRecargasAccountId: z.string().optional(),
  balanceBagMimovilAccountId: z.string().optional(),
  balanceBagServiciosAccountId: z.string().optional(),
  dailySalesAccountId: z.string().optional(),
}).refine((data) => {
  // Check that leftover cash is not greater than actual cash
  if (data.cashLeftForNextSession > data.actualCashCount) {
    return false;
  }
  return true;
}, {
  message: "El efectivo a dejar no puede ser mayor al efectivo real en caja.",
  path: ["cashLeftForNextSession"],
}).refine((data) => {
  // Si hay efectivo a dejar (cashLeftForNextSession > 0), debe haber al menos una bolsa de saldo seleccionada
  const hasAnyBalanceBag = !!data.balanceBagRecargasAccountId || !!data.balanceBagMimovilAccountId || !!data.balanceBagServiciosAccountId;
  
  if (data.cashLeftForNextSession > 0 && !hasAnyBalanceBag) {
    return false;
  }
  
  // Si hay dinero a depositar (actualCashCount - cashLeftForNextSession), solo requiere cuenta de depósito si NO hay bolsas de saldo
  const depositAmount = data.actualCashCount - data.cashLeftForNextSession;
  const hasDepositAccount = !!data.depositAccountId;
  
  if (depositAmount > 0 && !hasDepositAccount && !hasAnyBalanceBag) {
    return false;
  }
  
  return true;
}, {
  message: "Debe seleccionar al menos una cuenta de bolsa de saldo para el efectivo a dejar.",
  path: ["cashLeftForNextSession"],
});

// Tipo para las cuentas fijadas
interface FixedAccounts {
  recargas?: string;
  mimovil?: string;
  servicios?: string;
  dailySales?: string;
}

export default function CloseCashDrawerDialog({ isOpen, onOpenChange, session, onConfirm }: CloseCashDrawerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [fixedAccounts, setFixedAccounts] = useState<FixedAccounts>({});
  const [pinnedAccounts, setPinnedAccounts] = useState<FixedAccounts>({});

  useEffect(() => {
    if (isOpen) {
      setLoadingAccounts(true);
      getAccounts()
        .then(setAccounts)
        .catch(console.error)
        .finally(() => setLoadingAccounts(false));

      // Cargar cuentas fijadas desde localStorage
      const saved = localStorage.getItem('fixedBalanceBagAccounts');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFixedAccounts(parsed);
        } catch (e) {
          console.error('Error al cargar cuentas fijadas:', e);
        }
      }

      // Cargar cuenta de ventas diarias fijada desde localStorage
      const savedDailySales = localStorage.getItem('fixedDailySalesAccount');
      if (savedDailySales) {
        try {
          const parsed = JSON.parse(savedDailySales);
          setFixedAccounts(prev => ({ ...prev, dailySales: parsed }));
          setPinnedAccounts(prev => ({ ...prev, dailySales: parsed }));
        } catch (e) {
          console.error('Error al cargar cuenta de ventas diarias fijada:', e);
        }
      }
    }
  }, [isOpen]);

  // Función para guardar cuenta fija
  const handlePinAccount = (type: 'recargas' | 'mimovil' | 'servicios' | 'dailySales', accountId: string, isPinned: boolean) => {
    const newFixedAccounts = { ...fixedAccounts };

    if (isPinned) {
      newFixedAccounts[type] = accountId;
      setFixedAccounts(newFixedAccounts);
      setPinnedAccounts(newFixedAccounts);
      
      // Guardar en localStorage según el tipo
      if (type === 'dailySales') {
        localStorage.setItem('fixedDailySalesAccount', JSON.stringify(accountId));
      } else {
        localStorage.setItem('fixedBalanceBagAccounts', JSON.stringify(newFixedAccounts));
      }
    } else {
      delete newFixedAccounts[type];
      setFixedAccounts(newFixedAccounts);
      setPinnedAccounts(newFixedAccounts);
      
      // Guardar en localStorage según el tipo
      if (type === 'dailySales') {
        localStorage.removeItem('fixedDailySalesAccount');
      } else {
        localStorage.setItem('fixedBalanceBagAccounts', JSON.stringify(newFixedAccounts));
      }
    }
  };

  // Calcular si hay ventas en efectivo y el efectivo esperado
  const hasCashSales = (session.totalCashSales ?? 0) > 0;
  const expectedCash = (session.startingFloat ?? 0) + (session.totalCashSales ?? 0) - (session.totalCashPayouts ?? 0);

  // Crear schema dinámico basado en las ventas de la sesión
  const formSchema = useMemo(() => createFormSchema(hasCashSales, expectedCash), [hasCashSales, expectedCash]);

  const form = useForm<z.infer<ReturnType<typeof createFormSchema>>>({
    resolver: zodResolver(formSchema),
  });

  const { watch, reset } = form;
  const actualCashCount = watch('actualCashCount', 0);

  // Verificar si hay alguna bolsa de saldo seleccionada
  const balanceBagRecargasAccountId = watch('balanceBagRecargasAccountId', '');
  const balanceBagMimovilAccountId = watch('balanceBagMimovilAccountId', '');
  const balanceBagServiciosAccountId = watch('balanceBagServiciosAccountId', '');
  const hasAnyBalanceBag = !!balanceBagRecargasAccountId ||
                           !!balanceBagMimovilAccountId ||
                           !!balanceBagServiciosAccountId;

  useEffect(() => {
    if (isOpen) {
      const initialFixedAccounts = fixedAccounts.recargas || fixedAccounts.mimovil || fixedAccounts.servicios ? fixedAccounts : {};
      reset({
        actualCashCount: 0,
        bagRecargasSale: 0,
        bagMimovilSale: 0,
        bagServiciosSale: 0,
        bagRecargasActualEnd: "",
        bagMimovilActualEnd: "",
        bagServiciosActualEnd: "",
        depositAccountId: "",
        cashLeftForNextSession: 0,
        balanceBagRecargasAccountId: initialFixedAccounts.recargas || "",
        balanceBagMimovilAccountId: initialFixedAccounts.mimovil || "",
        balanceBagServiciosAccountId: initialFixedAccounts.servicios || "",
        dailySalesAccountId: initialFixedAccounts.dailySales || "",
      });
      
      // Actualizar pinnedAccounts basado en las cuentas fijadas SOLO si están vacíos (carga inicial)
      if (!pinnedAccounts.recargas && !pinnedAccounts.mimovil && !pinnedAccounts.servicios && !pinnedAccounts.dailySales) {
        setPinnedAccounts(initialFixedAccounts);
      }
    }
  }, [isOpen, reset, fixedAccounts]);

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

      // Helper to determine end amount: Input -> Fallback to (Start - Sale)
      const getEndAmount = (input: string | undefined, key: 'recargas' | 'mimovil' | 'servicios') => {
        if (input === undefined || input === "") {
          const start = session.bagsStartAmounts?.[key] || 0;
          const sale = key === 'recargas' ? values.bagRecargasSale : key === 'mimovil' ? values.bagMimovilSale : values.bagServiciosSale;
          return start - sale;
        }
        return Number(input);
      };

      const bagsActualEndAmounts = {
        'recargas': getEndAmount(values.bagRecargasActualEnd, 'recargas'),
        'mimovil': getEndAmount(values.bagMimovilActualEnd, 'mimovil'),
        'servicios': getEndAmount(values.bagServiciosActualEnd, 'servicios')
      };

      // Obtener las cuentas de bolsa de saldo activas
      const balanceBagAccounts = {
        recargas: values.balanceBagRecargasAccountId,
        mimovil: values.balanceBagMimovilAccountId,
        servicios: values.balanceBagServiciosAccountId
      };

      await onConfirm(values.actualCashCount, bagsSalesAmounts, bagsActualEndAmounts, values.depositAccountId, values.cashLeftForNextSession, JSON.stringify(balanceBagAccounts), values.dailySalesAccountId);
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

              <FormField
                control={form.control}
                name="cashLeftForNextSession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efectivo a Dejar para Siguiente Turno</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {actualCashCount > 0 && !hasAnyBalanceBag && (
                <FormField
                  control={form.control}
                  name="depositAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta de Depósito</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una cuenta..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <span>{account.name} ({account.type}) | Saldo: {formatCurrency(account.currentBalance || 0)}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-[10px] text-muted-foreground">
                        El efectivo contado se depositará en esta cuenta.
                        <br />
                        <strong>Monto a depositar: {formatCurrency(Math.max(0, actualCashCount - (form.watch('cashLeftForNextSession') || 0)))}</strong>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Mensaje informativo cuando hay bolsas de saldo seleccionadas */}
              {hasAnyBalanceBag && actualCashCount > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-orange-600 font-bold text-lg">ℹ️</span>
                    <div className="text-xs text-orange-800">
                      <p className="font-semibold mb-1">Bolsa de Saldo seleccionada</p>
                      <p>El dinero a dejar (<strong>{formatCurrency(form.watch('cashLeftForNextSession') || 0)}</strong>) se guardará como registro para mostrar en el siguiente turno.</p>
                      <p className="mt-1 text-orange-700">No se usará ninguna cuenta de depósito para evitar duplicidad.</p>
                    </div>
                  </div>
                </div>
              )}

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
                      const actualEndStr = field.value;
                      // Only show diff if user has typed something
                      const diff = actualEndStr && actualEndStr !== "" ? Number(actualEndStr) - expectedEnd : 0;

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
                                diff !== 0 && Math.abs(diff) > 0.01 ? "border-red-400 bg-red-50" : ""
                              )}
                              placeholder={expectedEnd.toFixed(2)}
                            />
                          </FormControl>
                          {diff !== 0 && Math.abs(diff) > 0.01 && (
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
                      const actualEndStr = field.value;
                      const diff = actualEndStr && actualEndStr !== "" ? Number(actualEndStr) - expectedEnd : 0;

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
                                diff !== 0 && Math.abs(diff) > 0.01 ? "border-red-400 bg-red-50" : ""
                              )}
                              placeholder={expectedEnd.toFixed(2)}
                            />
                          </FormControl>
                          {diff !== 0 && Math.abs(diff) > 0.01 && (
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
                      const actualEndStr = field.value;
                      const diff = actualEndStr && actualEndStr !== "" ? Number(actualEndStr) - expectedEnd : 0;

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
                                diff !== 0 && Math.abs(diff) > 0.01 ? "border-red-400 bg-red-50" : ""
                              )}
                              placeholder={expectedEnd.toFixed(2)}
                            />
                          </FormControl>
                          {diff !== 0 && Math.abs(diff) > 0.01 && (
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

              <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 flex gap-2 items-center">
                <span className="text-lg">ℹ️</span>
                <div>
                  <strong>Nota:</strong> Los saldos finales de las bolsas se guardarán y sugerirán automáticamente como saldos iniciales para el siguiente turno.
                </div>
              </div>

              <Separator className="my-2" />
              <div className="font-semibold mb-2">Cuentas de Bolsa de Saldo</div>

              {/* Selector de cuenta para ventas diarias */}
              <FormField
                control={form.control}
                name="dailySalesAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        日销售账户 (Ventas Diarias)
                        {field.value && (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                            ✓ Ventas Diarias
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={!!pinnedAccounts.dailySales}
                          onCheckedChange={(checked) => field.value && handlePinAccount('dailySales', field.value, checked)}
                          disabled={!field.value}
                          className={cn(pinnedAccounts.dailySales && "bg-blue-600")}
                        />
                        <Pin className={cn("h-4 w-4", pinnedAccounts.dailySales ? "text-blue-600" : "text-muted-foreground")} />
                      </div>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          field.value && "border-green-600 bg-green-50 focus:ring-green-600"
                        )}>
                          <SelectValue placeholder="Selecciona una cuenta para ventas diarias..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <span>{account.name} ({account.type}) | Saldo: {formatCurrency(account.currentBalance || 0)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-[10px] text-muted-foreground">
                      {field.value ? (
                        <>
                          El efectivo de ventas diarias se registrará en esta cuenta.
                          <br />
                          Esta cuenta es independiente de las bolsas de saldo.
                          {pinnedAccounts.dailySales && (
                            <span className="text-blue-600 font-medium"> Esta cuenta está fijada para usar automáticamente en futuros cierres.</span>
                          )}
                        </>
                      ) : (
                        <>
                          Sin cuenta seleccionada para ventas diarias.
                          <br />
                          Selecciona una cuenta para registrar las ventas diarias.
                        </>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selector de cuenta de bolsa de saldo para Recargas */}
              <FormField
                control={form.control}
                name="balanceBagRecargasAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        Bolsa de Saldo - Recargas
                        {field.value && (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                            ✓ Recargas
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={!!pinnedAccounts.recargas}
                          onCheckedChange={(checked) => field.value && handlePinAccount('recargas', field.value, checked)}
                          disabled={!field.value}
                          className={cn(pinnedAccounts.recargas && "bg-blue-600")}
                        />
                        <Pin className={cn("h-4 w-4", pinnedAccounts.recargas ? "text-blue-600" : "text-muted-foreground")} />
                      </div>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          field.value && "border-green-600 bg-green-50 focus:ring-green-600"
                        )}>
                          <SelectValue placeholder="Selecciona una cuenta para la bolsa de Recargas..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <span>{account.name} ({account.type}) | Saldo: {formatCurrency(account.currentBalance || 0)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-[10px] text-muted-foreground">
                      {field.value ? (
                        <>
                          El efectivo de Recargas se depositará en esta cuenta como <strong>Bolsa de Saldo</strong>.
                          <br />
                          Este dinero estará reservado y NO se mezclará con el efectivo operativo.
                          {pinnedAccounts.recargas && (
                            <span className="text-blue-600 font-medium"> Esta cuenta está fijada para usar automáticamente en futuros cierres.</span>
                          )}
                        </>
                      ) : (
                        <>
                          Sin bolsa de saldo seleccionada para Recargas.
                          <br />
                          Usa la bolsa de saldo para mantener dinero de Recargas reservado separado del efectivo disponible.
                        </>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selector de cuenta de bolsa de saldo para MiMovil */}
              <FormField
                control={form.control}
                name="balanceBagMimovilAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        Bolsa de Saldo - MiMovil
                        {field.value && (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                            ✓ MiMovil
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={!!pinnedAccounts.mimovil}
                          onCheckedChange={(checked) => field.value && handlePinAccount('mimovil', field.value, checked)}
                          disabled={!field.value}
                          className={cn(pinnedAccounts.mimovil && "bg-blue-600")}
                        />
                        <Pin className={cn("h-4 w-4", pinnedAccounts.mimovil ? "text-blue-600" : "text-muted-foreground")} />
                      </div>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          field.value && "border-green-600 bg-green-50 focus:ring-green-600"
                        )}>
                          <SelectValue placeholder="Selecciona una cuenta para la bolsa de MiMovil..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <span>{account.name} ({account.type}) | Saldo: {formatCurrency(account.currentBalance || 0)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-[10px] text-muted-foreground">
                      {field.value ? (
                        <>
                          El efectivo de MiMovil se depositará en esta cuenta como <strong>Bolsa de Saldo</strong>.
                          <br />
                          Este dinero estará reservado y NO se mezclará con el efectivo operativo.
                          {pinnedAccounts.mimovil && (
                            <span className="text-blue-600 font-medium"> Esta cuenta está fijada para usar automáticamente en futuros cierres.</span>
                          )}
                        </>
                      ) : (
                        <>
                          Sin bolsa de saldo seleccionada para MiMovil.
                          <br />
                          Usa la bolsa de saldo para mantener dinero de MiMovil reservado separado del efectivo disponible.
                        </>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selector de cuenta de bolsa de saldo para Servicios */}
              <FormField
                control={form.control}
                name="balanceBagServiciosAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        Bolsa de Saldo - Servicios
                        {field.value && (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                            ✓ Servicios
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={!!pinnedAccounts.servicios}
                          onCheckedChange={(checked) => field.value && handlePinAccount('servicios', field.value, checked)}
                          disabled={!field.value}
                          className={cn(pinnedAccounts.servicios && "bg-blue-600")}
                        />
                        <Pin className={cn("h-4 w-4", pinnedAccounts.servicios ? "text-blue-600" : "text-muted-foreground")} />
                      </div>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          field.value && "border-green-600 bg-green-50 focus:ring-green-600"
                        )}>
                          <SelectValue placeholder="Selecciona una cuenta para la bolsa de Servicios..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <span>{account.name} ({account.type}) | Saldo: {formatCurrency(account.currentBalance || 0)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-[10px] text-muted-foreground">
                      {field.value ? (
                        <>
                          El efectivo de Servicios se depositará en esta cuenta como <strong>Bolsa de Saldo</strong>.
                          <br />
                          Este dinero estará reservado y NO se mezclará con el efectivo operativo.
                          {pinnedAccounts.servicios && (
                            <span className="text-blue-600 font-medium"> Esta cuenta está fijada para usar automáticamente en futuros cierres.</span>
                          )}
                        </>
                      ) : (
                        <>
                          Sin bolsa de saldo seleccionada para Servicios.
                          <br />
                          Usa la bolsa de saldo para mantener dinero de Servicios reservado separado del efectivo disponible.
                        </>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />


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
    </Dialog >
  );
}

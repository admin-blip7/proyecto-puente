"use client"

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Pin, Smartphone, Wand2, Wrench, ArrowRight, AlertCircle } from "lucide-react";
import { CashSession } from "@/types";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { getAccounts } from "@/lib/services/accountService";
import { Account } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Configuración de colores para cada bolsa
const BAG_CONFIG = {
  recargas: {
    label: 'Recargas',
    icon: Smartphone,
    emoji: '📱',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-700',
    badgeClass: 'bg-blue-100 text-blue-700',
    selectedBorder: 'border-blue-500',
    selectedBg: 'bg-blue-50',
    inputFocus: 'focus:ring-blue-500 focus:border-blue-500'
  },
  mimovil: {
    label: 'MiMovil',
    icon: Wand2,
    emoji: '🟢',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
    textClass: 'text-green-700',
    badgeClass: 'bg-green-100 text-green-700',
    selectedBorder: 'border-green-500',
    selectedBg: 'bg-green-50',
    inputFocus: 'focus:ring-green-500 focus:border-green-500'
  },
  servicios: {
    label: 'Servicios',
    icon: Wrench,
    emoji: '🔧',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    textClass: 'text-orange-700',
    badgeClass: 'bg-orange-100 text-orange-700',
    selectedBorder: 'border-orange-500',
    selectedBg: 'bg-orange-50',
    inputFocus: 'focus:ring-orange-500 focus:border-orange-500'
  }
} as const;

type BagType = keyof typeof BAG_CONFIG;

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

// Componente de tarjeta para una bolsa con su cuenta
interface BagCardProps {
  bagType: BagType;
  session: CashSession;
  form: ReturnType<typeof useForm<z.infer<ReturnType<typeof createFormSchema>>>>;
  accounts: Account[];
  pinnedAccounts: FixedAccounts;
  onPinAccount: (type: 'recargas' | 'mimovil' | 'servicios' | 'dailySales', accountId: string, isPinned: boolean) => void;
}

function BagCard({ bagType, session, form, accounts, pinnedAccounts, onPinAccount }: BagCardProps) {
  const config = BAG_CONFIG[bagType];
  const saleFieldName = `bag${bagType.charAt(0).toUpperCase() + bagType.slice(1)}Sale` as 'bagRecargasSale' | 'bagMimovilSale' | 'bagServiciosSale';
  const endFieldName = `bag${bagType.charAt(0).toUpperCase() + bagType.slice(1)}ActualEnd` as 'bagRecargasActualEnd' | 'bagMimovilActualEnd' | 'bagServiciosActualEnd';
  const accountFieldName = `balanceBag${bagType.charAt(0).toUpperCase() + bagType.slice(1)}AccountId` as 'balanceBagRecargasAccountId' | 'balanceBagMimovilAccountId' | 'balanceBagServiciosAccountId';

  const startAmount = session.bagsStartAmounts?.[bagType] || 0;
  const saleAmount = form.watch(saleFieldName) || 0;
  const endAmount = startAmount - saleAmount;
  const selectedAccountId = form.watch(accountFieldName);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className={cn(
      "rounded-lg border-2 p-3 space-y-2 transition-all",
      config.borderClass,
      selectedAccountId ? config.selectedBorder : config.borderClass,
      selectedAccountId ? config.bgClass : "bg-white"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.emoji}</span>
          <h4 className={cn("font-semibold text-sm", config.textClass)}>
            {config.label}
          </h4>
        </div>
        {selectedAccountId && (
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs", config.badgeClass)}>
            ✓ {config.label}
          </span>
        )}
      </div>

      {/* Montos */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-1 bg-gray-50 rounded">
          <div className="text-muted-foreground">Inicial</div>
          <div className="font-medium">{formatCurrency(startAmount)}</div>
        </div>
        <div className="text-center p-1 bg-gray-50 rounded">
          <div className="text-muted-foreground">Venta</div>
          <FormField
            control={form.control}
            name={saleFieldName}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    className={cn("h-7 text-xs text-center font-medium", config.inputFocus)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className={cn("text-center p-1 rounded", config.bgClass)}>
          <div className={cn("font-medium", config.textClass)}>Saldo Final</div>
          <div className={cn("font-bold text-sm", config.textClass)}>{formatCurrency(endAmount)}</div>
        </div>
      </div>

      {/* Campo de saldo manual (opcional) */}
      <FormField
        control={form.control}
        name={endFieldName}
        render={({ field }) => {
          const expectedEnd = startAmount - saleAmount;
          const actualEndStr = field.value;
          const diff = actualEndStr && actualEndStr !== "" ? Number(actualEndStr) - expectedEnd : 0;

          return (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  className={cn(
                    "h-7 text-xs",
                    diff !== 0 && Math.abs(diff) > 0.01 ? "border-red-400 bg-red-50" : "",
                    config.inputFocus
                  )}
                  placeholder={`Saldo calculado: ${expectedEnd.toFixed(2)}`}
                />
              </FormControl>
              {diff !== 0 && Math.abs(diff) > 0.01 && (
                <div className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Diferencia: {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                </div>
              )}
            </FormItem>
          )
        }}
      />

      {/* Selector de cuenta */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className={cn("text-xs font-medium", config.textClass)}>
            Cuenta destino
          </label>
          <div className="flex items-center gap-1">
            <Switch
              checked={!!pinnedAccounts[bagType]}
              onCheckedChange={(checked) => selectedAccountId && onPinAccount(bagType, selectedAccountId, checked)}
              disabled={!selectedAccountId}
              className={cn(pinnedAccounts[bagType] && "bg-blue-600")}
            />
            <Pin className={cn("h-3 w-3", pinnedAccounts[bagType] ? "text-blue-600" : "text-muted-foreground")} />
          </div>
        </div>
        <FormField
          control={form.control}
          name={accountFieldName}
          render={({ field }) => (
            <FormItem>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className={cn(
                    "h-8 text-xs",
                    field.value ? config.selectedBorder : "",
                    field.value ? config.selectedBg : "",
                    config.inputFocus
                  )}>
                    <SelectValue placeholder={`Selecciona cuenta para ${config.label}...`} />
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
              <FormMessage />
            </FormItem>
          )}
        />
        {selectedAccount && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            <span>Se depositará {formatCurrency(endAmount)} en <strong>{selectedAccount.name}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CloseCashDrawerDialog({ isOpen, onOpenChange, session, onConfirm }: CloseCashDrawerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [fixedAccounts, setFixedAccounts] = useState<FixedAccounts>({});
  const [pinnedAccounts, setPinnedAccounts] = useState<FixedAccounts>({});

  useEffect(() => {
    if (isOpen) {
      getAccounts()
        .then(setAccounts)
        .catch(console.error);

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
  const cashLeftForNextSession = watch('cashLeftForNextSession', 0);
  const dailySalesAccountId = watch('dailySalesAccountId', '');

  // Verificar si hay alguna bolsa de saldo seleccionada
  const balanceBagRecargasAccountId = watch('balanceBagRecargasAccountId', '');
  const balanceBagMimovilAccountId = watch('balanceBagMimovilAccountId', '');
  const balanceBagServiciosAccountId = watch('balanceBagServiciosAccountId', '');
  const hasAnyBalanceBag = !!balanceBagRecargasAccountId ||
    !!balanceBagMimovilAccountId ||
    !!balanceBagServiciosAccountId;

  // Calcular totales para el resumen
  const bagTotals = useMemo(() => {
    const totals: Record<BagType, { start: number; sale: number; end: number; account?: Account }> = {
      recargas: { start: 0, sale: 0, end: 0 },
      mimovil: { start: 0, sale: 0, end: 0 },
      servicios: { start: 0, sale: 0, end: 0 }
    };

    (['recargas', 'mimovil', 'servicios'] as const).forEach(type => {
      const start = session.bagsStartAmounts?.[type] || 0;
      const saleFieldName = type === 'recargas' ? 'bagRecargasSale' : type === 'mimovil' ? 'bagMimovilSale' : 'bagServiciosSale';
      const sale = watch(saleFieldName) || 0;
      const accountId = watch(`balanceBag${type.charAt(0).toUpperCase() + type.slice(1)}AccountId` as 'balanceBagRecargasAccountId' | 'balanceBagMimovilAccountId' | 'balanceBagServiciosAccountId');
      const account = accounts.find(a => a.id === accountId);

      totals[type] = {
        start,
        sale,
        end: start - sale,
        account: account || undefined
      };
    });

    return totals;
  }, [session, watch, accounts]);

  const netDepositAmount = Math.max(0, actualCashCount - cashLeftForNextSession);
  const dailySalesAccount = accounts.find(a => a.id === dailySalesAccountId);

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
  }, [isOpen, reset, fixedAccounts, pinnedAccounts]);

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
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
            </div>
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

              <Separator />
              <div className="flex items-center gap-2">
                <span className="text-lg">💰</span>
                <h3 className="font-semibold">Bolsas de Saldo</h3>
              </div>

              {/* Tarjetas de bolsas */}
              <div className="space-y-3">
                {(['recargas', 'mimovil', 'servicios'] as const).map(bagType => (
                  <BagCard
                    key={bagType}
                    bagType={bagType}
                    session={session}
                    form={form}
                    accounts={accounts}
                    pinnedAccounts={pinnedAccounts}
                    onPinAccount={handlePinAccount}
                  />
                ))}
              </div>

              {/* Nota informativa */}
              <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 flex gap-2 items-center">
                <span>ℹ️</span>
                <div>
                  <strong>Nota:</strong> Los saldos finales de las bolsas se guardarán y sugerirán automáticamente como saldos iniciales para el siguiente turno.
                </div>
              </div>

              <Separator />
              <div className="flex items-center gap-2">
                <span className="text-lg">🏪</span>
                <h3 className="font-semibold">Ventas Diarias</h3>
              </div>

              {/* Selector de cuenta para ventas diarias */}
              <FormField
                control={form.control}
                name="dailySalesAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        Cuenta para Ventas Diarias
                        {field.value && (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
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
                          field.value && "border-purple-500 bg-purple-50 focus:ring-purple-500"
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
                          Esta cuenta es independiente de las bolsas de saldo.
                          {pinnedAccounts.dailySales && (
                            <span className="text-blue-600 font-medium"> Esta cuenta está fijada para usar automáticamente en futuros cierres.</span>
                          )}
                        </>
                      ) : (
                        <>
                          Sin cuenta seleccionada para ventas diarias.
                          Selecciona una cuenta para registrar las ventas diarias.
                        </>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Panel de resumen de depósitos */}
              {(actualCashCount > 0 || hasAnyBalanceBag) && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <h3 className="font-semibold">Resumen de Depósitos</h3>
                  </div>

                  <div className="bg-gray-50 rounded-lg border p-3 space-y-2 text-sm">
                    {netDepositAmount > 0 && dailySalesAccount && (
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="text-muted-foreground">Ventas Diarias → {dailySalesAccount.name}</span>
                        <span className="font-semibold text-purple-700">{formatCurrency(netDepositAmount)}</span>
                      </div>
                    )}

                    {(['recargas', 'mimovil', 'servicios'] as const).map(type => {
                      const { end, account } = bagTotals[type];
                      if (!account || end <= 0) return null;
                      const config = BAG_CONFIG[type];

                      return (
                        <div key={type} className={cn("flex justify-between items-center py-1", config.textClass)}>
                          <span className="flex items-center gap-1">
                            <span>{config.emoji}</span>
                            <span>{config.label} → {account.name}</span>
                          </span>
                          <span className="font-semibold">{formatCurrency(end)}</span>
                        </div>
                      );
                    })}

                    <div className="flex justify-between items-center py-2 border-t-2 border-gray-300 font-bold">
                      <span>Total a Depositar:</span>
                      <span className="text-lg">
                        {formatCurrency(
                          (dailySalesAccount && netDepositAmount > 0 ? netDepositAmount : 0) +
                          (bagTotals.recargas.account && bagTotals.recargas.end > 0 ? bagTotals.recargas.end : 0) +
                          (bagTotals.mimovil.account && bagTotals.mimovil.end > 0 ? bagTotals.mimovil.end : 0) +
                          (bagTotals.servicios.account && bagTotals.servicios.end > 0 ? bagTotals.servicios.end : 0)
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Diferencia de conteo */}
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
                      <AlertCircle className="h-4 w-4 mt-0.5" />
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
                  {loading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Cerrando...</> : "Confirmar y Cerrar Turno"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog >
  );
}

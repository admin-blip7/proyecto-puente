"use client"

/**
 * CASH FLOAT MANAGEMENT FEATURE
 * 
 * This component implements cash float management for the POS system, allowing
 * retention of change money between shifts without affecting daily sales reporting.
 * 
 * Cash Float Management Workflow:
 * 1. User counts total cash in drawer at end of shift
 * 2. User specifies amount to leave for next shift (closing float)
 * 3. System calculates deposit amount = total cash - closing float
 * 4. Deposit is made to selected account (excludes float money)
 * 5. Opening float for next shift = closing float from previous shift
 * 
 * Key Features:
 * - Closing Float: Amount of change money to leave in drawer (e.g., $100-200)
 * - Net Cash Sales = (Total Cash Counted - Opening Float - Closing Float)
 * - Float money is excluded from daily sales totals
 * - Prevents cash shortage for giving change in next shift
 * 
 * Sales Calculation Formula:
 * Net Cash Sales = Total Cash Counted - Opening Float - Closing Float
 * 
 * This ensures:
 * - Float money doesn't inflate sales figures
 * - Change is always available for transactions
 * - Accurate reporting of actual revenue vs operational cash
 * 
 * Previous complexity eliminated (from refactoring):
 * - Removed all bag cards (recargas, mimovil, servicios)
 * - Removed bag sales tracking and end amount calculations
 * - Removed balance bag account selections
 * 
 * Error handling:
 * - Validates that a deposit account is selected before submission
 * - Validates closing float is non-negative and doesn't exceed cash in drawer
 * - Shows clear error messages for validation failures
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle } from "lucide-react";
import { CashSession } from "@/types";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { getAccounts } from "@/lib/services/accountService";
import { Account } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface CloseCashDrawerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  session: CashSession;
  onConfirm: (actualCash: number, depositAccountId: string, closingFloat: number) => Promise<void>;
}

// CASH FLOAT MANAGEMENT: Form schema with closing float support
// Schema validates cash count, deposit account selection, and closing float amount
// MODIFIED: Removed validation that restricted cash amount to match expected surplus
// Now allows any non-negative value - surplus/shortage is calculated separately
const createFormSchema = (hasCashSales: boolean) => z.object({
  actualCashCount: z.coerce.number()
    .min(0, "El conteo no puede ser negativo.")
    .refine(
      (val) => !hasCashSales || val > 0,
      { message: "Debes ingresar el conteo real de efectivo antes de cerrar." }
    ),
  // CASH FLOAT MANAGEMENT: Closing float field - amount to leave for next shift
  closingFloat: z.coerce.number()
    .min(0, "El efectivo a dejar no puede ser negativo."),
  // Deposit account selection (required)
  depositAccountId: z.string({
    required_error: "Debe seleccionar una cuenta de depósito.",
    invalid_type_error: "ID de cuenta inválido."
  }).min(1, "Debe seleccionar una cuenta de depósito."),
}).superRefine((data, ctx) => {
  // CASH FLOAT MANAGEMENT: Validate closing float doesn't exceed actual cash count
  if (data.closingFloat > data.actualCashCount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El efectivo a dejar no puede exceder el conteo total de efectivo.",
      path: ["closingFloat"],
    });
  }
});

// SIMPLIFICATION: Removed FixedAccounts interface - no longer needed for account pinning
 
export default function CloseCashDrawerDialog({ isOpen, onOpenChange, session, onConfirm }: CloseCashDrawerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [pinnedAccount, setPinnedAccount] = useState<string>("");
  // FIX: Use ref to track if dialog was already open to preserve values during pin operation
  const wasDialogOpen = useRef(false);

  useEffect(() => {
    if (isOpen) {
      getAccounts()
        .then(setAccounts)
        .catch(console.error);

      // Load pinned account from localStorage (simplified - only one account now)
      const saved = localStorage.getItem('fixedDepositAccount');
      if (saved) {
        try {
          setPinnedAccount(saved);
        } catch (e) {
          console.error('Error loading pinned deposit account:', e);
        }
      }
    }
  }, [isOpen]);

  // SIMPLIFICATION: Only need two form fields now
  const hasCashSales = (session.totalCashSales ?? 0) > 0;
  const expectedCash = (session.startingFloat ?? 0) + (session.totalCashSales ?? 0) - (session.totalCashPayouts ?? 0);

  const formSchema = useMemo(() => createFormSchema(hasCashSales), [hasCashSales]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actualCashCount: 0,
      closingFloat: 0, // CASH FLOAT MANAGEMENT: Default to 0, user can adjust
      depositAccountId: pinnedAccount || "",
    }
  });

  const { watch, reset } = form;
  const actualCashCount = watch('actualCashCount', 0);
  const closingFloat = watch('closingFloat', 0);
  const depositAccountId = watch('depositAccountId', '');

  const selectedAccount = accounts.find(a => a.id === depositAccountId);

  // Toggle for pinning single deposit account
  const handlePinAccount = (accountId: string, isPinned: boolean) => {
    if (isPinned) {
      setPinnedAccount(accountId);
      localStorage.setItem('fixedDepositAccount', accountId);
    } else {
      setPinnedAccount("");
      localStorage.removeItem('fixedDepositAccount');
    }
  };

  // FIX: Preserve form values when pinning account - only reset when dialog opens
  // BUG: The issue was that pinnedAccount change was triggering form reset, wiping entered values
  // SOLUTION: Use ref to track if dialog was already open, only reset on initial open
  useEffect(() => {
    if (isOpen && !wasDialogOpen.current) {
      // First time opening the dialog - reset all values to 0
      reset({
        actualCashCount: 0,
        closingFloat: 0,
        depositAccountId: pinnedAccount || "",
      });
      wasDialogOpen.current = true;
    } else if (isOpen && wasDialogOpen.current) {
      // Dialog was already open - preserve cash amounts when pinning account
      const currentValues = form.getValues();
      reset({
        actualCashCount: currentValues.actualCashCount || 0,
        closingFloat: currentValues.closingFloat || 0,
        depositAccountId: pinnedAccount || "",
      });
    } else if (!isOpen) {
      // Dialog closed - reset flag for next open
      wasDialogOpen.current = false;
    }
  }, [isOpen, reset, pinnedAccount, form]);

  const expectedCashInDrawer = useMemo(() => {
    return session.startingFloat + session.totalCashSales - session.totalCashPayouts;
  }, [session]);

  const difference = useMemo(() => {
     return actualCashCount - expectedCashInDrawer;
  }, [actualCashCount, expectedCashInDrawer]);

  // Calculate variance classification for clearer display
  const varianceType = useMemo(() => {
    if (difference === 0) return 'balanced';
    return difference > 0 ? 'surplus' : 'shortage';
  }, [difference]);

  // CASH FLOAT MANAGEMENT: Calculate deposit amount (cash to deposit, excluding float)
  const depositAmount = useMemo(() => {
    return actualCashCount - closingFloat;
  }, [actualCashCount, closingFloat]);

  // CASH FLOAT MANAGEMENT: Calculate net cash sales for reporting
  // Formula: Net Cash Sales = (Total Cash Counted - Opening Float - Closing Float)
  const netCashSales = useMemo(() => {
    return actualCashCount - session.startingFloat - closingFloat;
  }, [actualCashCount, session.startingFloat, closingFloat]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      // CASH FLOAT MANAGEMENT: Pass closing float to persist amount left for next shift
      // Deposit amount will be: actualCashCount - closingFloat
      await onConfirm(values.actualCashCount, values.depositAccountId, values.closingFloat);
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
            Confirma el total de efectivo y selecciona la cuenta de depósito para cerrar el turno.
            <br />
            <span className="text-amber-600">Especifica el cambio a dejar para el siguiente turno.</span>
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
                    <FormLabel>Conteo de Efectivo Real (Total en Caja)</FormLabel>
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

              {/* CASH FLOAT MANAGEMENT: Closing float input field */}
              <FormField
                control={form.control}
                name="closingFloat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Cambio a Dejar (Fondo para Siguiente Turno)
                      <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs">
                        ⚡ Float
                      </div>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input
                          className="pl-7 bg-amber-50 border-amber-200 focus:ring-amber-500"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este dinero se quedará en la caja para dar cambio en el siguiente turno.
                      <br />
                      <strong className="text-amber-700">No se contará como venta.</strong>
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Single deposit account selector */}
              <FormField
                control={form.control}
                name="depositAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        Cuenta de Depósito
                        {field.value && (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                            ✓ Cuenta Seleccionada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={pinnedAccount === field.value}
                          onCheckedChange={(checked) => field.value && handlePinAccount(field.value, checked)}
                          disabled={!field.value}
                          className={cn(pinnedAccount === field.value && "bg-blue-600")}
                        />
                      </div>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          field.value && "border-blue-500 bg-blue-50 focus:ring-blue-500"
                        )}>
                          <SelectValue placeholder="Selecciona cuenta de depósito..." />
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
                    {field.value && (
                      <div className="text-xs text-muted-foreground mt-1">
                        El efectivo neto ({formatCurrency(depositAmount)}) se depositará en <strong>{selectedAccount?.name}</strong>.
                        {closingFloat > 0 && (
                          <span className="text-amber-600 font-medium block mt-1"> {formatCurrency(closingFloat)} se quedará en caja como fondo.</span>
                        )}
                        {pinnedAccount === field.value && (
                          <span className="text-blue-600 font-medium block mt-1"> Esta cuenta está fijada para uso automático.</span>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CASH FLOAT MANAGEMENT: Updated deposit summary panel */}
              {actualCashCount > 0 && selectedAccount && (
                <>
                  <Separator />
                  <div className="bg-gray-50 rounded-lg border p-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📋</span>
                      <h3 className="font-semibold">Resumen del Depósito</h3>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-muted-foreground">Total Efectivo Contado:</span>
                      <span className="font-semibold">{formatCurrency(actualCashCount)}</span>
                    </div>
                    {closingFloat > 0 && (
                      <div className="flex justify-between items-center py-1 border-b border-gray-200">
                        <span className="text-muted-foreground">Menos Cambio a Dejar:</span>
                        <span className="font-semibold text-amber-600">- {formatCurrency(closingFloat)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1 border-b border-gray-200">
                      <span className="text-muted-foreground font-medium">Total a Depositar → {selectedAccount.name}</span>
                      <span className="font-bold text-lg text-blue-700">{formatCurrency(depositAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 bg-amber-50 rounded p-2">
                      <span className="text-muted-foreground text-xs">Ventas Netas de Efectivo (para reporte):</span>
                      <span className="font-bold text-amber-700">{formatCurrency(netCashSales)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      * El cambio a dejar ({formatCurrency(closingFloat)}) se quedará en la caja para el siguiente turno.
                    </p>
                  </div>
                </>
              )}

              {/* Variance Analysis: Expected vs Actual with clear surplus/shortage classification */}
              {actualCashCount > 0 && (
                <div className={cn(
                  "flex flex-col gap-3 p-4 rounded-md border",
                  varianceType === 'balanced' && "bg-slate-50 border-slate-200",
                  varianceType === 'surplus' && "bg-green-50 text-green-900 border-green-300",
                  varianceType === 'shortage' && "bg-red-50 text-red-900 border-red-300",
                )}>
                  {/* Section Header */}
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-300">
                    <span className="text-lg font-bold flex items-center gap-2">
                      {varianceType === 'balanced' && '⚖️'}
                      {varianceType === 'surplus' && '📈'}
                      {varianceType === 'shortage' && '📉'}
                      Análisis de Variación
                    </span>
                  </div>

                  {/* Expected vs Actual Comparison */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 bg-white/50 rounded px-3">
                      <span className="text-sm font-semibold">Efectivo Esperado:</span>
                      <span className="text-lg font-bold">{formatCurrency(expectedCashInDrawer)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-white/50 rounded px-3">
                      <span className="text-sm font-semibold">Efectivo Contado:</span>
                      <span className="text-lg font-bold">{formatCurrency(actualCashCount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-t-2 border-gray-300">
                      <span className={cn(
                        "text-base font-bold",
                        varianceType === 'surplus' && "text-green-700",
                        varianceType === 'shortage' && "text-red-700",
                        varianceType === 'balanced' && "text-slate-700"
                      )}>
                        {varianceType === 'balanced' && 'Cuenta Equilibrada'}
                        {varianceType === 'surplus' && 'SOBRANTE (Exceso)'}
                        {varianceType === 'shortage' && 'FALTANTE (Déficit)'}
                      </span>
                      <span className={cn(
                        "text-2xl font-bold",
                        varianceType === 'surplus' && "text-green-800",
                        varianceType === 'shortage' && "text-red-800",
                        varianceType === 'balanced' && "text-slate-800"
                      )}>
                        {difference >= 0 ? '+' : '-'}{formatCurrency(Math.abs(difference))}
                      </span>
                    </div>

                    {/* Detailed variance explanation */}
                    {difference !== 0 && (
                      <div className="flex items-start gap-2 p-3 bg-white/50 rounded text-sm">
                        <AlertCircle className={cn(
                          "h-5 w-5 flex-shrink-0 mt-0.5",
                          varianceType === 'surplus' && "text-green-600",
                          varianceType === 'shortage' && "text-red-600"
                        )} />
                        <div className="flex-1">
                          <p className="font-semibold text-base">
                            {varianceType === 'surplus' && 'Hay un sobrante de efectivo'}
                            {varianceType === 'shortage' && 'Hay un faltante de efectivo'}
                          </p>
                          <p className="mt-1">
                            La diferencia es de <span className="font-bold">{formatCurrency(Math.abs(difference))}</span>.
                            {varianceType === 'surplus' && (
                              <span className="text-green-700">Este exceso se ha depositado correctamente.</span>
                            )}
                            {varianceType === 'shortage' && (
                              <span className="text-red-700">Este faltante debe ser registrado y investigado.</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Zero variance - balanced message */}
                    {difference === 0 && (
                      <div className="flex items-start gap-2 p-3 bg-white/50 rounded text-sm">
                        <div className="text-green-600 font-bold">✓</div>
                        <div className="flex-1">
                          <p className="font-semibold text-base">El conteo es exacto</p>
                          <p className="mt-1">No hay variación entre el efectivo esperado y el contado.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
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

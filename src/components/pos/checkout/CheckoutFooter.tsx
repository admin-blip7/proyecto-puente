"use client";

import { ShieldCheck, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutFooterProps {
    totalAmount: number;
    totalUnits: number;
    appliedDiscount?: { code: string; percentage: number } | null;
    loading: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    canConfirm: boolean;
    missingCustomer?: boolean;
}

export function CheckoutFooter({
    totalAmount,
    totalUnits,
    appliedDiscount,
    loading,
    onCancel,
    onConfirm,
    canConfirm,
    missingCustomer
}: CheckoutFooterProps) {
    return (
        <div className="p-8 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] dark:shadow-none space-y-6">
            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total a Pagar</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-zinc-900 dark:text-zinc-100">$</span>
                        <span className="text-5xl font-black text-zinc-900 dark:text-zinc-100 antialiased">{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Artículos</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{totalUnits < 10 ? `0${totalUnits}` : totalUnits} Unidades</p>
                </div>
            </div>

            {/* Missing Customer Warning */}
            {missingCustomer && (
                <div className="flex items-center gap-3 text-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-bold">Debe seleccionar o ingresar un cliente para completar la venta</span>
                </div>
            )}

            {/* Discount Badge if any */}
            {appliedDiscount && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-2xl border border-green-100 dark:border-green-800 w-fit">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Descuento Aplicado: {appliedDiscount.code} (-{appliedDiscount.percentage}%)</span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <Button
                    variant="ghost"
                    className="h-16 rounded-2xl text-zinc-500 font-black uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button
                    className="h-16 rounded-2xl bg-zinc-900 hover:bg-black dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-black uppercase tracking-widest text-lg transition-all shadow-xl shadow-zinc-200 dark:shadow-none disabled:bg-zinc-200 disabled:shadow-none group"
                    onClick={onConfirm}
                    disabled={loading || !canConfirm}
                >
                    {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2">
                            Confirmar Venta
                            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
}

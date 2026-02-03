"use client";

import { Banknote, CreditCard, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency } from "@/lib/utils";

interface PaymentMethodSectionProps {
    paymentMethod: 'Efectivo' | 'Tarjeta de Crédito' | 'Transferencia/QR';
    setPaymentMethod: (method: 'Efectivo' | 'Tarjeta de Crédito' | 'Transferencia/QR') => void;
    amountPaid: number;
    setAmountPaid: (amount: number) => void;
    change: number;
}

export function PaymentMethodSection({
    paymentMethod,
    setPaymentMethod,
    amountPaid,
    setAmountPaid,
    change
}: PaymentMethodSectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-zinc-900 dark:text-zinc-400" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Método de Pago</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {[
                    { id: 'Efectivo', label: 'Efectivo', icon: Banknote },
                    { id: 'Tarjeta de Crédito', label: 'Tarjeta', icon: CreditCard },
                    { id: 'Transferencia/QR', label: 'Transferencia/QR', icon: QrCode },
                ].map((method) => (
                    <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all gap-3 h-32",
                            paymentMethod === method.id
                                ? "border-zinc-900 bg-zinc-900 text-white shadow-lg shadow-zinc-200 dark:shadow-none"
                                : "border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 text-zinc-400 hover:border-zinc-200 dark:hover:border-zinc-700"
                        )}
                    >
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center transition-colors",
                            paymentMethod === method.id ? "bg-white/20" : "bg-white dark:bg-zinc-800 shadow-sm"
                        )}>
                            <method.icon className={cn("h-6 w-6", paymentMethod === method.id ? "text-white" : "text-zinc-900 dark:text-zinc-100")} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest">{method.label}</span>
                    </button>
                ))}
            </div>

            {paymentMethod === 'Efectivo' && (
                <div className="mt-6 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 space-y-4 shadow-inner">
                    <div className="space-y-2">
                        <Label htmlFor="amountPaid" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Monto Pagado por el Cliente</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-zinc-900 dark:text-zinc-100">$</span>
                            <Input
                                id="amountPaid"
                                type="number"
                                placeholder="0.00"
                                value={amountPaid || ''}
                                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                className="h-16 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-10 text-2xl font-black text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 transition-all"
                            />
                        </div>
                    </div>

                    {amountPaid > 0 && (
                        <div className="flex justify-between items-center px-2">
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
                                {change >= 0 ? "Cambio a Devolver" : "Faltante"}
                            </span>
                            <span className={cn(
                                "text-xl font-black",
                                change >= 0 ? "text-green-600" : "text-red-500"
                            )}>
                                {formatCurrency(Math.abs(change))}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

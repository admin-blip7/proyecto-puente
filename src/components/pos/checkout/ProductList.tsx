"use client";

import { Package, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CartItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ProductListProps {
    cartItems: CartItem[];
    serials: Record<string, string[]>;
    handleSerialChange: (productId: string, index: number, value: string) => void;
}

export function ProductList({ cartItems, serials, handleSerialChange }: ProductListProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-zinc-900 dark:text-zinc-400" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Detalles de Productos</h3>
            </div>
            <div className="space-y-3">
                {cartItems.map(item => (
                    <div key={item.id} className="p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h4 className="font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight mb-0.5">{item.name}</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    {item.category || "General"} • {item.quantity} {item.quantity === 1 ? 'Unidad' : 'Unidades'}
                                </p>
                            </div>
                            <span className="font-black text-zinc-900 dark:text-zinc-100 ml-4">
                                {formatCurrency(item.price * item.quantity)}
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Números de Serie / IMEI</Label>
                                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Opcional</span>
                            </div>
                            <div className="space-y-2">
                                {Array.from({ length: item.quantity }).map((_, index) => (
                                    <div key={`${item.id}-${index}`} className="relative group">
                                        <Input
                                            placeholder={`Ingrese Serie/IMEI #${index + 1}...`}
                                            value={serials[item.id]?.[index] || ''}
                                            onChange={(e) => handleSerialChange(item.id, index, e.target.value)}
                                            className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 px-4 font-semibold pr-10 focus:ring-zinc-900"
                                        />
                                        <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

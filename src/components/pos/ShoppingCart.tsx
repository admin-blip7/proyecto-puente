"use client";

import { CartItem, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreHorizontal, Plus, Minus, ScanBarcode, User, Package, X, Loader2 } from "lucide-react";
import { formatCurrency } from '@/lib/utils';
import CheckoutDialog from "./CheckoutDialog";
import { useState } from "react";
import QuickExpenseDialog from "./QuickExpenseDialog";
import { useAuth } from "@/lib/hooks";
import { addExpense } from "@/lib/services/financeService";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { validateDiscountCode } from "@/lib/services/settingsService";
import { Pencil } from "lucide-react";

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice?: (productId: string, newPrice: number) => void;
  onClearCart: () => void;
  isSheet?: boolean;
  selectedCartItem: CartItem | null;
  onSelectItem: (item: CartItem) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onCloseSession: () => void;
  onSuccessfulSale?: () => void | Promise<void>;
  activeSessionId?: string;
}

export default function ShoppingCart({
  cartItems,
  onUpdateQuantity,
  onUpdatePrice,
  onClearCart,
  onCloseSession,
  onSuccessfulSale,
  activeSessionId,
}: ShoppingCartProps) {
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  const [discountPopoverOpen, setDiscountPopoverOpen] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, percentage: number } | null>(null);
  // Price editing state
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>("");
  const { toast } = useToast();
  const { userProfile } = useAuth();

  // Calculate totals with dynamic discount (prices already include IVA)
  const itemsTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const discountRate = appliedDiscount ? appliedDiscount.percentage / 100 : 0;
  const discountAmount = itemsTotal * discountRate;
  const totalAmount = itemsTotal - discountAmount; // No tax added - prices already include IVA

  const handleApplyDiscountCode = async () => {
    if (!discountCodeInput.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Ingresa un código de descuento" });
      return;
    }
    setValidatingDiscount(true);
    try {
      const result = await validateDiscountCode(discountCodeInput);
      if (result.valid && result.discount) {
        setAppliedDiscount({
          code: result.discount.discountCode,
          percentage: result.discount.discountPercentage
        });
        setDiscountPopoverOpen(false);
        setDiscountCodeInput("");
        toast({ title: "Descuento aplicado", description: `${result.discount.discountPercentage}% de descuento aplicado` });
      } else {
        toast({ variant: "destructive", title: "Código inválido", description: result.error });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Error al validar el código" });
    } finally {
      setValidatingDiscount(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    toast({ title: "Descuento eliminado" });
  };

  // Handle price edit
  const handleStartPriceEdit = (item: CartItem) => {
    setEditingPriceItemId(item.id);
    setEditingPriceValue(item.price.toString());
  };

  const handleSavePriceEdit = (itemId: string, originalPrice: number) => {
    const newPrice = parseFloat(editingPriceValue);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ variant: "destructive", title: "Error", description: "Precio inválido" });
      return;
    }
    if (onUpdatePrice) {
      onUpdatePrice(itemId, newPrice);
      if (newPrice < originalPrice) {
        toast({ title: "Descuento aplicado", description: `Precio modificado de ${formatCurrency(originalPrice)} a ${formatCurrency(newPrice)}` });
      } else {
        toast({ title: "Precio actualizado" });
      }
    }
    setEditingPriceItemId(null);
    setEditingPriceValue("");
  };

  const handleCancelPriceEdit = () => {
    setEditingPriceItemId(null);
    setEditingPriceValue("");
  };

  const handleSuccessfulSale = () => {
    onClearCart();
    setAppliedDiscount(null); // Clear discount after successful sale
    setCheckoutOpen(false);
    if (onSuccessfulSale) {
      onSuccessfulSale();
    }
  };

  const handleExpenseAdded = async (description: string, amount: number, category: string) => {
    if (!userProfile) return;
    try {
      // ... (existing logic for expenses)
      const { getAccounts, addAccount } = await import("@/lib/services/accountService");
      const accounts = await getAccounts();
      let cashAccount = accounts.find(acc =>
        acc.name.toLowerCase().includes('caja') ||
        acc.name.toLowerCase().includes('cash') ||
        acc.name.toLowerCase().includes('drawer')
      );
      if (!cashAccount && accounts.length > 0) cashAccount = accounts[0];
      if (!cashAccount) {
        cashAccount = await addAccount({ name: 'Caja Principal', type: 'Efectivo', currentBalance: 0 });
      }
      await addExpense({ description, amount, category, paidFromAccountId: cashAccount.id }, undefined, userProfile.uid);
      setExpenseOpen(false);
      toast({ title: "Gasto Registrado", description: "Gasto registrado exitosamente." });
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: "No se pudo registrar el gasto." });
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-card">
      {/* Header */}
      <div className="p-6 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Details</h2>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-900 dark:hover:text-white" onClick={onCloseSession} title="Cerrar Turno / Opciones">
            <MoreHorizontal className="w-6 h-6" />
          </Button>
        </div>

      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 custom-scrollbar">
        {cartItems.map((item) => (
          <div className="flex gap-4" key={item.id}>
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center p-2 flex-shrink-0 border border-gray-100 dark:border-gray-700 overflow-hidden">
              {item.imageUrls && item.imageUrls[0] ? (
                <Image
                  src={item.imageUrls[0]}
                  alt={item.name}
                  width={60}
                  height={60}
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
              ) : (
                <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              )}
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">{item.name}</h4>
              </div>
              <div className="flex items-center justify-between mt-2">
                {/* Editable Price */}
                {onUpdatePrice ? (
                  <Popover
                    open={editingPriceItemId === item.id}
                    onOpenChange={(open) => {
                      if (open) handleStartPriceEdit(item);
                      else handleCancelPriceEdit();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 group">
                        <span className="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {formatCurrency(item.price)}
                        </span>
                        <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-3" align="start">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">Modificar Precio</div>
                        <Input
                          id={`edit-price-${item.id}`}
                          aria-label="Modificar precio"
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingPriceValue}
                          onChange={(e) => setEditingPriceValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              // Get original price from products if available
                              handleSavePriceEdit(item.id, item.cost || item.price);
                            } else if (e.key === "Escape") {
                              handleCancelPriceEdit();
                            }
                          }}
                          className="h-8"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => handleSavePriceEdit(item.id, item.cost || item.price)}
                          >
                            Aplicar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={handleCancelPriceEdit}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span className="text-base font-bold text-gray-900 dark:text-white">{formatCurrency(item.price)}</span>
                )}
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                  <button
                    className="w-6 h-6 flex items-center justify-center bg-white dark:bg-card rounded shadow-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors text-xs"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-semibold w-4 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                  <button
                    className="w-6 h-6 flex items-center justify-center bg-white dark:bg-card rounded shadow-sm text-gray-600 dark:text-gray-300 hover:text-primary transition-colors text-xs"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {cartItems.length === 0 && (
          <div className="text-center text-gray-400 py-10 italic">
            Carrito vacío
          </div>
        )}
      </div>

      {/* Footer / Totals */}
      <div className="p-6 bg-white dark:bg-card border-t border-border-light dark:border-border shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] z-10 flex-shrink-0">
        {/* Promo / Discount Section */}
        <div className={cn(
          "flex items-center justify-between border border-dashed rounded-xl p-3 mb-4",
          appliedDiscount
            ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        )}>
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              appliedDiscount ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"
            )}>%</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {appliedDiscount ? `${appliedDiscount.code} (-${appliedDiscount.percentage}%)` : "Sin descuento"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {appliedDiscount ? (
              <button
                onClick={handleRemoveDiscount}
                className="text-xs font-semibold text-red-500 bg-white dark:bg-card border border-red-200 dark:border-red-700 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Quitar
              </button>
            ) : (
              <Popover open={discountPopoverOpen} onOpenChange={setDiscountPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-card border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-lg hover:text-primary hover:border-primary transition-colors">
                    Aplicar Código
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4" align="end">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Código de Descuento</div>
                    <Input
                      id="discountCode"
                      aria-label="Código de descuento"
                      placeholder="Ingresa el código"
                      value={discountCodeInput}
                      onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                      className="uppercase"
                      onKeyDown={(e) => e.key === "Enter" && handleApplyDiscountCode()}
                    />
                    <Button
                      onClick={handleApplyDiscountCode}
                      disabled={validatingDiscount || !discountCodeInput.trim()}
                      className="w-full"
                      size="sm"
                    >
                      {validatingDiscount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Subtotal (IVA incluido)</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(itemsTotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Descuento</span>
              <span className="font-medium text-red-500">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>
          <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white">
            <span>Total a Pagar</span>
            <span className="text-xl">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setCheckoutOpen(true)}
            disabled={cartItems.length === 0}
            className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Process Transactions
          </button>
          {/* Expense Button - Matching style but secondary */}
          {/* <button className="..." onClick={() => setExpenseOpen(true)} title="Registrar Gasto">
                 <Receipt ... />
             </button> */}
        </div>

        <div className="mt-2 text-center">
          <button onClick={() => setExpenseOpen(true)} className="text-xs text-gray-400 hover:text-primary hover:underline transition-colors">
            Registrar Gasto Rápido
          </button>
        </div>
      </div>

      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onOpenChange={setCheckoutOpen}
        cartItems={cartItems}
        totalAmount={totalAmount}
        onSuccessfulSale={handleSuccessfulSale}
        activeSessionId={activeSessionId}
        appliedDiscount={appliedDiscount}
        subtotal={itemsTotal}
        discountAmount={discountAmount}
      />

      <QuickExpenseDialog
        isOpen={isExpenseOpen}
        onOpenChange={setExpenseOpen}
        onExpenseAdded={handleExpenseAdded}
      />
    </div>
  );
}

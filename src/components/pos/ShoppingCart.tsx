"use client";

import { CartItem, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MinusCircle, PlusCircle, Receipt, Package, LogOut, CreditCard } from "lucide-react";
import { formatCurrency } from '@/lib/utils';
import CheckoutDialog from "./CheckoutDialog";
import { useState, useMemo } from "react";
import { Separator } from "../ui/separator";
import QuickExpenseDialog from "./QuickExpenseDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/hooks";
import { addExpense } from "@/lib/services/financeService";

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  isSheet?: boolean;
  selectedCartItem: CartItem | null;
  onSelectItem: (item: CartItem) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  onCloseSession: () => void;
  onFinanceSale: () => void;
  onSuccessfulSale?: () => void | Promise<void>;
}

export default function ShoppingCart({ 
  cartItems, 
  onUpdateQuantity, 
  onClearCart, 
  isSheet = false, 
  selectedCartItem, 
  onSelectItem,
  onAddToCart,
  onCloseSession,
  onFinanceSale,
  onSuccessfulSale,
}: ShoppingCartProps) {
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();
  
  

  const itemsTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const discount = 0; // Placeholder for future discount logic
  const totalAmount = itemsTotal - discount;

  const handleSuccessfulSale = () => {
    onClearCart();
    setCheckoutOpen(false);
    // Call the product refresh callback if provided
    if (onSuccessfulSale) {
      onSuccessfulSale();
    }
  };

  const handleExpenseAdded = async (description: string, amount: number, category: string) => {
    if (!userProfile) return;
    try {
      // Try to find a cash account to use as the source for the expense
      const { getAccounts, addAccount } = await import("@/lib/services/accountService");
      const accounts = await getAccounts();
      
      // Look for a cash drawer account (one that contains "caja" or "cash" in the name)
      let cashAccount = accounts.find(acc => 
        acc.name.toLowerCase().includes('caja') || 
        acc.name.toLowerCase().includes('cash') ||
        acc.name.toLowerCase().includes('drawer')
      );
      
      // If no cash account found, use the first available account as fallback
      if (!cashAccount && accounts.length > 0) {
        cashAccount = accounts[0];
      }
      
      // If no accounts exist, create a default cash account
      if (!cashAccount) {
        cashAccount = await addAccount({
          name: 'Caja Principal',
          type: 'Efectivo',
          currentBalance: 0
        });
        toast({
          title: "Cuenta Creada",
          description: "Se creó una cuenta de caja principal para registrar el gasto."
        });
      }
      
      await addExpense({ 
        description, 
        amount, 
        category, 
        paidFromAccountId: cashAccount.id 
      }, undefined, userProfile.uid);
      
      toast({
          title: "Gasto Registrado",
          description: `El gasto ha sido registrado exitosamente desde ${cashAccount.name}.`
      });
      setExpenseOpen(false);
    } catch(error) {
        console.error(error);
        toast({ 
          variant: 'destructive', 
          title: "Error", 
          description: "No se pudo registrar el gasto. Intente recargar la página." 
        });
    }
  }
  
  const canFinanceSale = useMemo(() => {
    if (cartItems.length !== 1) return false;
    return cartItems[0].quantity === 1;
  }, [cartItems]);


  const renderCartContent = () => (
    <ScrollArea className="h-full">
      <div className="px-6">
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-muted-foreground">Tu carrito está vacío.</p>
          </div>
        ) : (
          <div className="divide-y">
            {cartItems.map((item) => (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center gap-4 py-4 cursor-pointer rounded-lg -mx-2 px-2",
                  selectedCartItem?.id === item.id && "bg-primary/10"
                )}
                onClick={() => onSelectItem(item)}
              >
                <div className="flex-1 space-y-1">
                  <p className="font-semibold leading-tight">{item.name}</p>
                  <p className="font-bold text-primary">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, item.quantity - 1);}}>
                    <MinusCircle className="w-5 h-5" />
                  </Button>
                  <span className="font-bold w-4 text-center">{item.quantity}</span>
                  <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, item.quantity + 1);}}>
                    <PlusCircle className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );


  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-none rounded-none">
        <CardHeader className="p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold tracking-tight">Mi Pedido</CardTitle>
          <Button variant="outline" size="sm" onClick={onCloseSession}>
            <LogOut className="mr-2 h-4 w-4" />
            Hacer Corte
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          {isMobile ? (
             <Tabs defaultValue="cart" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-1 mx-auto sticky top-0 px-6">
                    <TabsTrigger value="cart">Mi Pedido</TabsTrigger>
                </TabsList>
                <TabsContent value="cart" className="flex-1 overflow-y-auto">{renderCartContent()}</TabsContent>
            </Tabs>
          ) : (
            renderCartContent()
          )}
        </CardContent>
        
        <CardFooter className="flex-col gap-4 p-6 border-t mt-auto">
          {cartItems.length > 0 && (
            <>
              <div className="w-full flex justify-between text-muted-foreground">
                <span>Items</span>
                <span>{formatCurrency(itemsTotal)}</span>
              </div>
              <div className="w-full flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
              <Separator />
              <div className="w-full flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </>
          )}

          <div className="w-full grid grid-cols-1 gap-2">
            <Button className="w-full" size="lg" onClick={() => setCheckoutOpen(true)} disabled={cartItems.length === 0}>
              Checkout
            </Button>
             <Button className="w-full" variant="secondary" onClick={onFinanceSale} disabled={!canFinanceSale}>
                <CreditCard className="mr-2" />
                Vender a Crédito
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setExpenseOpen(true)}>
              <Receipt className="mr-2" />
              Registrar Gasto Rápido
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onOpenChange={setCheckoutOpen}
        cartItems={cartItems}
        totalAmount={totalAmount}
        onSuccessfulSale={handleSuccessfulSale}
      />

      <QuickExpenseDialog 
        isOpen={isExpenseOpen}
        onOpenChange={setExpenseOpen}
        onExpenseAdded={handleExpenseAdded}
      />
    </>
  );
}

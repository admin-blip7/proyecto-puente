"use client";

import { CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { MinusCircle, PlusCircle, Receipt } from "lucide-react";
import CheckoutDialog from "./CheckoutDialog";
import { useState } from "react";
import { Separator } from "../ui/separator";
import QuickExpenseDialog from "./QuickExpenseDialog";
import { useToast } from "@/hooks/use-toast";

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  isSheet?: boolean;
}

export default function ShoppingCart({ cartItems, onUpdateQuantity, onClearCart, isSheet = false }: ShoppingCartProps) {
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  const { toast } = useToast();

  const itemsTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const discount = 0; // Placeholder for future discount logic
  const totalAmount = itemsTotal - discount;

  const handleSuccessfulSale = () => {
    onClearCart();
    setCheckoutOpen(false);
  };

  const handleExpenseAdded = () => {
    toast({
      title: "Gasto Registrado",
      description: "El gasto ha sido registrado exitosamente desde la caja."
    });
    setExpenseOpen(false);
  }

  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-none rounded-none">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl font-bold tracking-tight">My Order</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-full">
            <div className="px-6">
                {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <p className="text-muted-foreground">Your cart is empty.</p>
                </div>
                ) : (
                <div className="divide-y">
                    {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-4">
                        <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="rounded-lg object-cover h-14 w-14"
                        data-ai-hint={`${item.category} product`}
                        />
                        <div className="flex-1 space-y-1">
                        <p className="font-semibold leading-tight">{item.name}</p>
                        <p className="font-bold text-primary">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                                <MinusCircle className="w-5 h-5" />
                            </Button>
                            <span className="font-bold w-4 text-center">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                                <PlusCircle className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="flex-col gap-4 p-6 border-t mt-auto">
          {cartItems.length > 0 && (
            <>
              <div className="w-full flex justify-between text-muted-foreground">
                <span>Items</span>
                <span>${itemsTotal.toFixed(2)}</span>
              </div>
              <div className="w-full flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="w-full flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </>
          )}

          <div className="w-full grid grid-cols-1 gap-2">
            <Button className="w-full" size="lg" onClick={() => setCheckoutOpen(true)} disabled={cartItems.length === 0}>
              Checkout
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

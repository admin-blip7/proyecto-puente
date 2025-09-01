"use client";

import { CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Trash2, X } from "lucide-react";
import { Separator } from "../ui/separator";
import CheckoutDialog from "./CheckoutDialog";
import { useState } from "react";

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
}

export default function ShoppingCart({ cartItems, onUpdateQuantity, onClearCart }: ShoppingCartProps) {
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);

  const totalAmount = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const handleSuccessfulSale = () => {
    onClearCart();
    setCheckoutOpen(false);
  };

  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-none rounded-none">
        <CardHeader className="flex-row items-center justify-between border-b p-4">
          <CardTitle className="text-lg font-headline">Carrito de Compras</CardTitle>
          {cartItems.length > 0 && (
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearCart}>
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Limpiar Carrito</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-full">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-muted-foreground">Tu carrito está vacío.</p>
                <p className="text-sm text-muted-foreground/80">Agrega productos desde el panel izquierdo.</p>
              </div>
            ) : (
              <div className="divide-y">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="rounded-md object-cover h-16 w-16"
                       data-ai-hint={`${item.category} product`}
                    />
                    <div className="flex-1 space-y-1">
                      <p className="font-medium leading-tight">{item.name}</p>
                      <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value, 10))}
                          className="h-8 w-20"
                          min="0"
                          max={item.stock}
                        />
                      </div>
                    </div>
                    <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onUpdateQuantity(item.id, 0)}>
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remover item</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        {cartItems.length > 0 && (
          <CardFooter className="flex-col gap-4 p-4 border-t mt-auto">
            <div className="w-full flex justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>${totalAmount.toFixed(2)}</span>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg" onClick={() => setCheckoutOpen(true)}>
              Finalizar Venta
            </Button>
          </CardFooter>
        )}
      </Card>
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onOpenChange={setCheckoutOpen}
        cartItems={cartItems}
        totalAmount={totalAmount}
        onSuccessfulSale={handleSuccessfulSale}
      />
    </>
  );
}

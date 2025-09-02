"use client";

import { CartItem, SuggestedProduct, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { MinusCircle, PlusCircle, Receipt, Wand2, Package } from "lucide-react";
import CheckoutDialog from "./CheckoutDialog";
import { useState, useMemo } from "react";
import { Separator } from "../ui/separator";
import QuickExpenseDialog from "./QuickExpenseDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  isSheet?: boolean;
  selectedCartItem: CartItem | null;
  onSelectItem: (item: CartItem) => void;
  suggestedProducts: SuggestedProduct[];
  onAddToCart: (product: Product | SuggestedProduct, quantity?: number) => void;
}

export default function ShoppingCart({ 
  cartItems, 
  onUpdateQuantity, 
  onClearCart, 
  isSheet = false, 
  selectedCartItem, 
  onSelectItem,
  suggestedProducts,
  onAddToCart
}: ShoppingCartProps) {
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  const renderSuggestionsContent = () => (
     <ScrollArea className="h-full">
        <div className="px-6 py-4 space-y-4">
            {suggestedProducts.length > 0 ? (
                 suggestedProducts.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <Image src={p.imageUrl} alt={p.name} width={40} height={40} className="rounded-md" data-ai-hint="product photo" />
                      <p className="flex-1 font-medium">{p.name}</p>
                      <Button variant="outline" size="sm" onClick={() => onAddToCart(p, 1)}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        ${p.price.toFixed(2)}
                      </Button>
                    </div>
                  ))
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <p className="text-muted-foreground">Selecciona un producto del carrito para ver sugerencias.</p>
                </div>
            )}
        </div>
     </ScrollArea>
  );


  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-none rounded-none">
        <CardHeader className="p-6">
          <CardTitle className="text-2xl font-bold tracking-tight">Mi Pedido</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          {isMobile ? (
             <Tabs defaultValue="cart" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mx-auto sticky top-0 px-6">
                    <TabsTrigger value="cart">Mi Pedido</TabsTrigger>
                    <TabsTrigger value="suggestions">Sugerencias</TabsTrigger>
                </TabsList>
                <TabsContent value="cart" className="flex-1 overflow-y-auto">{renderCartContent()}</TabsContent>
                <TabsContent value="suggestions" className="flex-1 overflow-y-auto">{renderSuggestionsContent()}</TabsContent>
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

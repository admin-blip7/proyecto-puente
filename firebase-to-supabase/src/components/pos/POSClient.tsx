"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Product, CartItem, CashSession, ClientProfile } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";
import { Button } from "../ui/button";
import { Header } from "../shared/Header";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCartIcon, PlusCircle, Package, Lock, Unlock } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentOpenSession, openCashSession, closeCashSession } from "@/lib/services/cashSessionService";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import OpenCashDrawerDialog from "./OpenCashDrawerDialog";
import CloseCashDrawerDialog from "./CloseCashDrawerDialog";
import { Skeleton } from "../ui/skeleton";
import CreateFinancePlanDialog from "./CreateFinancePlanDialog";
import { getClientsWithCredit } from "@/lib/services/creditService";
import { formatCurrency } from "@/lib/utils";


interface POSClientProps {
  initialProducts: Product[];
}

export default function POSClient({ initialProducts }: POSClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [allClients, setAllClients] = useState<ClientProfile[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [activeSession, setActiveSession] = useState<CashSession | null | undefined>(undefined); // undefined means loading
  const [isOpeningDrawer, setOpeningDrawer] = useState(false);
  const [isClosingDrawer, setClosingDrawer] = useState(false);
  const [isFinancePlanOpen, setFinancePlanOpen] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();


  useEffect(() => {
    if (userProfile) {
      getCurrentOpenSession(userProfile.uid).then(setActiveSession);
      getClientsWithCredit().then(setAllClients);
    }
  }, [userProfile]);


  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      
      const fullProduct = products.find(p => p.id === product.id);
      if (!fullProduct) return prevCart; // Should not happen

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity <= fullProduct.stock) {
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: newQuantity } : item
          );
        }
        return prevCart;
      }
      if (quantity <= fullProduct.stock) {
        const newItem = { ...fullProduct, quantity: quantity };
        if (prevCart.length === 0) {
            setSelectedCartItem(newItem);
        }
        return [...prevCart, newItem];
      }
      return prevCart;
    });
  };

  const addComboToCart = (product: Product) => {
    if (!product.comboProductIds) return;
    product.comboProductIds.forEach(productId => {
      const productToAdd = products.find(p => p.id === productId);
      if (productToAdd) {
        addToCart(productToAdd, 1);
      }
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) => {
       const productInStock = products.find(p => p.id === productId);
       if (!productInStock) return prevCart;

       const newQuantity = Math.max(0, Math.min(quantity, productInStock.stock));
       
       if (newQuantity === 0) {
         const newCart = prevCart.filter((item) => item.id !== productId);
         if(selectedCartItem?.id === productId) {
            const newSelectedItem = newCart.length > 0 ? newCart[0] : null;
            setSelectedCartItem(newSelectedItem);
         }
         return newCart;
       }
       return prevCart.map((item) =>
         item.id === productId ? { ...item, quantity: newQuantity } : item
       );
    });
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCartItem(null);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())) &&
        product.type === 'Venta'
    );
  }, [products, searchQuery]);
  
  const selectedProductDetails = useMemo(() => {
    if (!selectedCartItem) return null;
    return products.find(p => p.id === selectedCartItem.id);
  }, [selectedCartItem, products]);
  
  const comboProducts = useMemo(() => {
    if (!selectedProductDetails || !selectedProductDetails.comboProductIds) return [];
    return selectedProductDetails.comboProductIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];
  }, [selectedProductDetails, products]);

  const totalCartItems = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const handleOpenDrawer = async (startingFloat: number) => {
    if (!userProfile) return;
    try {
        const newSession = await openCashSession(userProfile.uid, userProfile.name, startingFloat);
        setActiveSession(newSession);
        setOpeningDrawer(false);
        toast({ title: "Turno Abierto", description: "La caja está lista para registrar ventas."})
    } catch(error) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo abrir el turno de caja."})
    }
  }

  const handleCloseDrawer = async (actualCash: number) => {
    if (!userProfile || !activeSession) return;
    try {
        const closedSession = await closeCashSession(activeSession, userProfile.uid, userProfile.name, actualCash);
        setActiveSession(null);
        setClosingDrawer(false);
        toast({ title: "Turno Cerrado", description: `Diferencia de caja: ${formatCurrency(closedSession.difference || 0)}.`})
    } catch(error) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo cerrar el turno de caja."})
    }
  }



  
  if (activeSession === undefined) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="space-y-4 w-full max-w-lg p-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    )
  }

  if (!activeSession) {
    return (
        <>
            <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Lock className="h-16 w-16 mx-auto text-muted-foreground" />
                    <h2 className="text-2xl font-bold">Caja Cerrada</h2>
                    <p className="text-muted-foreground">Debes abrir un turno para poder empezar a vender.</p>
                    <Button size="lg" onClick={() => setOpeningDrawer(true)}>
                        <Unlock className="mr-2"/>
                        Abrir Turno
                    </Button>
                </div>
            </div>
            <OpenCashDrawerDialog 
                isOpen={isOpeningDrawer}
                onOpenChange={setOpeningDrawer}
                onConfirm={handleOpenDrawer}
            />
        </>
    )
  }


  
  return (
    <>
    <div className="grid h-full grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-7 flex flex-col h-full bg-background px-4 sm:px-6 pt-6 overflow-hidden">
        <Header searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
        <div className="mt-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Encuentra los mejores productos</h2>
        </div>
        <ScrollArea className="flex-1 -mx-4 sm:-mx-6 mt-4">
          <div className="p-4 sm:p-6 grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))'}}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={() => addToCart(product)} />
            ))}
          </div>
        </ScrollArea>
      </div>
       <div className="hidden lg:flex lg:col-span-5 flex-row h-full">
        
        
         <div className="flex-1 flex flex-col h-full bg-card shadow-inner border-l">
            <ShoppingCart
              cartItems={cart}
              onUpdateQuantity={updateQuantity}
              onClearCart={clearCart}
              selectedCartItem={selectedCartItem}
              onSelectItem={setSelectedCartItem}
              onAddToCart={addToCart}
              onCloseSession={() => setClosingDrawer(true)}
              onFinanceSale={() => setFinancePlanOpen(true)}
            />
         </div>
       </div>

       {/* Mobile Cart Sheet */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" className="w-16 h-16 rounded-full shadow-2xl">
              <ShoppingCartIcon className="h-7 w-7" />
              {totalCartItems > 0 && (
                <Badge 
                  variant="secondary" 
                  className="absolute top-0 right-0 -translate-x-1 translate-y-1 rounded-full px-2"
                >
                  {totalCartItems}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 flex flex-col w-full sm:max-w-md">
            <SheetTitle className="sr-only">Mi Pedido</SheetTitle>
             <ShoppingCart
                cartItems={cart}
                onUpdateQuantity={updateQuantity}
                onClearCart={clearCart}
                isSheet
                selectedCartItem={selectedCartItem}
                onSelectItem={setSelectedCartItem}
                onAddToCart={addToCart}
                onCloseSession={() => setClosingDrawer(true)}
                onFinanceSale={() => setFinancePlanOpen(true)}
             />
          </SheetContent>
        </Sheet>
      </div>
    </div>
     <CloseCashDrawerDialog
        isOpen={isClosingDrawer}
        onOpenChange={setClosingDrawer}
        session={activeSession}
        onConfirm={handleCloseDrawer}
      />
      <CreateFinancePlanDialog
        isOpen={isFinancePlanOpen}
        onOpenChange={setFinancePlanOpen}
        allProducts={products}
        allClients={allClients}
        onSaleCreated={() => {
            // Here you could refresh products or clients if needed
        }}
      />
    </>
  );
}

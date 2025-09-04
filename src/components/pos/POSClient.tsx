"use client";

import { useState, useMemo, useEffect } from "react";
import { Product, CartItem, SuggestedProduct, CashSession } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";
import { Button } from "../ui/button";
import { Header } from "../shared/Header";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCartIcon, PlusCircle, Package, Wand2, Lock, Unlock } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import Image from "next/image";
import { getSuggestedProducts } from "@/lib/services/productService";
import { useIsMobile } from "@/hooks/use-mobile";
import { getCurrentOpenSession, openCashSession, closeCashSession } from "@/lib/services/cashSessionService";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import OpenCashDrawerDialog from "./OpenCashDrawerDialog";
import CloseCashDrawerDialog from "./CloseCashDrawerDialog";
import { Skeleton } from "../ui/skeleton";


interface POSClientProps {
  initialProducts: Product[];
}

export default function POSClient({ initialProducts }: POSClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeSession, setActiveSession] = useState<CashSession | null | undefined>(undefined); // undefined means loading
  const [isOpeningDrawer, setOpeningDrawer] = useState(false);
  const [isClosingDrawer, setClosingDrawer] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();


  useEffect(() => {
    if (userProfile) {
      getCurrentOpenSession(userProfile.uid).then(setActiveSession);
    }
  }, [userProfile]);


  const fetchSuggestions = async (item: CartItem) => {
    if (!item?.compatibilityTags || item.compatibilityTags.length === 0) {
        setSuggestedProducts([]);
        return;
    }
    setIsLoadingSuggestions(true);
    const cartIds = cart.map(cartItem => cartItem.id);
    const suggestions = await getSuggestedProducts(item.compatibilityTags, cartIds);
    setSuggestedProducts(suggestions);
    setIsLoadingSuggestions(false);
  }

  useEffect(() => {
    if (selectedCartItem) {
        fetchSuggestions(selectedCartItem);
    } else {
        setSuggestedProducts([]);
    }
  }, [selectedCartItem, cart]);


  const addToCart = (product: Product | SuggestedProduct, quantity: number = 1) => {
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

  const categories = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.category)))], [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        (activeCategory === "All" || product.category === activeCategory) &&
        (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery, activeCategory]);
  
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
        toast({ title: "Turno Cerrado", description: `Diferencia de caja: $${closedSession.difference?.toFixed(2)}.`})
    } catch(error) {
        toast({ variant: 'destructive', title: "Error", description: "No se pudo cerrar el turno de caja."})
    }
  }


  const renderSuggestionsPanel = () => (
     <div className="w-full h-full p-4 space-y-4 bg-muted/30 flex flex-col">
        <h3 className="font-bold text-lg">Sugerencias</h3>
        <ScrollArea className="flex-1">
        {selectedProductDetails && comboProducts.length > 0 && (
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5"/>
                Combo para {selectedProductDetails.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
               <Button className="w-full" onClick={() => addComboToCart(selectedProductDetails)}>
                    <PlusCircle className="mr-2" />
                    Añadir Combo al Carrito
                </Button>
            </CardContent>
          </Card>
        )}
        {suggestedProducts.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="h-5 w-5 text-primary"/>
                Productos Sugeridos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {suggestedProducts.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <Image src={p.imageUrl} alt={p.name} width={40} height={40} className="rounded-md" data-ai-hint="product photo" />
                  <p className="flex-1 font-medium">{p.name}</p>
                  <Button variant="outline" size="sm" onClick={() => addToCart(p, 1)}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    ${p.price.toFixed(2)}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
         </ScrollArea>
     </div>
  );
  
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
    <div className="grid h-full grid-cols-1 lg:grid-cols-12 overflow-hidden">
      <div className="lg:col-span-7 flex flex-col h-full bg-background px-4 sm:px-6 pt-6">
        <Header searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
        <div className="mt-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Encuentra los mejores productos</h2>
        </div>
        <div className="mt-4 flex items-center gap-2">
            <ScrollArea className="w-full whitespace-nowrap">
                 <div className="flex gap-2 pb-2">
                    {categories.map(category => (
                        <Button 
                            key={category} 
                            variant={activeCategory === category ? 'default' : 'outline'}
                            onClick={() => setActiveCategory(category)}
                            className="rounded-full"
                        >
                            {category}
                        </Button>
                    ))}
                 </div>
            </ScrollArea>
        </div>
        <ScrollArea className="flex-1 -mx-4 sm:-mx-6">
          <div className="p-4 sm:p-6 grid gap-4 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'}}>
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
              suggestedProducts={suggestedProducts}
              onAddToCart={addToCart}
              onCloseSession={() => setClosingDrawer(true)}
            />
         </div>
         <div className="w-80 h-full border-l">
            {renderSuggestionsPanel()}
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
                suggestedProducts={suggestedProducts}
                onAddToCart={addToCart}
                onCloseSession={() => setClosingDrawer(true)}
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
    </>
  );
}

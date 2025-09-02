"use client";

import { useState, useMemo } from "react";
import { Product, CartItem } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";
import { Button } from "../ui/button";
import { Header } from "../shared/Header";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCartIcon, PlusCircle, Package } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import Image from "next/image";

interface POSClientProps {
  initialProducts: Product[];
}

export default function POSClient({ initialProducts }: POSClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity <= product.stock) {
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: newQuantity } : item
          );
        }
        return prevCart;
      }
      if (quantity <= product.stock) {
        return [...prevCart, { ...product, quantity: quantity }];
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
            setSelectedCartItem(newCart.length > 0 ? newCart[0] : null);
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

  // Set first item as selected when cart is populated
  useState(() => {
      if (cart.length > 0 && !selectedCartItem) {
          setSelectedCartItem(cart[0]);
      } else if (cart.length === 0 && selectedCartItem) {
          setSelectedCartItem(null);
      }
  });

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-8 flex flex-col h-full bg-background px-4 sm:px-6 pt-6">
        <Header searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
        <div className="mt-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Find The Best Food</h2>
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
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={() => addToCart(product)} />
            ))}
          </div>
        </ScrollArea>
      </div>
       <div className="hidden lg:flex lg:col-span-4 xl:col-span-4 flex-row h-full">
         <div className="flex-1 flex flex-col h-full bg-card shadow-2xl rounded-l-2xl">
            <ShoppingCart
            cartItems={cart}
            onUpdateQuantity={updateQuantity}
            onClearCart={clearCart}
            selectedCartItem={selectedCartItem}
            onSelectItem={setSelectedCartItem}
            />
         </div>
         <div className="w-80 h-full p-4 space-y-4 bg-muted/30">
            <h3 className="font-bold text-lg">Sugerencias</h3>
            {selectedProductDetails && comboProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5"/>
                    Combo para {selectedProductDetails.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {comboProducts.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <Image src={p.imageUrl} alt={p.name} width={40} height={40} className="rounded-md" />
                      <p className="flex-1 font-medium">{p.name}</p>
                      <p className="text-muted-foreground">${p.price.toFixed(2)}</p>
                    </div>
                  ))}
                  <Button className="w-full" onClick={() => addComboToCart(selectedProductDetails)}>
                    <PlusCircle className="mr-2" />
                    Añadir Combo al Carrito
                  </Button>
                </CardContent>
              </Card>
            )}
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
            <SheetTitle className="sr-only">My Order</SheetTitle>
             <ShoppingCart
                cartItems={cart}
                onUpdateQuantity={updateQuantity}
                onClearCart={clearCart}
                isSheet
                selectedCartItem={selectedCartItem}
                onSelectItem={setSelectedCartItem}
             />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

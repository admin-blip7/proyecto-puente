"use client";

import { useState, useMemo } from "react";
import { Product, CartItem } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";
import { Button } from "../ui/button";
import { Header } from "../shared/Header";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCartIcon } from "lucide-react";
import { Badge } from "../ui/badge";

interface POSClientProps {
  initialProducts: Product[];
}

export default function POSClient({ initialProducts }: POSClientProps) {
  const [products] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        }
        return prevCart; // Quantity cannot exceed stock
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prevCart) => {
       const productInStock = products.find(p => p.id === productId);
       if (!productInStock) return prevCart;

       const newQuantity = Math.max(0, Math.min(quantity, productInStock.stock));

       if (newQuantity === 0) {
         return prevCart.filter((item) => item.id !== productId);
       }
       return prevCart.map((item) =>
         item.id === productId ? { ...item, quantity: newQuantity } : item
       );
    });
  };

  const clearCart = () => {
    setCart([]);
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

  const totalCartItems = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);


  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-3 xl:grid-cols-4">
      <div className="col-span-1 lg:col-span-2 xl:col-span-3 flex flex-col h-full bg-background px-4 sm:px-6 pt-6">
        <Header />
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
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        </ScrollArea>
      </div>
       <div className="hidden lg:flex col-span-1 flex-col h-full bg-card shadow-2xl rounded-l-2xl">
        <ShoppingCart
          cartItems={cart}
          onUpdateQuantity={updateQuantity}
          onClearCart={clearCart}
        />
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
             />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

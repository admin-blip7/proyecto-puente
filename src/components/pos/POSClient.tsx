"use client";

import { useState, useMemo } from "react";
import { Product, CartItem } from "@/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";

interface POSClientProps {
  initialProducts: Product[];
}

export default function POSClient({ initialProducts }: POSClientProps) {
  const [products] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-3 lg:grid-cols-4">
      <div className="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col h-full bg-background">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar productos por nombre o SKU..."
              className="pl-10 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="col-span-1 flex flex-col h-full bg-card border-l">
        <ShoppingCart
          cartItems={cart}
          onUpdateQuantity={updateQuantity}
          onClearCart={clearCart}
        />
      </div>
    </div>
  );
}

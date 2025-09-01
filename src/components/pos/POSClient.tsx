"use client";

import { useState, useMemo } from "react";
import { Product, CartItem } from "@/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import ShoppingCart from "./ShoppingCart";
import { Button } from "../ui/button";
import { Header } from "../shared/Header";

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

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-3 xl:grid-cols-4">
      <div className="col-span-1 lg:col-span-2 xl:col-span-3 flex flex-col h-full bg-background px-6 pt-6">
        <Header />
        <div className="mt-6">
          <h2 className="text-2xl font-bold tracking-tight">Find The Best Food</h2>
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
        <ScrollArea className="flex-1 -mx-6">
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="col-span-1 flex flex-col h-full bg-card shadow-2xl rounded-l-2xl">
        <ShoppingCart
          cartItems={cart}
          onUpdateQuantity={updateQuantity}
          onClearCart={clearCart}
        />
      </div>
    </div>
  );
}

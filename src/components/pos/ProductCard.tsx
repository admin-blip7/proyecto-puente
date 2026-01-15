import { Product } from "@/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { formatCurrency } from '@/lib/utils';
import { Package, ShoppingCart, Info, Star } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 10;

  // Extract up to 3 attributes for the specs grid
  const specs = product.attributes
    ? Object.entries(product.attributes).slice(0, 3).map(([key, value]) => ({
      label: key,
      value: String(value)
    }))
    : [];

  return (
    <div className="group relative w-full h-[320px] rounded-[24px] overflow-hidden bg-gray-900 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        {product.imageUrls && product.imageUrls.length > 0 ? (
          <Image
            src={product.imageUrls[0]}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <Package className="w-16 h-16 text-gray-600" />
          </div>
        )}

        {/* Dark Gradient Overlay - Stronger at bottom for text readability; Fades out on hover to show clearer image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-opacity duration-500 group-hover:opacity-40" />
      </div>

      {/* Content Container */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 z-10">

        {/* Top Badges (Floating) */}
        <div className="absolute top-4 left-4 flex gap-2">
          {product.stock > 20 && (
            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">Featured</span>
            </div>
          )}
        </div>

        {/* Price & Title */}
        <div className="mb-2">
          <div className="text-2xl font-bold text-white tracking-tight mb-0.5">
            {formatCurrency(product.price)}
          </div>
          <h3 className="text-sm font-medium text-white/90 leading-snug line-clamp-2" title={product.name}>
            {product.name}
          </h3>
        </div>

        {/* Description - Hidden in smaller card or very truncated */}
        {/* Removed description to save space or keep it very minimal if needed, but user asked for smaller cards.
            Let's keep it but hidden or very small? User said "cards are too big/large".
            I'll remove the description text entirely for the compact view to ensure it fits well, or make it line-clamp-1.
            Let's hide it for cleaner look on small cards as title + price + button is core.
         */}

        {/* Specs Grid - Hidden for compact view or reduced to 1 line?
            Let's hide specs for the compact "6 items per view" style to avoid clutter.
            If user wants them, we can add them back very small.
            For now, I will remove specs and description from the *always visible* part to save space.
            Maybe show them on hover? The previous prompt mentioned "hover effect... hides non-essential details".
            Actually the previous prompt said "hides non-essential details... while keeping price, title, button".
            So normal state: Price, Title, Button.
            Hover state: Maybe showing more?
            Wait, the request says "make them smaller so 6 fit".
            I will keep Price, Title, Stock, Button. Remove description/specs from main view.
        */}

        {/* Footer: Stock & Action */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5">
              {isOutOfStock ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 font-medium">Out of stock</span>
                </>
              ) : isLowStock ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-400 font-medium">Low: {product.stock}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-green-400 font-medium">{product.stock} in stock</span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => onAddToCart(product)}
            disabled={isOutOfStock}
            className={cn(
              "w-full bg-white hover:bg-gray-100 text-gray-900 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98]",
              isOutOfStock && "opacity-50 cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {isOutOfStock ? "Agotado" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

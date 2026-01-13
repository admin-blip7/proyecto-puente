import { Product } from "@/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { formatCurrency } from '@/lib/utils';
import { Package } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock < 10; // Example threshold

  // Determine stock badge style based on quantity
  let stockBadgeClass = "bg-emerald-50 text-emerald-700";
  let stockText = `In Stock: ${product.stock}`;

  if (isOutOfStock) {
    stockBadgeClass = "bg-red-50 text-red-700";
    stockText = "Out of Stock";
  } else if (isLowStock) {
    stockBadgeClass = "bg-amber-50 text-amber-700";
    stockText = `Low Stock: ${product.stock}`;
  }

  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 shadow-card hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 group border border-transparent hover:border-blue-100 h-full">
      <div className="aspect-[4/3] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center p-4 relative">
        {product.imageUrls && product.imageUrls.length > 0 ? (
          <Image
            src={product.imageUrls[0]}
            alt={product.name}
            fill
            className="object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, 300px"
          />
        ) : (
          <Package className="w-16 h-16 text-gray-300" />
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-semibold text-base text-gray-900 leading-tight mb-2 line-clamp-1" title={product.name}>
          {product.name}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 h-8">
          {product.description || "No description available."}
        </p>

        <div className="mt-auto">
          <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium mb-4", stockBadgeClass)}>
            {stockText}
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xl font-bold text-gray-900">{formatCurrency(product.price)}</span>
            <button
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock}
              className={cn(
                "bg-white border border-gray-200 hover:border-primary hover:bg-blue-50 text-gray-900 hover:text-primary px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm whitespace-nowrap",
                isOutOfStock && "opacity-50 cursor-not-allowed hover:bg-white hover:border-gray-200 hover:text-gray-900"
              )}
            >
              {isOutOfStock ? "Agotado" : "Add To Cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

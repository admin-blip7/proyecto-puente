import { Product } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlusCircle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  
  const getStockColor = () => {
    if (isOutOfStock) return "text-red-600";
    if (product.reorderPoint && product.stock <= product.reorderPoint) return "text-yellow-600";
    return "text-green-600";
  }

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-xl rounded-2xl group min-h-[350px]">
      <CardContent className="p-4 text-center flex flex-col flex-1">
        <div className="relative h-40 w-40 mx-auto mb-4">
            <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="160px"
            className="object-contain group-hover:scale-110 transition-transform duration-300"
            data-ai-hint={`${product.category} product`}
            />
        </div>
        <h3 className="text-lg font-bold tracking-tight flex-1">{product.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{product.category}</p>
        <div className={cn("flex items-center justify-center gap-1 mt-2 font-semibold", getStockColor())}>
            <Package className="w-4 h-4" />
            <span className="text-sm">{product.stock} en Stock</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center mt-auto">
        <p className="text-xl font-bold text-primary">${product.price.toFixed(2)}</p>
        <Button
          className="rounded-lg"
          onClick={() => onAddToCart(product)}
          disabled={isOutOfStock}
        >
          {isOutOfStock ? (
            "Agotado"
          ) : (
            <>
              Add to cart
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

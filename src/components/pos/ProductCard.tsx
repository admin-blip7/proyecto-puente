import { Product } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
    if (isOutOfStock) return "text-destructive";
    if (product.reorderPoint && product.stock <= product.reorderPoint) return "text-yellow-600";
    return "text-foreground";
  }

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg rounded-lg group">
      <CardContent className="p-3 text-center flex flex-col flex-1 justify-center">
        <h3 className="text-sm font-semibold tracking-tight leading-tight flex-1 mb-2">{product.name}</h3>
        <div className={cn("flex items-center justify-center gap-1 mt-1 font-medium", getStockColor())}>
            <Package className="w-3 h-3" />
            <span className="text-xs">{product.stock} en Stock</span>
        </div>
      </CardContent>
      <CardFooter className="p-2 flex flex-col items-stretch mt-auto">
        <p className="text-lg font-bold text-primary mb-2">${product.price.toFixed(2)}</p>
        <Button
          size="sm"
          className="rounded-md w-full text-xs"
          onClick={() => onAddToCart(product)}
          disabled={isOutOfStock}
        >
          {isOutOfStock ? (
            "Agotado"
          ) : (
            <>
              <PlusCircle className="mr-1 h-3 w-3" />
              Agregar
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

import { Product } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { formatCurrency } from '@/lib/utils';

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

  // Check if product has attributes and get display-worthy ones
  const getDisplayAttributes = () => {
    if (!product.attributes) return [];

    const attrs: Array<{ label: string; value: string }> = [];

    // Filter out empty/null/undefined values
    Object.entries(product.attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // Format the key for display (color -> Color, memoria -> Memoria, etc.)
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        attrs.push({ label, value: String(value) });
      }
    });

    return attrs;
  };

  const displayAttributes = getDisplayAttributes();
  const hasAttributes = displayAttributes.length > 0;

  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg rounded-lg group">
      <CardContent className="p-3 text-center flex flex-col flex-1 justify-center">
        {/* Product Image */}
        {product.imageUrls && product.imageUrls.length > 0 ? (
          <div className="relative aspect-square mb-3 overflow-hidden rounded-md bg-muted w-full">
            <Image
              src={product.imageUrls[0]}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 200px"
            />
          </div>
        ) : (
          <div className="aspect-square mb-3 flex items-center justify-center rounded-md bg-muted w-full">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        <h3 className="text-sm font-semibold tracking-tight leading-tight flex-1 mb-2">{product.name}</h3>

        {/* Conditionally render attributes if they exist */}
        {hasAttributes && (
          <div className="flex flex-wrap gap-1 justify-center mb-2">
            {displayAttributes.map((attr, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 font-normal"
              >
                {attr.label}: {attr.value}
              </Badge>
            ))}
          </div>
        )}

        <div className={cn("flex items-center justify-center gap-1 mt-1 font-medium", getStockColor())}>
          <Package className="w-3 h-3" />
          <span className="text-xs">{product.stock} en Stock</span>
        </div>
      </CardContent>
      <CardFooter className="p-2 flex flex-col items-stretch mt-auto">
        <p className="text-lg font-bold text-primary mb-2">{formatCurrency(product.price)}</p>
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

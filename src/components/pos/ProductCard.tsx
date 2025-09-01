import { Product } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  return (
    <Card className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="p-0 relative h-48 w-full">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          data-ai-hint={`${product.category} product`}
        />
      </CardHeader>
      <CardContent className="p-4 flex-1 flex flex-col">
        <CardTitle className="text-base font-semibold leading-tight mb-1">{product.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{product.category}</p>
        <div className="flex-grow" />
        <p className="text-xl font-bold text-primary mt-2">${product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-2 border-t">
        <Button
          variant="ghost"
          className="w-full text-primary hover:bg-primary/10 hover:text-primary"
          onClick={() => onAddToCart(product)}
          disabled={isOutOfStock}
        >
          {isOutOfStock ? (
            "Agotado"
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

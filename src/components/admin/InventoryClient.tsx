"use client";

import { useState } from "react";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddProductDialog from "./AddProductDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Badge } from "../ui/badge";

interface InventoryClientProps {
  initialProducts: Product[];
}

export default function InventoryClient({ initialProducts }: InventoryClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);

  const handleProductAdded = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
  };
  
  const getOwnershipTypeVariant = (type: Product['ownershipType']) => {
    switch (type) {
        case 'Consigna': return 'destructive';
        case 'Familiar': return 'secondary';
        default: return 'outline';
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Inventario</h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Producto
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-250px)] w-full">
            <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[80px]">Imagen</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Etiquetas</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
                    <TableRow key={product.id}>
                        <TableCell>
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="rounded-md object-cover"
                        />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>
                            <div className="flex flex-wrap gap-1">
                                {product.compatibilityTags?.map(tag => (
                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                ))}
                            </div>
                        </TableCell>
                        <TableCell>
                            <Badge variant={getOwnershipTypeVariant(product.ownershipType)}>{product.ownershipType}</Badge>
                        </TableCell>
                        <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{product.stock}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <AddProductDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onProductAdded={handleProductAdded}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import DeleteProductsDialog from "./DeleteProductsDialog";
import BulkEditDialog from "./BulkEditDialog";
import { getProducts } from "@/lib/services/productService";
import { useToast } from "@/hooks/use-toast";

interface InventoryClientProps {
  initialProducts: Product[];
}

export default function InventoryClient({ initialProducts }: InventoryClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();


  const handleProductsDeleted = (deletedIds: string[]) => {
    setProducts(prev => prev.filter(p => !deletedIds.includes(p.id)));
    setSelectedProductIds([]);
  }

  const handleOpenEditPage = (productId: string) => {
    router.push(`/admin/inventory/edit/${productId}`);
  }
  
  const handleOpenAddPage = () => {
    router.push('/admin/inventory/add');
  };

  const handleRefreshData = async () => {
    try {
        const updatedProducts = await getProducts();
        setProducts(updatedProducts);
        setSelectedProductIds([]);
        toast({
            title: "Productos Actualizados",
            description: "La lista de productos ha sido refrescada con los nuevos datos."
        })
    } catch(error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudo refrescar la lista de productos."
        })
    }
  }


  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      setSelectedProductIds(products.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  }

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProductIds(prev => [...prev, productId]);
    } else {
      setSelectedProductIds(prev => prev.filter(id => id !== productId));
    }
  }
  
  const getOwnershipTypeVariant = (type: Product['ownershipType']) => {
    switch (type) {
        case 'Consigna': return 'destructive';
        case 'Familiar': return 'secondary';
        default: return 'outline';
    }
  }
  
  const numSelected = selectedProductIds.length;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Inventario</h1>
        {numSelected > 0 ? (
           <div className="flex items-center gap-2">
             <span className="text-sm text-muted-foreground">{numSelected} producto(s) seleccionado(s)</span>
             <Button variant="outline" onClick={() => setBulkEditDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
             </Button>
             <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4"/>
                Eliminar
             </Button>
           </div>
        ) : (
          <Button onClick={handleOpenAddPage}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Producto
          </Button>
        )}
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
                    <TableHead padding="checkbox">
                        <Checkbox 
                            checked={numSelected > 0 && numSelected === products.length ? true : (numSelected > 0 ? "indeterminate" : false)}
                            onCheckedChange={handleSelectAll}
                        />
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Etiquetas</TableHead>
                    <TableHead>Propiedad</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
                    <TableRow key={product.id} data-state={selectedProductIds.includes(product.id) ? "selected" : ""}>
                        <TableCell padding="checkbox">
                            <Checkbox 
                                checked={selectedProductIds.includes(product.id)}
                                onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
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
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditPage(product.id)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <DeleteProductsDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        productIds={selectedProductIds}
        onProductsDeleted={handleProductsDeleted}
      />
      <BulkEditDialog
        isOpen={isBulkEditDialogOpen}
        onOpenChange={setBulkEditDialogOpen}
        productIds={selectedProductIds}
        onProductsUpdated={handleRefreshData}
      />
    </>
  );
}

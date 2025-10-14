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
import { formatCurrency } from "@/lib/utils";

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
          {/* Mobile Card View */}
          <div className="md:hidden">
            <ScrollArea className="h-[calc(100vh-250px)] w-full">
              <div className="space-y-3">
                {products.map((product, index) => (
                  <div key={`${product.id}-${index}`} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedProductIds.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditPage(product.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant={getOwnershipTypeVariant(product.ownershipType)} className="text-xs">
                        {product.ownershipType}
                      </Badge>
                      <span className="font-semibold">{formatCurrency(product.price)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Stock: {product.stock}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <ScrollArea className="h-[calc(100vh-250px)] w-full">
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={numSelected > 0 && numSelected === products.length ? true : (numSelected > 0 ? "indeterminate" : false)}
                          onCheckedChange={(checked: any) => handleSelectAll(checked)}
                        />
                      </TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Propiedad</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product, index) => (
                      <TableRow key={`${product.id}-${index}`} data-state={selectedProductIds.includes(product.id) ? "selected" : ""}>
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>
                          <Badge variant={getOwnershipTypeVariant(product.ownershipType)}>{product.ownershipType}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
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
          </div>
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

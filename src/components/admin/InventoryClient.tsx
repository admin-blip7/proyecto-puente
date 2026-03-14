"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Edit, Search, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};

const toDisplay = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const getSeminuevoDetails = (product: Product) => {
  if (product.category !== "Celular Seminuevo") return null;

  const attributes = asRecord(product.attributes);
  const isTemplate = attributes.is_model_template === true;
  if (isTemplate) return null;

  const storage =
    toDisplay(attributes.storage) ??
    (typeof attributes.storage_gb === "number" ? `${attributes.storage_gb}GB` : null);
  const batteryHealth =
    typeof attributes.battery_health === "number"
      ? `${attributes.battery_health}%`
      : toDisplay(attributes.battery_health);
  const batteryCycles =
    typeof attributes.battery_cycle_count === "number"
      ? String(attributes.battery_cycle_count)
      : toDisplay(attributes.battery_cycle_count);

  return {
    grade: toDisplay(product.conditionGrade),
    serial: toDisplay(attributes.serial),
    imei: toDisplay(attributes.imei),
    imei2: toDisplay(attributes.imei2),
    color: toDisplay(attributes.color),
    storage,
    batteryHealth,
    batteryCycles,
    iosVersion: toDisplay(attributes.ios_version),
    diagnosticId: toDisplay(product.diagnosticId),
  };
};

export default function InventoryClient({ initialProducts }: InventoryClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>(null);
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
    } catch (error) {
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

  const filteredProducts = products.filter(product => {
    const details = getSeminuevoDetails(product);
    const seminuevoSearchBlob = details
      ? [
          details.serial,
          details.imei,
          details.imei2,
          details.color,
          details.storage,
          details.batteryHealth,
          details.iosVersion,
          details.diagnosticId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      : "";

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seminuevoSearchBlob.includes(searchTerm.toLowerCase());

    const matchesFilter =
      ownershipFilter === "all" ||
      product.ownershipType === ownershipFilter;

    return matchesSearch && matchesFilter;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;

    let aValue = a[key] ?? '';
    let bValue = b[key] ?? '';

    // Handle string comparisons case-insensitively
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: keyof Product) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

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
              <Trash2 className="mr-2 h-4 w-4" />
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

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Filtrar por tipo" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Propio">Propio</SelectItem>
            <SelectItem value="Consigna">Consigna</SelectItem>
            <SelectItem value="Familiar">Familiar</SelectItem>
          </SelectContent>
        </Select>
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
                {sortedProducts.map((product, index) => (
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
                          {(() => {
                            const details = getSeminuevoDetails(product);
                            if (!details) return null;
                            return (
                              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground">Ficha seminuevo</p>
                                <p>
                                  {details.grade ? `Grado ${details.grade}` : "Grado N/D"}
                                  {details.storage ? ` · ${details.storage}` : ""}
                                  {details.color ? ` · ${details.color}` : ""}
                                </p>
                                {details.serial && <p>Serial: {details.serial}</p>}
                                {details.imei && <p>IMEI: {details.imei}</p>}
                                {details.imei2 && <p>IMEI 2: {details.imei2}</p>}
                                {details.batteryHealth && (
                                  <p>
                                    Batería: {details.batteryHealth}
                                    {details.batteryCycles ? ` · ${details.batteryCycles} ciclos` : ""}
                                  </p>
                                )}
                                {details.iosVersion && <p>iOS: {details.iosVersion}</p>}
                              </div>
                            );
                          })()}
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
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">{formatCurrency(product.price)}</span>
                        <span className="text-xs text-muted-foreground">Costo: {formatCurrency(product.cost)}</span>
                      </div>
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
                          checked={numSelected > 0 && numSelected === filteredProducts.length ? true : (numSelected > 0 ? "indeterminate" : false)}
                          onCheckedChange={(checked: any) => handleSelectAll(checked)}
                        />
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('name')}>
                          Nombre
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('sku')}>
                          SKU
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('ownershipType')}>
                          Propiedad
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Seminuevo (Diagnóstico)</TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" onClick={() => handleSort('cost')}>
                          Costo
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" onClick={() => handleSort('price')}>
                          Precio
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" onClick={() => handleSort('stock')}>
                          Stock
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProducts.map((product, index) => (
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
                        <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                          {(() => {
                            const details = getSeminuevoDetails(product);
                            if (!details) return <span className="text-muted-foreground/60">-</span>;
                            return (
                              <div className="space-y-1">
                                <p>
                                  {details.grade ? `Grado ${details.grade}` : "Grado N/D"}
                                  {details.storage ? ` · ${details.storage}` : ""}
                                  {details.color ? ` · ${details.color}` : ""}
                                </p>
                                {details.serial && <p className="font-mono">S/N: {details.serial}</p>}
                                {details.imei && <p className="font-mono">IMEI: {details.imei}</p>}
                                {details.imei2 && <p className="font-mono">IMEI2: {details.imei2}</p>}
                                {details.batteryHealth && (
                                  <p>
                                    Bat: {details.batteryHealth}
                                    {details.batteryCycles ? ` · ${details.batteryCycles} ciclos` : ""}
                                  </p>
                                )}
                                {details.iosVersion && <p>iOS: {details.iosVersion}</p>}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatCurrency(product.cost)}</TableCell>
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

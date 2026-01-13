"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Product } from "@/types";
import { RecentKardexEntry } from "@/lib/services/kardexService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface KardexProductListClientProps {
  products: Product[];
  recentMovements?: RecentKardexEntry[];
}

const formatQuantity = (value: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

export default function KardexProductListClient({ products, recentMovements = [] }: KardexProductListClientProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term)
    );
  }, [products, search]);

  return (
    <div className="space-y-6">
      {/* Recent Movements Preview */}
      {recentMovements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
            </div>
            <CardDescription>Movimientos de inventario más recientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentMovements.slice(0, 8).map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {movement.tipo === "INGRESO" ? (
                      <ArrowDownCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowUpCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{movement.productoNombre}</p>
                      <p className="text-xs text-muted-foreground">{movement.concepto}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={movement.tipo === "INGRESO" ? "default" : "destructive"} className="shrink-0">
                      {movement.tipo === "INGRESO" ? "+" : "-"}{movement.cantidad}
                    </Badge>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-medium">{movement.stockAnterior} → {movement.stockNuevo}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(movement.createdAt)}</p>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="shrink-0">
                      <Link href={`/admin/kardex/${movement.productoId}`}>Ver</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product List */}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Selecciona un producto</CardTitle>
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[55vh] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock > 0 && product.stock <= (product.reorderPoint ?? 5);

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.sku || "N/A"}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-emerald-600"
                          )}
                        >
                          {formatQuantity(product.stock)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm">
                            <Link href={`/admin/kardex/${product.id}`}>Ver Kardex</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

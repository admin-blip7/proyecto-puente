"use client"

import { useMemo } from "react";
import { Product } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LowStockAlertsProps {
    products: Product[];
}

export default function LowStockAlerts({ products }: LowStockAlertsProps) {
    const lowStockProducts = useMemo(() => {
        return products.filter(p => p.reorderPoint !== undefined && p.stock <= p.reorderPoint);
    }, [products]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <CardTitle>Alerta de Bajo Stock</CardTitle>
                </div>
                <CardDescription>
                    Estos productos han alcanzado o están por debajo de su punto de reorden. Considera hacer un nuevo pedido.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[200px] w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center">Stock Actual</TableHead>
                                <TableHead className="text-center">Punto de Reorden</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lowStockProducts.length > 0 ? (
                                lowStockProducts.map(product => (
                                    <TableRow key={product.id} className="bg-destructive/10">
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell className="text-center font-bold text-destructive">{product.stock}</TableCell>
                                        <TableCell className="text-center">{product.reorderPoint}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                           <Info className="h-4 w-4" />
                                           <span>No hay productos con bajo stock. ¡Todo en orden!</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

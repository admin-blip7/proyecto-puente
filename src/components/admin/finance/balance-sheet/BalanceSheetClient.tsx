"use client"

import { FixedAsset, Product } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFoot } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Package, Building, DollarSign } from "lucide-react";

interface BalanceSheetClientProps {
    assets: FixedAsset[];
    inventoryValue: number;
    fixedAssetsValue: number;
}


export default function BalanceSheetClient({ assets, inventoryValue, fixedAssetsValue }: BalanceSheetClientProps) {
    const totalAssets = inventoryValue + fixedAssetsValue;
  
    return (
    <>
        <div className="mb-4">
            <h1 className="text-2xl font-bold tracking-tight">Balance General</h1>
            <p className="text-muted-foreground">Una fotografía del valor de tu empresa en un momento específico.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 mb-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Activos Corrientes (Inventario)</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${inventoryValue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Valor total del inventario disponible.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Activos Fijos</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${fixedAssetsValue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">Valor actual de los activos depreciados.</p>
                </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Activos</CardTitle>
                    <DollarSign className="h-4 w-4 text-primary-foreground/80" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${totalAssets.toFixed(2)}</div>
                    <p className="text-xs text-primary-foreground/80">Valor total de la empresa.</p>
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Desglose de Activos Fijos</CardTitle>
                <CardDescription>Detalle del valor actual de los activos fijos de la empresa.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-450px)]">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Activo</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead className="text-right">Costo Original</TableHead>
                                <TableHead className="text-right">Valor Depreciado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.map((asset) => (
                                <TableRow key={asset.id}>
                                    <TableCell className="font-medium">{asset.name}</TableCell>
                                    <TableCell>{asset.category}</TableCell>
                                    <TableCell className="text-right">${asset.purchaseCost.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-semibold">${asset.currentValue.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFoot>
                            <TableRow>
                                <TableCell colSpan={3} className="text-right font-bold text-lg">Total Activos Fijos</TableCell>
                                <TableCell className="text-right font-bold text-lg">${fixedAssetsValue.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableFoot>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    </>
  )
}

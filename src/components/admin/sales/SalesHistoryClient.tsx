"use client";

import { useState } from "react";
import { Sale, Warranty, Product } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DollarSign, MoreHorizontal, ShieldPlus, TrendingUp, ChevronDown, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import CreateWarrantyDialog from "../warranties/CreateWarrantyDialog";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";


interface SalesHistoryClientProps {
  initialSales: Sale[];
  products: Product[];
  dailyCost: number;
  dailyProfit: number;
}

export default function SalesHistoryClient({ initialSales, products, dailyCost, dailyProfit }: SalesHistoryClientProps) {
  const [sales] = useState<Sale[]>(initialSales);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isWarrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const handleOpenWarrantyDialog = (sale: Sale) => {
    setSelectedSale(sale);
    setWarrantyDialogOpen(true);
  };

  const handleWarrantyCreated = (warranty: Warranty) => {
    toast({
        title: "Garantía Registrada",
        description: `Se ha creado la garantía para el producto ${warranty.productName}.`
    });
    setWarrantyDialogOpen(false);
    setSelectedSale(null);
  }

  const toggleCollapsible = (saleId: string) => {
    setOpenCollapsibles(prev => ({...prev, [saleId]: !prev[saleId]}));
  }

  const getProductCost = (productId: string) => {
    return products.find(p => p.id === productId)?.cost || 0;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Historial de Ventas</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dailyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Costo de los productos vendidos hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia del Día</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dailyProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ganancia total de las ventas de hoy</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-370px)]">
             <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>ID Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Cajero</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead className="text-right">Monto Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sales.map((sale) => (
                    <Collapsible key={sale.id} asChild open={openCollapsibles[sale.id] || false} onOpenChange={() => toggleCollapsible(sale.id)}>
                      <tbody className="w-full">
                        <TableRow className="cursor-pointer">
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                      {openCollapsibles[sale.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <span className="sr-only">Toggle details</span>
                                  </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell className="font-medium">{sale.saleId}</TableCell>
                            <TableCell>
                            {format(sale.createdAt, "dd MMM yyyy, HH:mm", { locale: es })}
                            </TableCell>
                            <TableCell>
                                <div className="font-medium">{sale.customerName || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{sale.customerPhone}</div>
                            </TableCell>
                            <TableCell>{sale.cashierName}</TableCell>
                            <TableCell>
                            <Badge variant={sale.paymentMethod === 'Efectivo' ? 'secondary' : 'default'}>
                                {sale.paymentMethod}
                            </Badge>
                            </TableCell>
                            <TableCell className="text-right">${sale.totalAmount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Abrir menú</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenWarrantyDialog(sale); }}>
                                        <ShieldPlus className="mr-2 h-4 w-4" />
                                        <span>Registrar Garantía</span>
                                    </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={8} className="p-0">
                               <div className="p-4 bg-muted/50">
                                  <h4 className="font-semibold mb-2">Detalle de la Venta</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-right">Cantidad</TableHead>
                                        <TableHead className="text-right">Precio Unit.</TableHead>
                                        <TableHead className="text-right">Costo Unit.</TableHead>
                                        <TableHead className="text-right">Ganancia</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {sale.items.map(item => {
                                        const cost = getProductCost(item.productId);
                                        const profit = (item.priceAtSale - cost) * item.quantity;
                                        return (
                                          <TableRow key={item.productId}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">${item.priceAtSale.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">${cost.toFixed(2)}</TableCell>
                                            <TableCell className={cn("text-right font-medium", profit > 0 ? "text-green-600" : "text-red-600")}>
                                              ${profit.toFixed(2)}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                               </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </tbody>
                    </Collapsible>
                    ))}
                </TableBody>
                </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      {selectedSale && (
        <CreateWarrantyDialog
            isOpen={isWarrantyDialogOpen}
            onOpenChange={setWarrantyDialogOpen}
            sale={selectedSale}
            onWarrantyCreated={handleWarrantyCreated}
        />
      )}
    </>
  );
}

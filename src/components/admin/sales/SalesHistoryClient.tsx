"use client";

import React, { useState, Fragment, useMemo, useCallback } from "react";
import { Sale, Warranty, Product, SaleItem } from "@/types";
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
import { DollarSign, MoreHorizontal, ShieldPlus, TrendingUp, ChevronDown, ChevronRight, Hash, ChevronUp, ArrowUpDown, BarChart3 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import CreateWarrantyDialog from "../warranties/CreateWarrantyDialog";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn, formatCurrency } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";


interface SalesHistoryClientProps {
  initialSales: Sale[];
  products: Product[];
  dailyCost: number;
  dailyProfit: number;
}

export default function SalesHistoryClient({ initialSales, products, dailyCost, dailyProfit }: SalesHistoryClientProps) {
  const [sales, setSales] = useState<Sale[]>(() => initialSales);
  const router = useRouter();
  
  // Sync sales state with initialSales prop if it changes
  React.useEffect(() => {
    setSales(prevSales => {
      // Only update if the sales arrays are different
      if (prevSales.length !== initialSales.length) {
        return initialSales;
      }
      // Check if any sale has changed
      for (let i = 0; i < initialSales.length; i++) {
        if (prevSales[i]?.id !== initialSales[i]?.id || prevSales[i]?.saleId !== initialSales[i]?.saleId) {
          return initialSales;
        }
      }
      return prevSales; // Return the same array to avoid unnecessary re-renders
    });
  }, [initialSales]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isWarrantyDialogOpen, setWarrantyDialogOpen] = useState(false);
  const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({});
  const [excludeFamiliar, setExcludeFamiliar] = useState(false);
  const [sortField, setSortField] = useState<keyof Sale | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
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

  const handleSort = (field: keyof Sale) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for dates, ascending for others
      setSortField(field);
      setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  

  const getProduct = useCallback((productId: string) => {
    return products.find(p => p.id === productId);
  }, [products]);

  // Component for sortable header
  const SortableHeader: React.FC<{
    children: React.ReactNode;
    field: keyof Sale;
    className?: string;
  }> = ({ children, field, className }) => {
    const isActive = sortField === field;
    const direction = isActive ? sortDirection : null;
    
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`-ml-3 h-8 data-[state=open]:bg-accent font-medium ${className}`}
        onClick={() => handleSort(field)}
      >
        <span>{children}</span>
        {direction && (
          direction === 'asc' ? (
            <ChevronUp className="ml-2 h-3 w-3" />
          ) : (
            <ChevronDown className="ml-2 h-3 w-3" />
          )
        )}
        {!direction && (
          <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground" />
        )}
      </Button>
    );
  };

  // Deduplicate sales based on saleId to avoid React key warnings
  const deduplicatedSales = useMemo(() => {
    const seenIds = new Set();
    const uniqueSales = [];
    
    for (const sale of sales) {
      const id = sale.id || sale.saleId;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueSales.push(sale);
      }
    }
    
    if (seenIds.size !== sales.length) {
      console.warn(`Removed ${sales.length - uniqueSales.length} duplicate sales entries`);
    }
    
    return uniqueSales;
  }, [sales]);

  const sortedSales = useMemo(() => {
    if (!sortField) {
      // Default sort: by createdAt descending (newest first)
      return [...deduplicatedSales].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime; // Descending order (newest first)
      });
    }

    return [...deduplicatedSales].sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      // Handle special cases
      if (sortField === 'customerName') {
        aValue = a.customerName || '';
        bValue = b.customerName || '';
      } else if (sortField === 'totalAmount') {
        aValue = Number(a.totalAmount) || 0;
        bValue = Number(b.totalAmount) || 0;
      } else if (sortField === 'createdAt') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = sortDirection === 'asc' ? '' : 0;
      if (bValue === null || bValue === undefined) bValue = sortDirection === 'asc' ? '' : 0;

      // Compare values
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [deduplicatedSales, sortField, sortDirection]);

  const filteredSales = useMemo(() => {
    if (!excludeFamiliar) return sortedSales;
    // Filter out sales that consist ENTIRELY of 'Familiar' products
    return sortedSales.filter(sale => {
      return sale.items.some(item => {
        const product = getProduct(item.productId);
        return product?.ownershipType !== 'Familiar';
      });
    });
  }, [sortedSales, excludeFamiliar, getProduct]);

  // Debug: Log sales data to check for invalid keys and duplicates
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Check for sales with invalid IDs
      const invalidSales = sales.filter(sale => !sale.id && !sale.saleId);
      if (invalidSales.length > 0) {
        console.warn('Sales with invalid IDs found:', invalidSales.length);
      }
      
      // Check for duplicate saleIds
      const saleIds = sales.map(s => s.saleId).filter(Boolean);
      const duplicateIds = saleIds.filter((id, index) => saleIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn('Duplicate saleIds found:', [...new Set(duplicateIds)]);
      }
      
      console.log('Total sales loaded:', sales.length);
      
      // Debug: Check for the specific sale SALE-731410C0
      const targetSale = sales.find(s => s.saleId === 'SALE-731410C0');
      if (targetSale) {
        console.log('Found SALE-731410C0:', targetSale);
        console.log('Sale createdAt:', targetSale.createdAt);
        console.log('Sale createdAt type:', typeof targetSale.createdAt);
      } else {
        console.warn('SALE-731410C0 not found in sales list');
        console.log('Available saleIds:', sales.map(s => s.saleId).slice(0, 10));
      }
    }
  }, [sales]);

  // Reset sort when sales data changes significantly
  React.useEffect(() => {
    if (sales.length !== initialSales.length) {
      setSortField(null);
      setSortDirection('desc');
    }
  }, [sales.length, initialSales.length]);

  const { dailyCost: filteredDailyCost, dailyProfit: filteredDailyProfit } = useMemo(() => {
    const today = new Date();
    const todaySales = sortedSales.filter(sale => format(sale.createdAt, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'));

    let dailyCost = 0;
    let dailyProfit = 0;
    
    todaySales.forEach(sale => {
        sale.items.forEach(item => {
            const product = getProduct(item.productId);
            if (product && (!excludeFamiliar || product.ownershipType !== 'Familiar')) {
                const cost = product.cost || 0;
                dailyCost += cost * item.quantity;
                dailyProfit += (item.priceAtSale - cost) * item.quantity;
            }
        });
    });

    return { dailyCost, dailyProfit };

  }, [sortedSales, excludeFamiliar, getProduct]);

  const renderSerials = (item: SaleItem, saleId: string) => {
    if (!item.serials || item.serials.length === 0) {
      return <p className="text-xs text-muted-foreground italic">Sin series</p>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {item.serials.map((serial, index) => (
          <Badge key={`${item.productId}-${saleId}-serial-${index}-${serial}`} variant="outline" className="font-mono text-xs">
            <Hash className="w-3 h-3 mr-1" />
            {serial}
          </Badge>
        ))}
      </div>
    );
  };


  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Historial de Ventas</h1>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/sales/consignor-reports')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Reportes de Consignatarios
          </Button>
          <div className="flex items-center space-x-2">
            <Switch id="exclude-familiar" checked={excludeFamiliar} onCheckedChange={setExcludeFamiliar} />
            <Label htmlFor="exclude-familiar">Excluir ventas &quot;Familiar&quot;</Label>
          </div>
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredDailyCost)}</div>
            <p className="text-xs text-muted-foreground">Costo de los productos vendidos hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia del Día</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredDailyProfit)}</div>
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
                    <TableHead>
                      <SortableHeader field="saleId">ID Venta</SortableHeader>
                    </TableHead>
                    <TableHead>
                      <SortableHeader field="createdAt">Fecha</SortableHeader>
                    </TableHead>
                    <TableHead>
                      <SortableHeader field="customerName">Cliente</SortableHeader>
                    </TableHead>
                    <TableHead>
                      <SortableHeader field="cashierName">Cajero</SortableHeader>
                    </TableHead>
                    <TableHead>
                      <SortableHeader field="paymentMethod">Método de Pago</SortableHeader>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortableHeader field="totalAmount" className="justify-end">Monto Total</SortableHeader>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredSales.map((sale, index) => {
                      // Create a unique key that combines sale id, saleId, timestamp and index to ensure uniqueness
                      const uniqueKey = `${sale.id || sale.saleId}-${sale.createdAt.getTime()}-${index}`;
                      const collapsibleKey = uniqueKey;
                      
                      return (
                      <Fragment key={uniqueKey}>
                          <TableRow className="cursor-pointer" onClick={() => toggleCollapsible(collapsibleKey)}>
                                <TableCell>
                                  <Button variant="ghost" size="icon">
                                      {openCollapsibles[collapsibleKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      <span className="sr-only">Toggle details</span>
                                  </Button>
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
                                <TableCell className="text-right">{formatCurrency(sale.totalAmount)}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
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
                            {openCollapsibles[collapsibleKey] && (
                              <TableRow>
                                  <TableCell colSpan={8} className="p-0 border-0">
                                      <div className="p-4 bg-muted/50">
                                        <h4 className="font-semibold mb-2">Detalle de la Venta</h4>
                                        <Table>
                                            <TableHeader>
                                            <TableRow>
                                                <TableHead>Producto</TableHead>
                                                <TableHead>Series/IMEIs</TableHead>
                                                <TableHead className="text-right">Cantidad</TableHead>
                                                <TableHead className="text-right">Precio Unit.</TableHead>
                                                <TableHead className="text-right">Costo Unit.</TableHead>
                                                <TableHead className="text-right">Ganancia</TableHead>
                                            </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {sale.items.map((item, itemIndex) => {
                                                const product = getProduct(item.productId);
                                                const cost = product?.cost || 0;
                                                const profit = product?.ownershipType === 'Familiar' ? 0 : (item.priceAtSale - cost) * item.quantity;
                                                return (
                                                <TableRow key={`${uniqueKey}-item-${itemIndex}-${item.productId}-${item.serials?.join('-') || 'no-serials'}`}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell>{renderSerials(item, sale.saleId)}</TableCell>
                                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(item.priceAtSale)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(cost)}</TableCell>
                                    <TableCell className={cn("text-right font-medium", profit > 0 ? "text-green-600" : "text-red-600")}>
                                    {formatCurrency(profit)}
                                    </TableCell>
                                                </TableRow>
                                                );
                                            })}
                                            </TableBody>
                                        </Table>
                                      </div>
                                  </TableCell>
                              </TableRow>
                            )}
                        </Fragment>
                      );
                    })}
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

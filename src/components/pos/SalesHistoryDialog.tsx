"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sale, Product } from "@/types";
import { Search, Calendar, User, ShoppingBag, ArrowRight, ArrowLeft, Loader2, MoreVertical, RefreshCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ChangeProductDialog from "./ChangeProductDialog";
import { createProductChange } from "@/lib/services/salesChangeService";
import { getSales } from "@/lib/services/salesService";
import { Card } from "@/components/ui/card";

// Helper type extending Sale to include UI-specific needs if any
// but we just use Sale for now

interface SalesHistoryDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    // Previously we passed 'sales' as a prop, but now we should probably fetch them internally or controlled by parent.
    // For this refactor, I'll keep the prop signature compatible but maybe unused if I fetch inside,
    // OR better: update POSClient to pass the fetcher or remove 'sales' prop and fetch inside.
    // Given POSClient usage: <SalesHistoryDialog sales={salesHistory} ... />
    // I will switch to fetching INSIDE this component for pagination, so removing 'sales' prop is cleaner,
    // but to avoid breaking POSClient immediately, I'll keep it as optional or ignore it.
    allProducts: Product[]; // Needed for the change dialog
}

export default function SalesHistoryDialog({
    isOpen,
    onOpenChange,
    allProducts
}: SalesHistoryDialogProps) {
    const [data, setData] = useState<{ sales: Sale[], total: number }>({ sales: [], total: 0 });
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(0);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const limit = 20;

    const [changeDialogSale, setChangeDialogSale] = useState<Sale | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchSales();
        }
    }, [isOpen, page, searchQuery, selectedDate]); // Refetch when these change

    const fetchSales = async () => {
        setLoading(true);
        try {
            const result = await getSales('completed', page, limit, searchQuery, selectedDate);
            setData(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Debounced search handler could be added, but for now specific effect dependency works.

    // Pagination handlers
    const nextPage = () => {
        if ((page + 1) * limit < data.total) setPage(p => p + 1);
    };

    const prevPage = () => {
        if (page > 0) setPage(p => p - 1);
    };

    // Handle the actual exchange process call
    const processProductChange = async (params: any) => {
        const result = await createProductChange(params);
        if (!result.success) {
            throw new Error(result.error);
        }
        // In a real app we might want to refresh the sales list here
        // For now we'll just close the dialogs
        setChangeDialogSale(null);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Historial de Ventas</DialogTitle>
                    </DialogHeader>

                    <div className="flex gap-2 mb-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Buscar por número de venta, cliente o producto..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                            />
                        </div>
                        <div className="w-40">
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => { setSelectedDate(e.target.value); setPage(0); }}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <ScrollArea className="flex-1 -mx-2 px-2">
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
                        ) : (
                            <div className="space-y-3 pb-4">
                                {data.sales.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        No se encontraron ventas.
                                    </div>
                                ) : (
                                    data.sales.map(sale => (
                                        <Card key={sale.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex gap-2 items-center">
                                                    <span className="font-bold text-lg">{sale.saleId}</span>
                                                    <Badge variant={sale.status === 'cancelled' ? 'destructive' : 'outline'}>
                                                        {sale.status === 'cancelled' ? 'Cancelada' : 'Completada'}
                                                    </Badge>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-lg">{formatCurrency(sale.totalAmount)}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(sale.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {sale.customerName || "Cliente General"}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {/* Display friendly date/time */}
                                                    {new Date(sale.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>

                                            <div className="bg-muted/50 rounded p-2 text-sm mb-3">
                                                <div className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Productos</div>
                                                <div className="space-y-1">
                                                    {sale.items.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center text-xs">
                                                            <span>{item.quantity}x {item.name}</span>
                                                            <span>{formatCurrency(item.priceAtSale)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-2 border-t mt-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                            <span className="sr-only">Acciones</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            disabled={sale.status === 'cancelled'}
                                                            onClick={() => setChangeDialogSale(sale)}
                                                            className="cursor-pointer"
                                                        >
                                                            <RefreshCcw className="mr-2 h-4 w-4" />
                                                            <span>Cambiar Producto</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                        <Button variant="outline" size="sm" onClick={prevPage} disabled={page === 0 || loading}>
                            <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Página {page + 1} de {Math.ceil(data.total / limit)} ({data.total} ventas)
                        </div>
                        <Button variant="outline" size="sm" onClick={nextPage} disabled={(page + 1) * limit >= data.total || loading}>
                            Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Nested Dialog for Changing Product */}
            {changeDialogSale && (
                <ChangeProductDialog
                    sale={changeDialogSale}
                    isOpen={!!changeDialogSale}
                    onOpenChange={(open) => !open && setChangeDialogSale(null)}
                    products={allProducts}
                    onProcessChange={processProductChange}
                />
            )}
        </>
    );
}

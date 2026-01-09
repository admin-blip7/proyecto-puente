"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sale, SaleItem, Product } from "@/types";
import { Search, Loader2, ArrowRight, AlertTriangle, CheckCircle, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

interface ChangeProductDialogProps {
    sale: Sale;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    products: Product[];
    onProcessChange: (params: any) => Promise<void>;
}

export default function ChangeProductDialog({
    sale,
    isOpen,
    onOpenChange,
    products,
    onProcessChange
}: ChangeProductDialogProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Select Item, 2: Select New Product, 3: Confirm
    const [selectedItem, setSelectedItem] = useState<SaleItem | null>(null);
    const [selectedNewProduct, setSelectedNewProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [changeReason, setChangeReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const { userProfile } = useAuth();
    const { toast } = useToast();

    const resetState = () => {
        setStep(1);
        setSelectedItem(null);
        setSelectedNewProduct(null);
        setSearchQuery("");
        setChangeReason("");
        setIsProcessing(false);
    };

    const handeClose = () => {
        if (isProcessing) return;
        onOpenChange(false);
        // Slight delay to reset state after animation
        setTimeout(resetState, 300);
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return [];
        const lowerQuery = searchQuery.toLowerCase();
        return products.filter(p =>
            (p.name.toLowerCase().includes(lowerQuery) ||
                p.sku.toLowerCase().includes(lowerQuery)) &&
            p.stock > 0 &&
            p.type === 'Venta' // Only allow simple products for now
        ).slice(0, 20);
    }, [products, searchQuery]);

    const priceDifference = useMemo(() => {
        if (!selectedItem || !selectedNewProduct) return 0;
        const originalTotal = selectedItem.priceAtSale * selectedItem.quantity;
        const newTotal = selectedNewProduct.price * selectedItem.quantity; // Defaulting to same quantity
        return newTotal - originalTotal;
    }, [selectedItem, selectedNewProduct]);

    const handleProcessChange = async () => {
        if (!selectedItem || !selectedNewProduct || !userProfile) return;
        if (!changeReason.trim()) {
            toast({ title: "Error", description: "Debes ingresar un motivo para el cambio", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            await onProcessChange({
                saleId: sale.id,
                originalItem: selectedItem,
                newProduct: selectedNewProduct,
                newQuantity: selectedItem.quantity, // Keeping same quantity for MVP
                reason: changeReason,
                performedBy: userProfile.uid,
                performedByName: userProfile.name
            });
            toast({ title: "Éxito", description: "Cambio de producto realizado correctamente" });
            handeClose();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo procesar el cambio", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handeClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Cambio de Producto</DialogTitle>
                    <DialogDescription>
                        {step === 1 && "Selecciona el producto que el cliente desea devolver."}
                        {step === 2 && "Busca y selecciona el nuevo producto a entregar."}
                        {step === 3 && "Verifica los detalles del cambio y confirma la operación."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
                    {/* STEP 1: SELECT ORIGINAL ITEM */}
                    {step === 1 && (
                        <div className="space-y-2">
                            <ScrollArea className="h-[400px]">
                                {sale.items.map((item, idx) => (
                                    <div
                                        key={`${item.productId}-${idx}`}
                                        className={`p-4 border rounded-lg mb-2 cursor-pointer transition-colors ${selectedItem === item ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted'}`}
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-sm text-muted-foreground">Cantidad: {item.quantity} · Precio venta: {formatCurrency(item.priceAtSale)}</div>
                                                <div className="text-sm text-muted-foreground">Total: {formatCurrency(item.priceAtSale * item.quantity)}</div>
                                            </div>
                                            {selectedItem === item && <CheckCircle className="h-5 w-5 text-primary" />}
                                        </div>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}

                    {/* STEP 2: SELECT NEW PRODUCT */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="bg-muted/50 p-3 rounded-md mb-4 flex justify-between items-center text-sm">
                                <span>Producto a devolver:</span>
                                <span className="font-medium text-destructive">-{selectedItem?.name} ({formatCurrency(selectedItem?.priceAtSale || 0)})</span>
                            </div>

                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar producto por nombre o SKU..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                    autoFocus
                                />
                            </div>

                            <ScrollArea className="h-[300px] border rounded-md">
                                {filteredProducts.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        {searchQuery ? "No se encontraron productos." : "Escribe para buscar..."}
                                    </div>
                                ) : (
                                    <div className="space-y-1 p-2">
                                        {filteredProducts.map(product => (
                                            <div
                                                key={product.id}
                                                className={`p-3 border rounded-md cursor-pointer flex items-center gap-3 hover:bg-muted/50 transition-colors ${selectedNewProduct?.id === product.id ? 'border-primary bg-primary/5' : ''}`}
                                                onClick={() => setSelectedNewProduct(product)}
                                            >
                                                <div className="relative h-10 w-10 min-w-10 overflow-hidden rounded bg-muted flex items-center justify-center">
                                                    {product.imageUrls?.[0] ? (
                                                        <Image
                                                            src={product.imageUrls[0]}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="40px"
                                                        />
                                                    ) : (
                                                        <Package className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{product.name}</div>
                                                    <div className="text-xs text-muted-foreground flex gap-2">
                                                        <span>SKU: {product.sku}</span>
                                                        <span className={product.stock <= 5 ? "text-amber-600 font-medium" : ""}>Stock: {product.stock}</span>
                                                    </div>
                                                </div>
                                                <div className="font-bold text-sm">
                                                    {formatCurrency(product.price)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    )}

                    {/* STEP 3: CONFIRM */}
                    {step === 3 && selectedItem && selectedNewProduct && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                                <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50">
                                    <div className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase mb-1">Entra (Devolución)</div>
                                    <div className="font-medium text-sm line-clamp-2">{selectedItem.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{selectedItem.quantity} x {formatCurrency(selectedItem.priceAtSale)}</div>
                                </div>

                                <ArrowRight className="text-muted-foreground" />

                                <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/50">
                                    <div className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase mb-1">Sale (Entrega)</div>
                                    <div className="font-medium text-sm line-clamp-2">{selectedNewProduct.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{selectedItem.quantity} x {formatCurrency(selectedNewProduct.price)}</div>
                                </div>
                            </div>

                            <div className={`p-4 rounded-lg flex items-center justify-between border ${priceDifference > 0 ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30' : priceDifference < 0 ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30' : 'bg-gray-50 border-gray-200 dark:bg-gray-900'}`}>
                                <div className="font-medium">
                                    {priceDifference > 0 ? "Diferencia a COBRAR:" : priceDifference < 0 ? "Diferencia a DEVOLVER:" : "Cambio sin costo"}
                                </div>
                                <div className={`text-xl font-bold ${priceDifference > 0 ? 'text-amber-600' : priceDifference < 0 ? 'text-blue-600' : ''}`}>
                                    {formatCurrency(Math.abs(priceDifference))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reason">Motivo del cambio</Label>
                                <Textarea
                                    id="reason"
                                    placeholder="Ej. Cliente prefiere otro color, producto defectuoso, etc."
                                    value={changeReason}
                                    onChange={e => setChangeReason(e.target.value)}
                                />
                            </div>

                            {priceDifference !== 0 && (
                                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>
                                        {priceDifference > 0
                                            ? "Asegúrese de cobrar la diferencia al cliente."
                                            : "Asegúrese de entregar el efectivo o reembolso al cliente."}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4 border-t pt-4">
                    {step === 1 && (
                        <>
                            <Button variant="outline" onClick={handeClose}>Cancelar</Button>
                            <Button onClick={() => setStep(2)} disabled={!selectedItem}>Siguiente</Button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                            <Button onClick={() => setStep(3)} disabled={!selectedNewProduct}>Siguiente</Button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <Button variant="outline" onClick={() => setStep(2)} disabled={isProcessing}>Atrás</Button>
                            <Button onClick={handleProcessChange} disabled={!changeReason.trim() || isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Cambio
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

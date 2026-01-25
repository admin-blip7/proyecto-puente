"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Product, LabelSettings, Consignor, Supplier, LabelPrintItem } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { Printer, Search, Trash2, PlusCircle, Eye } from "lucide-react";
import { generateAndPrintLabels } from "@/lib/printing/labelPrinter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PrintPreview from "@/components/admin/settings/PrintPreview";

interface LabelPrinterClientProps {
    allProducts: Product[];
    settings: LabelSettings;
    consignors: Consignor[];
    suppliers: Supplier[];
}

// 🔥 FIX #1: Stable key generation without timestamps
const getStableProductKey = (product: { id?: string; sku?: string }, index: number): string => {
    return product.id || product.sku || `product-${index}`;
};

export default function LabelPrinterClient({ allProducts, settings, consignors, suppliers }: LabelPrinterClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [printList, setPrintList] = useState<LabelPrintItem[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const consignorMap = useMemo(() => new Map(consignors.map((c) => [c.id, c.name])), [consignors]);
    const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

    // 🔥 FIX #2: Removed unstable productKeyMap that was causing re-renders

    const resolveSupplierName = (product: Product): string | undefined => {
        type SupplierCandidate = {
            supplierName?: string;
            supplier?: string;
            supplierId?: string;
        };

        const candidate = product as unknown as SupplierCandidate;

        if (candidate.supplierName && candidate.supplierName.trim().length > 0) {
            return candidate.supplierName;
        }
        if (candidate.supplier && candidate.supplier.trim().length > 0) {
            return candidate.supplier;
        }
        if (candidate.supplierId) {
            return supplierMap.get(candidate.supplierId) ?? undefined;
        }
        return undefined;
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();

        return allProducts.filter(p => {
            const name = p.name.toLowerCase();
            const sku = p.sku.toLowerCase();
            const keywords = p.searchKeywords || [];
            return name.includes(lowerCaseQuery) || sku.includes(lowerCaseQuery) || keywords.some(k => k.includes(lowerCaseQuery));
        });
    }, [searchQuery, allProducts]);

    // 🔥 FIX #3: Optimized focus management with timeout
    const safeFocusInput = useCallback(() => {
        // Clear any existing timeout
        if (focusTimeoutRef.current) {
            clearTimeout(focusTimeoutRef.current);
        }

        // Use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
            focusTimeoutRef.current = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 0);
        });
    }, []);

    const handleSelectProduct = useCallback((product: Product) => {
        const supplierName = resolveSupplierName(product);
        const consignorName = product.consignorId ? consignorMap.get(product.consignorId) : undefined;

        setPrintList((prev) => {
            const candidate: LabelPrintItem = {
                product: {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    price: product.price,
                    cost: product.cost,
                    stock: product.stock,
                    ownershipType: product.ownershipType,
                    consignorName,
                    supplierName,
                    attributes: product.attributes,
                },
                quantity: 1,
            };

            const candidateProductId = candidate.product.id ?? candidate.product.sku;

            const existingItem = prev.find((item) => {
                const productId = item.product.id ?? item.product.sku;
                return productId === candidateProductId;
            });

            if (existingItem) {
                return prev.map((item) => {
                    const productId = item.product.id ?? item.product.sku;
                    return productId === candidateProductId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item;
                });
            }
            return [...prev, candidate];
        });

        // 🔥 FIX #4: Use safe focus instead of direct focus
        safeFocusInput();
    }, [consignorMap, supplierMap, safeFocusInput]);

    const handleSearchInputChange = useCallback((value: string) => {
        setSearchQuery(value);
        // Solo abrir el popover si está cerrado y hay texto
        if (!isSearchOpen && value.length > 0) {
            setIsSearchOpen(true);
        }
    }, [isSearchOpen]);

    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsSearchOpen(false);
            searchInputRef.current?.blur();
        }
    }, []);

    // 🔥 FIX #5: Stable key for quantity updates
    const handleUpdateQuantity = useCallback((productId: string, quantity: number) => {
        setPrintList((prev) => prev.map((item) => {
            const currentProductId = item.product.id ?? item.product.sku;
            return currentProductId === productId ? { ...item, quantity: Math.max(0, quantity) } : item;
        }));
    }, []);

    const handleRemoveItem = useCallback((productId: string) => {
        setPrintList((prev) => prev.filter((item) => {
            const currentProductId = item.product.id ?? item.product.sku;
            return currentProductId !== productId;
        }));
    }, []);

    const handleGenerate = async () => {
        if (printList.length === 0) return;

        const payload = printList
            .filter((item) => item.quantity > 0)
            .map((item) => ({
                product: { ...item.product },
                quantity: item.quantity,
            }));

        if (payload.length > 0) {
            await generateAndPrintLabels(payload, settings);
        }
    };

    // 🔥 FIX #6: Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (focusTimeoutRef.current) {
                clearTimeout(focusTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Generación de Etiquetas PDF</h1>
                    <p className="text-muted-foreground">Busca productos y agrégalos a la lista para generar múltiples etiquetas en formato PDF.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Buscar y Agregar Productos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div>
                        <Popover open={isSearchOpen} onOpenChange={(open) => {
                            // Solo permitir cerrar el popover manualmente o con Escape
                            if (!open && searchQuery.length > 0) {
                                return; // No cerrar si hay búsqueda activa
                            }
                            setIsSearchOpen(open);
                        }}>
                            <PopoverTrigger asChild className="w-full">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        ref={searchInputRef}
                                        placeholder="Buscar productos (puedes seleccionar varios)..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchInputChange(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        onFocus={() => searchQuery && setIsSearchOpen(true)}
                                        className="w-full pl-10"
                                    />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="p-1 w-[--radix-popover-trigger-width]" align="start">
                                {/* 🔥 FIX #7: Removed Command wrapper to avoid cmdk conflicts */}
                                <div className="max-h-[300px] overflow-y-auto">
                                    {printList.length > 0 && (
                                        <div className="p-2 border-b">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    // No cerrar el popover, solo limpiar para nueva búsqueda
                                                    safeFocusInput();
                                                }}
                                                className="w-full justify-between text-xs"
                                            >
                                                Limpiar búsqueda
                                                <PlusCircle className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.slice(0, 50).map(product => (
                                            <button
                                                key={getStableProductKey(product, filteredProducts.indexOf(product))}
                                                // 🔥 FIX #8: Optimized mouse event handling
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleSelectProduct(product);
                                                }}
                                                className="w-full text-left p-3 hover:bg-accent rounded-sm cursor-pointer flex items-center justify-between gap-2"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium truncate">{product.name}</span>
                                                        <span className="text-xs text-muted-foreground">{product.sku}</span>
                                                    </div>
                                                    {product.category && (
                                                        <div className="mt-1">
                                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                                {product.category}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {product.attributes && Object.keys(product.attributes).length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {Object.entries(product.attributes)
                                                                .filter(([_, value]) => value !== null && value !== undefined && value !== "")
                                                                .slice(0, 3)
                                                                .map(([key, value]) => (
                                                                    <span
                                                                        key={`${key}-${value}`}
                                                                        className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded"
                                                                    >
                                                                        {key}: {String(value)}
                                                                    </span>
                                                                ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <PlusCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Escribe para buscar productos.</div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>2. Lista de Etiquetas</CardTitle>
                    <CardDescription>Ajusta la cantidad de etiquetas para cada producto.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="w-[120px]">Cantidad</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {printList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        La lista de impresión está vacía.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                printList.map((item, index) => {
                                    const itemKey = getStableProductKey(item.product, index);
                                    return (
                                        <TableRow key={itemKey}>
                                            <TableCell className="font-medium">{item.product.name}</TableCell>
                                            <TableCell>{item.product.sku}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQuantity(itemKey, parseInt(e.target.value) || 0)}
                                                    min="0"
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(itemKey)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <div className="flex gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={printList.length === 0}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Vista Previa PDF
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Previsualización de Impresión PDF</DialogTitle>
                                    <DialogDescription>
                                        Revisa cómo se verán las etiquetas antes de generar el PDF final.
                                    </DialogDescription>
                                </DialogHeader>
                                <PrintPreview settings={settings} />
                            </DialogContent>
                        </Dialog>
                        <Button onClick={handleGenerate} disabled={printList.length === 0}>
                            <Printer className="mr-2 h-4 w-4" />
                            Generar e Imprimir PDF
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
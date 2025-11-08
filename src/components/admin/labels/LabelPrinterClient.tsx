"use client";

import { useState, useMemo, useRef } from "react";
import { Product, LabelSettings, Consignor, Supplier, LabelPrintItem } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { Printer, Search, Trash2, PlusCircle, Eye } from "lucide-react";
import { generateAndPrintLabels } from "@/lib/printing/labelPrinter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateUniqueKey, reportInvalidIds } from "@/lib/utils/keys";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PrintPreview from "@/components/admin/settings/PrintPreview";

interface LabelPrinterClientProps {
    allProducts: Product[];
    settings: LabelSettings;
    consignors: Consignor[];
    suppliers: Supplier[];
}

export default function LabelPrinterClient({ allProducts, settings, consignors, suppliers }: LabelPrinterClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [printList, setPrintList] = useState<LabelPrintItem[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const consignorMap = useMemo(() => new Map(consignors.map((c) => [c.id, c.name])), [consignors]);
    const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

    const getProductKey = (product: LabelPrintItem['product'], index: number = 0) => {
      return generateUniqueKey(product, index, 'label-product');
    };
    
    // Para funciones que necesitan buscar por productId, usamos un mapa de keys
    const productKeyMap = useMemo(() => {
      const map = new Map<string, string>();
      printList.forEach((item, index) => {
        const key = getProductKey(item.product, index);
        const productId = item.product.id ?? item.product.sku;
        map.set(productId, key);
      });
      return map;
    }, [printList]);

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

    const handleSelectProduct = (product: Product) => {
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
                },
                quantity: 1,
            };

            const candidateProductId = candidate.product.id ?? candidate.product.sku;
            const candidateKey = getProductKey(candidate.product, prev.length);

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

        // Limpiar la búsqueda pero mantener el foco
        setSearchQuery("");
        setIsSearchOpen(false);
        
        // Enfocar el input inmediatamente después de seleccionar
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 100);
    };
    
    const handleSearchInputChange = (value: string) => {
        setSearchQuery(value);
        setIsSearchOpen(value.length > 0);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setIsSearchOpen(false);
            searchInputRef.current?.blur();
        }
    };

    const handleUpdateQuantity = (productId: string, quantity: number) => {
        setPrintList((prev) => prev.map((item) => {
            const currentProductId = item.product.id ?? item.product.sku;
            return currentProductId === productId ? { ...item, quantity: Math.max(0, quantity) } : item;
        }));
    };

    const handleRemoveItem = (productId: string) => {
        setPrintList((prev) => prev.filter((item) => {
            const currentProductId = item.product.id ?? item.product.sku;
            return currentProductId !== productId;
        }));
    };

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
                        <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
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
                                <Command>
                                  <CommandList>
                                    {printList.length > 0 && (
                                        <div className="p-2 border-b">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setIsSearchOpen(false);
                                                    searchInputRef.current?.focus();
                                                }}
                                                className="w-full justify-between text-xs"
                                            >
                                                Cerrar búsqueda
                                                <PlusCircle className="h-3 w-3 rotate-45" />
                                            </Button>
                                        </div>
                                    )}
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.slice(0, 50).map(product => (
                                            <button
                                                key={product.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
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
                                                                    key={key}
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
                                  </CommandList>
                                </Command>
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
                                    const itemKey = getProductKey(item.product, index);
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

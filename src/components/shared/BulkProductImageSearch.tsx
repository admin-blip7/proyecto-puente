"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Image as ImageIcon, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { searchProductImagesBulkAction } from "@/lib/actions/imageSearchActions";

const MAX_BULK_PRODUCTS = 20;

interface SearchResult {
    original: string;
    thumbnail: string;
    title: string;
    source?: string;
    width?: number;
    height?: number;
}

interface BulkProductSearchState {
    query: string;
    isSearching: boolean;
    results: SearchResult[];
    selectedImageUrl: string | null;
    error?: string;
}

export interface BulkProductImageTarget {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string;
}

export interface BulkProductImageSelection {
    productId: string;
    productName: string;
    imageUrl: string;
    thumbnailUrl?: string;
}

interface BulkProductImageSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    products: BulkProductImageTarget[];
    onApplySelections: (selections: BulkProductImageSelection[]) => Promise<void> | void;
}

export function BulkProductImageSearch({
    open,
    onOpenChange,
    products,
    onApplySelections
}: BulkProductImageSearchProps) {
    const { toast } = useToast();

    const limitedProducts = useMemo(
        () => products.slice(0, MAX_BULK_PRODUCTS),
        [products]
    );

    const [productStates, setProductStates] = useState<Record<string, BulkProductSearchState>>({});
    const [isSearchingAll, setIsSearchingAll] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    const runBulkSearch = useCallback(async (items: Array<{ productId: string; query: string }>) => {
        if (items.length === 0) return;

        setProductStates(prev => {
            const next = { ...prev };
            for (const item of items) {
                const current = next[item.productId];
                if (!current) continue;
                next[item.productId] = {
                    ...current,
                    isSearching: true,
                    error: undefined
                };
            }
            return next;
        });

        try {
            const response = await searchProductImagesBulkAction(items);

            if (!response.success || !response.items) {
                throw new Error(response.error || "No se pudieron buscar imágenes");
            }

            setProductStates(prev => {
                const next = { ...prev };
                for (const item of response.items) {
                    const current = next[item.productId];
                    if (!current) continue;

                    next[item.productId] = {
                        ...current,
                        isSearching: false,
                        results: item.results || [],
                        error: item.success ? undefined : (item.error || "Sin resultados")
                    };
                }
                return next;
            });
        } catch (error) {
            console.error(error);
            setProductStates(prev => {
                const next = { ...prev };
                for (const item of items) {
                    const current = next[item.productId];
                    if (!current) continue;
                    next[item.productId] = {
                        ...current,
                        isSearching: false,
                        results: [],
                        error: "Error al buscar imágenes"
                    };
                }
                return next;
            });

            toast({
                variant: "destructive",
                title: "Búsqueda masiva fallida",
                description: "No se pudieron cargar imágenes para los productos seleccionados."
            });
        }
    }, [toast]);

    useEffect(() => {
        if (!open) {
            setProductStates({});
            setIsSearchingAll(false);
            setIsApplying(false);
            return;
        }

        const initialStates: Record<string, BulkProductSearchState> = {};
        for (const product of limitedProducts) {
            initialStates[product.id] = {
                query: product.name || "",
                isSearching: false,
                results: [],
                selectedImageUrl: null
            };
        }

        setProductStates(initialStates);

        const initialItems = limitedProducts
            .map(product => ({
                productId: product.id,
                query: (product.name || "").trim()
            }))
            .filter(item => item.query.length >= 2);

        if (initialItems.length > 0) {
            setIsSearchingAll(true);
            runBulkSearch(initialItems).finally(() => setIsSearchingAll(false));
        }
    }, [limitedProducts, open, runBulkSearch]);

    const selectedCount = useMemo(() => {
        let count = 0;
        for (const product of limitedProducts) {
            if (productStates[product.id]?.selectedImageUrl) {
                count += 1;
            }
        }
        return count;
    }, [limitedProducts, productStates]);

    const handleSearchAll = async () => {
        const items = limitedProducts
            .map(product => ({
                productId: product.id,
                query: (productStates[product.id]?.query || "").trim()
            }))
            .filter(item => item.query.length >= 2);

        if (items.length === 0) {
            toast({
                variant: "destructive",
                title: "Consulta vacía",
                description: "Ingresa al menos 2 caracteres en los productos a buscar."
            });
            return;
        }

        setIsSearchingAll(true);
        await runBulkSearch(items);
        setIsSearchingAll(false);
    };

    const handleSearchOne = async (productId: string) => {
        const query = (productStates[productId]?.query || "").trim();
        if (query.length < 2) {
            toast({
                variant: "destructive",
                title: "Consulta muy corta",
                description: "Ingresa al menos 2 caracteres para buscar."
            });
            return;
        }

        await runBulkSearch([{ productId, query }]);
    };

    const handleApply = async () => {
        const selections: BulkProductImageSelection[] = [];

        for (const product of limitedProducts) {
            const selectedImageUrl = productStates[product.id]?.selectedImageUrl;
            if (!selectedImageUrl) continue;
            const selectedResult = productStates[product.id]?.results.find(result => result.original === selectedImageUrl);

            selections.push({
                productId: product.id,
                productName: product.name,
                imageUrl: selectedImageUrl,
                thumbnailUrl: selectedResult?.thumbnail
            });
        }

        if (selections.length === 0) {
            toast({
                variant: "destructive",
                title: "Sin selección",
                description: "Selecciona al menos una imagen para aplicar."
            });
            return;
        }

        try {
            setIsApplying(true);
            await onApplySelections(selections);
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5 text-primary" />
                        Búsqueda Masiva de Imágenes
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona 1 imagen por producto. Se muestran 3 opciones por cada producto (máximo {MAX_BULK_PRODUCTS} productos).
                    </DialogDescription>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Badge variant="secondary">{limitedProducts.length} productos</Badge>
                        <Badge variant={selectedCount > 0 ? "default" : "outline"}>
                            {selectedCount} con imagen seleccionada
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-muted/20 space-y-4">
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSearchAll}
                            disabled={isSearchingAll || isApplying || limitedProducts.length === 0}
                        >
                            {isSearchingAll ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Buscando todo...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Buscar en todos
                                </>
                            )}
                        </Button>
                    </div>

                    {limitedProducts.map(product => {
                        const state = productStates[product.id];
                        const hasSelected = !!state?.selectedImageUrl;

                        return (
                            <Card key={product.id} className={cn("shadow-sm", hasSelected && "ring-1 ring-primary/40")}>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                        <div className="flex items-center gap-3 min-w-0 lg:w-[320px]">
                                            <div className="h-12 w-12 rounded border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">SKU: {product.sku}</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex gap-2">
                                            <Input
                                                value={state?.query || ""}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setProductStates(prev => ({
                                                        ...prev,
                                                        [product.id]: {
                                                            ...(prev[product.id] || {
                                                                query: "",
                                                                isSearching: false,
                                                                results: [],
                                                                selectedImageUrl: null
                                                            }),
                                                            query: value
                                                        }
                                                    }));
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleSearchOne(product.id);
                                                    }
                                                }}
                                                placeholder="Buscar imagen..."
                                                disabled={isApplying}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => handleSearchOne(product.id)}
                                                disabled={state?.isSearching || isApplying}
                                            >
                                                {state?.isSearching ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>

                                        <Badge variant={hasSelected ? "default" : "outline"}>
                                            {hasSelected ? "Imagen elegida" : "Pendiente"}
                                        </Badge>
                                    </div>

                                    {state?.isSearching ? (
                                        <div className="h-28 border rounded-md flex items-center justify-center text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Buscando imágenes...
                                        </div>
                                    ) : state?.results?.length ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {state.results.map((result, index) => {
                                                const isSelected = state.selectedImageUrl === result.original;
                                                return (
                                                    <button
                                                        key={`${product.id}-${result.original}-${index}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setProductStates(prev => ({
                                                                ...prev,
                                                                [product.id]: {
                                                                    ...(prev[product.id] || {
                                                                        query: product.name,
                                                                        isSearching: false,
                                                                        results: [],
                                                                        selectedImageUrl: null
                                                                    }),
                                                                    selectedImageUrl: isSelected ? null : result.original
                                                                }
                                                            }));
                                                        }}
                                                        className={cn(
                                                            "relative border rounded-md overflow-hidden group bg-background transition-all",
                                                            "focus:outline-none focus:ring-2 focus:ring-primary/40",
                                                            isSelected ? "ring-2 ring-primary shadow-sm" : "hover:shadow-sm"
                                                        )}
                                                        disabled={isApplying}
                                                    >
                                                        <div className="aspect-video bg-muted">
                                                            <img
                                                                src={result.thumbnail || result.original}
                                                                alt={result.title}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="p-2 text-left">
                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                {result.title || "Imagen"}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2 rounded-full bg-primary text-primary-foreground p-1">
                                                                <Check className="h-3 w-3" />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="h-28 border border-dashed rounded-md flex items-center justify-center text-sm text-muted-foreground">
                                            {state?.error || "Sin resultados para este producto"}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <DialogFooter className="px-6 py-4 border-t flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        Se aplicarán {selectedCount} imágenes en total.
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isApplying}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleApply}
                            disabled={isApplying || selectedCount === 0}
                        >
                            {isApplying ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Aplicando...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" />
                                    Aplicar Imágenes
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

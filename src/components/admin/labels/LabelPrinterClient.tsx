"use client";

import { useState, useMemo, useRef } from "react";
import { Product, StockEntryItem } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import PrintLabelsView from "../stock-entry/PrintLabelsView";
import { Label } from "@/components/ui/label";
import { Printer, Search } from "lucide-react";


interface LabelPrinterClientProps {
    allProducts: Product[];
}

export default function LabelPrinterClient({ allProducts }: LabelPrinterClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [labelQuantity, setLabelQuantity] = useState(1);
    const [showPrintView, setShowPrintView] = useState(false);
    const [itemsToPrint, setItemsToPrint] = useState<StockEntryItem[]>([]);

    const searchContainerRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(searchContainerRef, () => setPopoverOpen(false));

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return [];
        const lowerCaseQuery = searchQuery.toLowerCase();
        
        return allProducts.filter(p => {
            const name = p.name.toLowerCase();
            const sku = p.sku.toLowerCase();
            return name.includes(lowerCaseQuery) || sku.includes(lowerCaseQuery);
        });
    }, [searchQuery, allProducts]);

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setSearchQuery("");
        setPopoverOpen(false);
        setLabelQuantity(1);
    };

    const handleGenerate = () => {
        if (!selectedProduct) return;
        const item: StockEntryItem = {
            id: uuidv4(),
            productId: selectedProduct.id,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity: labelQuantity,
            price: selectedProduct.price,
            cost: selectedProduct.cost,
            isNew: false, // Not a new product, just printing labels
            ownershipType: selectedProduct.ownershipType,
        }
        setItemsToPrint([item]);
        setShowPrintView(true);
    };
    
    if (showPrintView) {
        return <PrintLabelsView items={itemsToPrint} onDone={() => setShowPrintView(false)} />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Impresión de Etiquetas por Producto</h1>
                    <p className="text-muted-foreground">Busca un producto y genera la cantidad de etiquetas que necesites.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Buscar Producto</CardTitle>
                </CardHeader>
                <CardContent>
                    <div ref={searchContainerRef}>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild className="w-full">
                                <div className="relative">
                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                     <Input
                                        placeholder="Buscar producto por SKU o nombre..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => setPopoverOpen(true)}
                                        className="w-full pl-10"
                                    />
                                </div>
                            </PopoverTrigger>
                            <PopoverContent className="p-1 w-[--radix-popover-trigger-width]" align="start">
                                <Command>
                                  <CommandList>
                                    {filteredProducts.length > 0 && (
                                        filteredProducts.slice(0, 50).map(product => (
                                            <button 
                                                key={product.id} 
                                                onClick={() => handleSelectProduct(product)} 
                                                className="w-full text-left p-2 hover:bg-accent rounded-sm cursor-pointer"
                                            >
                                                <span>{product.name}</span>
                                                <span className="text-xs text-muted-foreground ml-2">{product.sku}</span>
                                            </button>
                                        ))
                                    )}
                                  </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            {selectedProduct && (
                 <Card>
                    <CardHeader>
                        <CardTitle>2. Especificar Cantidad y Generar</CardTitle>
                        <CardDescription>Define cuántas etiquetas quieres imprimir para el producto seleccionado.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
                           <p className="text-sm text-muted-foreground">Producto Seleccionado</p>
                           <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
                           <div className="flex justify-between text-sm">
                               <span>SKU: <span className="font-mono">{selectedProduct.sku}</span></span>
                               <span>Precio: <span className="font-bold">${selectedProduct.price.toFixed(2)}</span></span>
                           </div>
                        </div>
                         <div className="space-y-1.5">
                            <Label htmlFor="quantity">Cantidad de Etiquetas</Label>
                            <Input
                                id="quantity"
                                type="number"
                                value={labelQuantity}
                                onChange={(e) => setLabelQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                className="max-w-xs"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleGenerate}>
                            <Printer className="mr-2 h-4 w-4" />
                            Generar e Imprimir Etiquetas
                        </Button>
                    </CardFooter>
                 </Card>
            )}

        </div>
    );
}

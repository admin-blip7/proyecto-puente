"use client";

import { useState, useMemo, useRef } from "react";
import { Product, LabelSettings } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { Printer, Search, Trash2, PlusCircle } from "lucide-react";
import { generateAndPrintLabels } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PrintListItem {
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
}


interface LabelPrinterClientProps {
    allProducts: Product[];
    settings: LabelSettings;
}

export default function LabelPrinterClient({ allProducts, settings }: LabelPrinterClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [printList, setPrintList] = useState<PrintListItem[]>([]);

    const searchContainerRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(searchContainerRef, () => setPopoverOpen(false));

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
        setPrintList(prev => {
            const existingItem = prev.find(item => item.id === product.id);
            if (existingItem) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, {
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                quantity: 1,
            }];
        });
        setSearchQuery("");
        setPopoverOpen(false);
    };
    
    const handleUpdateQuantity = (productId: string, quantity: number) => {
        setPrintList(prev => prev.map(item => 
            item.id === productId ? { ...item, quantity: Math.max(0, quantity) } : item
        ));
    };

    const handleRemoveItem = (productId: string) => {
        setPrintList(prev => prev.filter(item => item.id !== productId));
    };

    const handleGenerate = () => {
        if (printList.length === 0) return;
        
        const payload = printList
            .filter(item => item.quantity > 0)
            .map(item => ({
                name: item.name,
                sku: item.sku,
                price: item.price,
                quantity: item.quantity,
            }));

        if (payload.length > 0) {
            generateAndPrintLabels(payload, settings);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Impresión de Etiquetas por Lote</h1>
                    <p className="text-muted-foreground">Busca productos y agrégalos a la lista para imprimir múltiples etiquetas a la vez.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>1. Buscar y Agregar Productos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div ref={searchContainerRef}>
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild className="w-full">
                                <div className="relative">
                                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                     <Input
                                        placeholder="Buscar producto por SKU o nombre para agregar a la lista..."
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
                                    {filteredProducts.length > 0 ? (
                                        filteredProducts.slice(0, 50).map(product => (
                                            <button 
                                                key={product.id} 
                                                onClick={() => handleSelectProduct(product)} 
                                                className="w-full text-left p-2 hover:bg-accent rounded-sm cursor-pointer flex items-center justify-between"
                                            >
                                                <div>
                                                    <span>{product.name}</span>
                                                    <span className="text-xs text-muted-foreground ml-2">{product.sku}</span>
                                                </div>
                                                <PlusCircle className="h-4 w-4 text-muted-foreground" />
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
                    <CardTitle>2. Lista de Impresión</CardTitle>
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
                                printList.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.sku}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 0)}
                                                min="0"
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleGenerate} disabled={printList.length === 0}>
                        <Printer className="mr-2 h-4 w-4" />
                        Generar e Imprimir Todo
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

"use client";

import { useState, useMemo } from "react";
import { Product, StockEntryItem } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Loader2, Printer } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { processStockEntry } from "@/lib/services/productService";
import PrintLabelsView from "./PrintLabelsView";
import { Label } from "@/components/ui/label";

interface StockEntryClientProps {
    allProducts: Product[];
}

export default function StockEntryClient({ allProducts }: StockEntryClientProps) {
    const [entryList, setEntryList] = useState<StockEntryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [processedItems, setProcessedItems] = useState<StockEntryItem[] | null>(null);

    const { userProfile } = useAuth();
    const { toast } = useToast();

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return [];
        return allProducts.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, allProducts]);

    const handleSelectProduct = (product: Product) => {
        setEntryList(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, {
                id: uuidv4(),
                productId: product.id,
                sku: product.sku,
                name: product.name,
                quantity: 1,
                price: product.price,
                cost: product.cost,
                category: product.category,
                isNew: false
            }];
        });
        setSearchQuery("");
        setPopoverOpen(false);
    };
    
    const generateUniqueSku = () => {
        const existingSkus = new Set([...allProducts.map(p => p.sku), ...entryList.map(item => item.sku)]);
        let newSku = '';
        let isUnique = false;
        
        while (!isUnique) {
            newSku = Math.floor(100000 + Math.random() * 900000).toString();
            if (!existingSkus.has(newSku)) {
                isUnique = true;
            }
        }
        return newSku;
    };


    const handleAddNewProduct = () => {
        const newSku = generateUniqueSku();
        setEntryList(prev => [...prev, {
            id: uuidv4(),
            sku: newSku,
            name: '',
            quantity: 1,
            price: 0,
            cost: 0,
            category: '',
            isNew: true
        }]);
    };

    const handleUpdateItem = (id: string, field: keyof StockEntryItem, value: string | number) => {
        setEntryList(prev => prev.map(item => {
            if (item.id === id) {
                const numericFields = ['quantity', 'price', 'cost'];
                const parsedValue = numericFields.includes(field) ? parseFloat(value as string) || 0 : value;
                return { ...item, [field]: parsedValue };
            }
            return item;
        }));
    };

    const handleRemoveItem = (id: string) => {
        setEntryList(prev => prev.filter(item => item.id !== id));
    };

    const handleProcessEntry = async () => {
        if (!userProfile) {
            toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para procesar." });
            return;
        }
        // Basic validation
        for (const item of entryList) {
            if (!item.sku || !item.name || item.quantity <= 0) {
                toast({ variant: "destructive", title: "Error de Validación", description: `Revisa el producto "${item.name || 'Nuevo Producto'}" y asegúrate que tenga SKU, nombre y cantidad.` });
                return;
            }
        }
        
        setIsLoading(true);
        try {
            const result = await processStockEntry(entryList, userProfile.uid);
            toast({ title: "Éxito", description: `${entryList.length} registros de inventario procesados.` });
            setProcessedItems(result); // Set items for label printing
            setEntryList([]); // Clear the list
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo procesar el ingreso de mercancía." });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (processedItems) {
        return <PrintLabelsView items={processedItems} onDone={() => setProcessedItems(null)} />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ingreso de Mercancía</CardTitle>
                    <CardDescription>Busca productos existentes o crea nuevos para agregarlos a la lista de ingreso.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                    <Command className="w-full sm:w-80">
                        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                            <PopoverTrigger asChild>
                                <CommandInput 
                                    placeholder="Buscar producto por SKU o nombre..."
                                    value={searchQuery}
                                    onValueChange={(value) => {
                                        setSearchQuery(value);
                                        if (value.length > 0 && !popoverOpen) {
                                            setPopoverOpen(true);
                                        } else if (value.length === 0 && popoverOpen) {
                                            setPopoverOpen(false);
                                        }
                                    }}
                                />
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                               <Command>
                                  <CommandList>
                                      <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                      {filteredProducts.map(product => (
                                          <CommandItem key={product.id} onSelect={() => handleSelectProduct(product)}>
                                              {product.name} ({product.sku})
                                          </CommandItem>
                                      ))}
                                  </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </Command>

                    <Button onClick={handleAddNewProduct} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Nuevo Producto
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Lista de Ingreso</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[150px]">SKU</TableHead>
                                    <TableHead>Nombre Producto</TableHead>
                                    <TableHead className="w-[120px]">Categoría</TableHead>
                                    <TableHead className="w-[100px] text-right">Cantidad</TableHead>
                                    <TableHead className="w-[120px] text-right">Precio Venta</TableHead>
                                    <TableHead className="w-[120px] text-right">Costo</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entryList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">La lista de ingreso está vacía.</TableCell>
                                    </TableRow>
                                ) : (
                                    entryList.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Input value={item.sku} readOnly={!item.isNew} className="bg-muted/50" />
                                            </TableCell>
                                            <TableCell>
                                                <Input value={item.name} onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)} disabled={!item.isNew} />
                                            </TableCell>
                                            <TableCell>
                                                <Input value={item.category} onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)} disabled={!item.isNew} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} className="text-right" />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" step="0.01" value={item.price} onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)} disabled={!item.isNew} className="text-right" />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" step="0.01" value={item.cost} onChange={(e) => handleUpdateItem(item.id, 'cost', e.target.value)} className="text-right" />
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
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                       {entryList.length === 0 ? (
                            <p className="text-center text-muted-foreground py-10">La lista de ingreso está vacía.</p>
                       ) : (
                           entryList.map(item => (
                            <Card key={item.id} className="relative">
                                <CardContent className="p-4 space-y-3">
                                    <div className="absolute top-2 right-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>Nombre Producto</Label>
                                        <Input value={item.name} onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)} disabled={!item.isNew} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label>SKU</Label>
                                            <Input value={item.sku} readOnly={!item.isNew} className="bg-muted/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Categoría</Label>
                                            <Input value={item.category} onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)} disabled={!item.isNew} />
                                        </div>
                                    </div>
                                     <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <Label>Cantidad</Label>
                                            <Input type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} className="text-right" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Precio Venta</Label>
                                            <Input type="number" step="0.01" value={item.price} onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)} disabled={!item.isNew} className="text-right" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Costo</Label>
                                            <Input type="number" step="0.01" value={item.cost} onChange={(e) => handleUpdateItem(item.id, 'cost', e.target.value)} className="text-right" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                           ))
                       )}
                    </div>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button size="lg" className="w-full sm:w-auto" onClick={handleProcessEntry} disabled={isLoading || entryList.length === 0}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Confirmar y Procesar Ingreso
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

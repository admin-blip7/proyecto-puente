
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Product, StockEntryItem, Consignor, ownershipTypes, OwnershipType, LabelSettings } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Loader2, Printer, Mic, MicOff } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { processStockEntry } from "@/lib/services/productService";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConsignors } from "@/lib/services/consignorService";
import { parseStockEntryCommand } from "@/ai/flows/parse-stock-entry-command";
import { cn } from "@/lib/utils";
import { generateAndPrintLabels } from "@/lib/printing/labelPrinter";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


interface StockEntryClientProps {
    allProducts: Product[];
    labelSettings: LabelSettings;
}

export default function StockEntryClient({ allProducts: initialProducts, labelSettings }: StockEntryClientProps) {
    const [entryList, setEntryList] = useState<StockEntryItem[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
    const [searchQuery, setSearchQuery] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [consignors, setConsignors] = useState<Consignor[]>([]);
    const [isListening, setIsListening] = useState(false);

    const recognitionRef = useRef<any>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const { userProfile } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    
    useOnClickOutside(searchContainerRef, () => setPopoverOpen(false));

    const handleAddNewProduct = useCallback((name: string = '', quantity: number = 1) => {
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

        const newSku = generateUniqueSku();
        setEntryList(prev => [...prev, {
            id: uuidv4(),
            sku: newSku,
            name: name,
            quantity: quantity,
            price: 0,
            cost: 0,
            ownershipType: 'Propio',
            isNew: true
        }]);
    }, [allProducts, entryList]);
    
    useEffect(() => {
        getConsignors().then(setConsignors);
        
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.lang = 'es-MX';
                recognition.interimResults = false;

                recognition.onstart = () => setIsListening(true);
                recognition.onend = () => setIsListening(false);
                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error);
                    toast({ variant: 'destructive', title: "Error de Voz", description: "No se pudo iniciar el reconocimiento de voz." });
                    setIsListening(false);
                };

                recognition.onresult = async (event: any) => {
                    const transcript = event.results[event.results.length - 1][0].transcript.trim();
                    toast({ title: "Comando reconocido", description: transcript });
                    try {
                        const result = await parseStockEntryCommand({ command: transcript });
                        if (result.productName && result.quantity) {
                            handleAddNewProduct(result.productName, result.quantity);
                            toast({ title: "Producto Agregado", description: `${result.quantity} x ${result.productName}` });
                        }
                    } catch (error) {
                        console.error('Error parsing command', error);
                        toast({ variant: 'destructive', title: "Error de IA", description: "No se pudo interpretar el comando." });
                    }
                };
                recognitionRef.current = recognition;
            }
        }
    }, [toast, handleAddNewProduct]);

    const handleMicClick = () => {
        if (!recognitionRef.current) {
             toast({ variant: 'destructive', title: "No Soportado", description: "El reconocimiento de voz no es compatible con este navegador." });
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
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
                ownershipType: product.ownershipType,
                consignorId: product.consignorId,
                isNew: false
            }];
        });
        setSearchQuery("");
        setPopoverOpen(false);
    };


    const handleUpdateItem = useCallback((id: string, field: keyof StockEntryItem, value: string | number | OwnershipType) => {
        setEntryList(prev => prev.map(item => {
            if (item.id === id) {
                let updatedValue = value;
                if (field === 'price' || field === 'cost' || field === 'quantity') {
                    updatedValue = parseFloat(value as string) || 0;
                }
                const updatedItem = { ...item, [field]: updatedValue };
                
                if (field === 'ownershipType' && value !== 'Consigna') {
                    updatedItem.consignorId = undefined;
                }
                if (field === 'ownershipType' && value === 'Familiar') {
                    updatedItem.price = updatedItem.cost;
                }
                if (field === 'cost' && updatedItem.ownershipType === 'Familiar') {
                    updatedItem.price = updatedValue as number;
                }
                return updatedItem;
            }
            return item;
        }));
    }, []);
    
    const handleRemoveItem = (id: string) => {
        setEntryList(prev => prev.filter(item => item.id !== id));
    };
    
    const validateEntryList = () => {
        for (const item of entryList) {
            if (!item.sku || !item.name || item.quantity <= 0) {
                toast({ variant: "destructive", title: "Error de Validación", description: `Revisa el producto "${item.name || 'Nuevo Producto'}" y asegúrate que tenga SKU, nombre y cantidad.` });
                return false;
            }
            if (item.ownershipType === 'Consigna' && !item.consignorId) {
                toast({ variant: "destructive", title: "Error de Validación", description: `El producto en consigna "${item.name}" debe tener un consignador seleccionado.` });
                return false;
            }
            if (item.ownershipType === 'Familiar' && item.price !== item.cost) {
                toast({ variant: "destructive", title: "Error de Validación", description: `Para el producto familiar "${item.name}", el precio y el costo deben ser iguales.` });
                return false;
            }
        }
        return true;
    }

    const handleProcessEntry = async () => {
        if (!userProfile) {
            toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para procesar." });
            return;
        }
        if (!validateEntryList()) {
            return;
        }
        
        setIsLoading(true);
        try {
            const processedItems = await processStockEntry(entryList, userProfile.uid);
            toast({ title: "Éxito", description: `${entryList.length} registros de inventario procesados.` });
            
            const labelsToPrint = processedItems.map(p => ({
                product: {
                    id: p.productId,
                    name: p.name,
                    sku: p.sku,
                    price: p.price,
                    cost: p.cost,
                    ownershipType: p.ownershipType,
                },
                quantity: p.quantity,
            }));

            await generateAndPrintLabels(labelsToPrint, labelSettings);

            setEntryList([]);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo procesar el ingreso de mercancía." });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ingreso de Mercancía</CardTitle>
                        <CardDescription>Busca productos existentes, crea nuevos o usa tu voz para agregarlos a la lista de ingreso.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div ref={searchContainerRef} className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Enhanced Search Bar */}
                                <div className="w-full relative">
                                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={popoverOpen}
                                                className="w-full justify-between h-12 text-left font-normal"
                                                onClick={() => setPopoverOpen(true)}
                                            >
                                                <span className={cn(
                                                    "truncate",
                                                    !searchQuery && "text-muted-foreground"
                                                )}>
                                                    {searchQuery || "Buscar producto por SKU o nombre..."}
                                                </span>
                                                <div className="flex items-center gap-2 ml-2">
                                                    {searchQuery && (
                                                        <div
                                                            className="h-6 w-6 p-0 hover:bg-destructive/10 rounded-sm flex items-center justify-center cursor-pointer text-sm font-medium"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSearchQuery("");
                                                                setPopoverOpen(false);
                                                            }}
                                                        >
                                                            ×
                                                        </div>
                                                    )}
                                                    <div className="h-4 w-4 shrink-0 opacity-50">
                                                        ⌄
                                                    </div>
                                                </div>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                           <Command>
                                              <CommandInput
                                                placeholder="Buscar producto por SKU o nombre..."
                                                value={searchQuery}
                                                onValueChange={setSearchQuery}
                                                className="h-12"
                                              />
                                              <CommandList className="max-h-[300px]">
                                                {searchQuery.length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        Escribe para buscar productos existentes
                                                    </div>
                                                ) : filteredProducts.length === 0 ? (
                                                    <div className="p-4 text-center">
                                                        <div className="text-sm text-muted-foreground mb-2">
                                                            No se encontraron productos
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                handleAddNewProduct(searchQuery);
                                                                setSearchQuery("");
                                                                setPopoverOpen(false);
                                                            }}
                                                            className="w-full"
                                                        >
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Crear &quot;{searchQuery}&quot;
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <CommandGroup>
                                                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground border-b">
                                                            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                                                        </div>
                                                        {filteredProducts.slice(0, 50).map(product => (
                                                            <CommandItem 
                                                                key={product.id} 
                                                                onSelect={() => handleSelectProduct(product)} 
                                                                className="cursor-pointer flex items-center justify-between p-3 hover:bg-accent"
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{product.name}</span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        SKU: {product.sku} • ${product.price.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Stock: {product.stock || 0}
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                        {filteredProducts.length > 50 && (
                                                            <div className="p-2 text-xs text-center text-muted-foreground border-t">
                                                                Mostrando los primeros 50 resultados
                                                            </div>
                                                        )}
                                                    </CommandGroup>
                                                )}
                                              </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                
                                <div className="flex w-full sm:w-auto items-center gap-2">
                                    <Button onClick={() => handleAddNewProduct()} className="w-full sm:w-auto">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Crear Nuevo
                                    </Button>
                                    <Button
                                        onClick={handleMicClick}
                                        size="icon"
                                        variant={isListening ? "destructive" : "outline"}
                                        className={cn("transition-all", isListening && "animate-pulse")}
                                        >
                                        {isListening ? <MicOff /> : <Mic />}
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Quick Stats */}
                            {entryList.length > 0 && (
                                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                                    <span className="text-muted-foreground">
                                        {entryList.length} producto{entryList.length !== 1 ? 's' : ''} en la lista
                                    </span>
                                    <span className="font-medium">
                                        Total: ${entryList.reduce((sum, item) => sum + (item.cost * item.quantity), 0).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Ingreso</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Desktop Enhanced Two-Row View */}
                        <div className="hidden md:block space-y-4">
                            {entryList.length === 0 ? (
                                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                                    La lista de ingreso está vacía.
                                </div>
                            ) : (
                                entryList.map(item => (
                                    <div key={item.id} className="border rounded-lg p-4 space-y-4 bg-card hover:bg-accent/5 transition-colors">
                                        {/* Primera fila: Información básica del producto */}
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-2">
                                                <Label className="text-xs font-medium text-muted-foreground mb-1 block">SKU</Label>
                                                <Input 
                                                    value={item.sku} 
                                                    readOnly={!item.isNew} 
                                                    onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)} 
                                                    className={cn(!item.isNew && "bg-muted/50 text-xs", "h-9")} 
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre del Producto</Label>
                                                <Input 
                                                    value={item.name} 
                                                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)} 
                                                    className="h-9"
                                                    placeholder="Ingrese el nombre del producto"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Cantidad</Label>
                                                <Input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} 
                                                    onFocus={(e) => {
                                                        if (e.target.value === '0') {
                                                            e.target.select();
                                                        }
                                                    }}
                                                    className="text-right h-9" 
                                                    min="1"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de Propiedad</Label>
                                                <Select value={item.ownershipType} onValueChange={(value: OwnershipType) => handleUpdateItem(item.id, 'ownershipType', value)}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue/>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ownershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="h-9 w-9">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        {/* Segunda fila: Información financiera y consignador */}
                                        <div className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-3">
                                                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Costo Unitario</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={item.cost} 
                                                    onChange={(e) => handleUpdateItem(item.id, 'cost', e.target.value)} 
                                                    onFocus={(e) => {
                                                        if (e.target.value === '0') {
                                                            e.target.select();
                                                        }
                                                    }}
                                                    className="text-right h-9" 
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Precio de Venta</Label>
                                                <Input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={item.price} 
                                                    onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)} 
                                                    onFocus={(e) => {
                                                        if (e.target.value === '0') {
                                                            e.target.select();
                                                        }
                                                    }}
                                                    disabled={item.ownershipType === 'Familiar'} 
                                                    className="text-right h-9" 
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                {item.ownershipType === 'Consigna' ? (
                                                    <>
                                                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">Consignador</Label>
                                                        <Select value={item.consignorId} onValueChange={(value) => handleUpdateItem(item.id, 'consignorId', value)}>
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Seleccionar consignador..."/>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {consignors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </>
                                                ) : (
                                                    <div className="h-9 flex items-center">
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.ownershipType === 'Familiar' && 'Precio automático = Costo'}
                                                            {item.ownershipType === 'Propio' && 'Producto propio'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Total</Label>
                                                <div className="h-9 flex items-center justify-end">
                                                    <span className="text-sm font-medium">
                                                        ${((item.cost || 0) * (item.quantity || 0)).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {/* Mobile Enhanced Card View */}
                        <div className="md:hidden space-y-4">
                        {entryList.length === 0 ? (
                                <div className="border rounded-lg p-8 text-center text-muted-foreground">
                                    La lista de ingreso está vacía.
                                </div>
                        ) : (
                            entryList.map(item => (
                                <Card key={item.id} className="relative">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="absolute top-2 right-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(item.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                        
                                        {/* Primera fila móvil: Información básica */}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-medium text-muted-foreground">Nombre del Producto</Label>
                                                <Input 
                                                    value={item.name} 
                                                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)} 
                                                    placeholder="Ingrese el nombre del producto"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-medium text-muted-foreground">SKU</Label>
                                                    <Input 
                                                        value={item.sku} 
                                                        readOnly={!item.isNew} 
                                                        onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)} 
                                                        className={cn(!item.isNew && "bg-muted/50 text-xs")} 
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-medium text-muted-foreground">Cantidad</Label>
                                                    <Input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} 
                                                        onFocus={(e) => {
                                                            if (e.target.value === '0') {
                                                                e.target.select();
                                                            }
                                                        }}
                                                        className="text-right" 
                                                        min="1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Segunda fila móvil: Configuración */}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs font-medium text-muted-foreground">Tipo de Propiedad</Label>
                                                <Select value={item.ownershipType} onValueChange={(value: OwnershipType) => handleUpdateItem(item.id, 'ownershipType', value)}>
                                                    <SelectTrigger><SelectValue placeholder="Tipo Propiedad" /></SelectTrigger>
                                                    <SelectContent>
                                                        {ownershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {item.ownershipType === 'Consigna' && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-medium text-muted-foreground">Consignador</Label>
                                                    <Select value={item.consignorId} onValueChange={(value) => handleUpdateItem(item.id, 'consignorId', value)}>
                                                        <SelectTrigger><SelectValue placeholder="Seleccionar consignador..."/></SelectTrigger>
                                                        <SelectContent>
                                                            {consignors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                                 <div className="space-y-1">
                                                    <Label className="text-xs font-medium text-muted-foreground">Costo Unitario</Label>
                                                    <Input 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={item.cost} 
                                                        onChange={(e) => handleUpdateItem(item.id, 'cost', e.target.value)} 
                                                        onFocus={(e) => {
                                                            if (e.target.value === '0') {
                                                                e.target.select();
                                                            }
                                                        }}
                                                        className="text-right" 
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs font-medium text-muted-foreground">Precio de Venta</Label>
                                                    <Input 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={item.price} 
                                                        onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)} 
                                                        onFocus={(e) => {
                                                            if (e.target.value === '0') {
                                                                e.target.select();
                                                            }
                                                        }}
                                                        disabled={item.ownershipType === 'Familiar'} 
                                                        className="text-right" 
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Total para móvil */}
                                            <div className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                                                <span className="text-muted-foreground">Total del producto:</span>
                                                <span className="font-medium">
                                                    ${((item.cost || 0) * (item.quantity || 0)).toFixed(2)}
                                                </span>
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
        </>
    );
}

    
    

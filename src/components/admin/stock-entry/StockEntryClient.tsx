"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Product, StockEntryItem, Consignor, ownershipTypes, OwnershipType, ProductCategory } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Loader2, Printer, Mic, MicOff, Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { processStockEntry } from "@/lib/services/productService";
import PrintLabelsView from "./PrintLabelsView";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConsignors } from "@/lib/services/consignorService";
import { getProductCategories } from "@/lib/services/productCategoryService";
import { parseStockEntryCommand } from "@/ai/flows/parse-stock-entry-command";
import { cn } from "@/lib/utils";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

interface StockEntryClientProps {
    allProducts: Product[];
}

export default function StockEntryClient({ allProducts }: StockEntryClientProps) {
    const [entryList, setEntryList] = useState<StockEntryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [processedItems, setProcessedItems] = useState<StockEntryItem[] | null>(null);
    const [consignors, setConsignors] = useState<Consignor[]>([]);
    const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
    const [isListening, setIsListening] = useState(false);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const { userProfile } = useAuth();
    const { toast } = useToast();
    
    useOnClickOutside(searchContainerRef, () => setPopoverOpen(false));
    
    useEffect(() => {
        getConsignors().then(setConsignors);
        getProductCategories().then(setProductCategories);
        
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.lang = 'es-MX';
                recognition.interimResults = false;

                recognition.onstart = () => setIsListening(true);
                recognition.onend = () => setIsListening(false);
                recognition.onerror = (event) => {
                    console.error('Speech recognition error', event.error);
                    toast({ variant: 'destructive', title: "Error de Voz", description: "No se pudo iniciar el reconocimiento de voz." });
                    setIsListening(false);
                };

                recognition.onresult = async (event) => {
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
    }, [toast]);

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
        if (!searchQuery) {
            return [];
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        
        return allProducts.filter(p => {
            const name = p.name.toLowerCase();
            const sku = p.sku.toLowerCase();
            return name.includes(lowerCaseQuery) || sku.includes(lowerCaseQuery);
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
                category: product.category,
                ownershipType: product.ownershipType,
                consignorId: product.consignorId,
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


    const handleAddNewProduct = (name: string = '', quantity: number = 1) => {
        const newSku = generateUniqueSku();
        setEntryList(prev => [...prev, {
            id: uuidv4(),
            sku: newSku,
            name: name,
            quantity: quantity,
            price: 0,
            cost: 0,
            category: '',
            ownershipType: 'Propio',
            isNew: true
        }]);
    };

    const handleUpdateItem = (id: string, field: keyof StockEntryItem, value: string | number | OwnershipType) => {
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
    };
    
    const handleRemoveItem = (id: string) => {
        setEntryList(prev => prev.filter(item => item.id !== id));
    };
    
    const validateEntryList = () => {
        for (const item of entryList) {
            if (!item.sku || !item.name || !item.category || item.quantity <= 0) {
                toast({ variant: "destructive", title: "Error de Validación", description: `Revisa el producto "${item.name || 'Nuevo Producto'}" y asegúrate que tenga SKU, nombre, categoría y cantidad.` });
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
            const result = await processStockEntry(entryList, userProfile.uid);
            toast({ title: "Éxito", description: `${entryList.length} registros de inventario procesados.` });
            
            // Refresh categories list after processing
            getProductCategories().then(setProductCategories);

            setProcessedItems(result);
            setEntryList([]);
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
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Ingreso de Mercancía</CardTitle>
                        <CardDescription>Busca productos existentes, crea nuevos o usa tu voz para agregarlos a la lista de ingreso.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div ref={searchContainerRef}>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                    <PopoverTrigger asChild className="w-full">
                                        <Input
                                            placeholder="Buscar producto por SKU o nombre..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => setPopoverOpen(true)}
                                        />
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                                        <Command>
                                            <CommandList>
                                                <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                                {filteredProducts.slice(0, 50).map(product => (
                                                    <CommandItem key={product.id} onSelect={() => handleSelectProduct(product)}>
                                                        {product.name} ({product.sku})
                                                    </CommandItem>
                                                ))}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <div className="flex w-full sm:w-auto items-center gap-2">
                                    <Button onClick={() => handleAddNewProduct()} className="w-full">
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
                        </div>
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
                                        <TableHead className="w-[120px]">SKU</TableHead>
                                        <TableHead>Nombre Producto</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        <TableHead className="w-[140px]">Tipo Propiedad</TableHead>
                                        <TableHead className="w-[160px]">Consignador</TableHead>
                                        <TableHead className="w-[90px] text-right">Cantidad</TableHead>
                                        <TableHead className="w-[110px] text-right">Costo</TableHead>
                                        <TableHead className="w-[110px] text-right">Precio Venta</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {entryList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center">La lista de ingreso está vacía.</TableCell>
                                        </TableRow>
                                    ) : (
                                        entryList.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Input value={item.sku} readOnly={!item.isNew} onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)} className={cn(!item.isNew && "bg-muted/50 text-xs")} />
                                                </TableCell>
                                                <TableCell>
                                                     <Input value={item.name} onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)} />
                                                </TableCell>
                                                 <TableCell>
                                                    <CategoryComboBox 
                                                        value={item.category}
                                                        onChange={(value) => handleUpdateItem(item.id, 'category', value)}
                                                        categories={productCategories.map(c => c.name)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Select value={item.ownershipType} onValueChange={(value: OwnershipType) => handleUpdateItem(item.id, 'ownershipType', value)}>
                                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                                        <SelectContent>
                                                            {ownershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    {item.ownershipType === 'Consigna' && (
                                                        <Select value={item.consignorId} onValueChange={(value) => handleUpdateItem(item.id, 'consignorId', value)}>
                                                            <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                                                            <SelectContent>
                                                                {consignors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} className="text-right" />
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" step="0.01" value={item.cost} onChange={(e) => handleUpdateItem(item.id, 'cost', e.target.value)} className="text-right" />
                                                </TableCell>
                                                <TableCell>
                                                    <Input type="number" step="0.01" value={item.price} onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)} disabled={item.ownershipType === 'Familiar'} className="text-right" />
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
                                            <Input value={item.name} onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>Categoría</Label>
                                             <CategoryComboBox 
                                                value={item.category}
                                                onChange={(value) => handleUpdateItem(item.id, 'category', value)}
                                                categories={productCategories.map(c => c.name)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label>SKU</Label>
                                                <Input value={item.sku} readOnly={!item.isNew} onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)} className={cn(!item.isNew && "bg-muted/50 text-xs")} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Cantidad</Label>
                                                <Input type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} className="text-right" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="space-y-1">
                                                <Label>Tipo de Propiedad</Label>
                                                <Select value={item.ownershipType} onValueChange={(value: OwnershipType) => handleUpdateItem(item.id, 'ownershipType', value)}>
                                                    <SelectTrigger><SelectValue placeholder="Tipo Propiedad" /></SelectTrigger>
                                                    <SelectContent>
                                                        {ownershipTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {item.ownershipType === 'Consigna' && (
                                                <div className="space-y-1">
                                                    <Label>Consignador</Label>
                                                    <Select value={item.consignorId} onValueChange={(value) => handleUpdateItem(item.id, 'consignorId', value)}>
                                                        <SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger>
                                                        <SelectContent>
                                                            {consignors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                             <div className="space-y-1">
                                                <Label>Costo</Label>
                                                <Input type="number" step="0.01" value={item.cost} onChange={(e) => handleUpdateItem(item.id, 'cost', e.target.value)} className="text-right" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Precio Venta</Label>
                                                <Input type="number" step="0.01" value={item.price} onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)} disabled={item.ownershipType === 'Familiar'} className="text-right" />
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


function CategoryComboBox({ value, onChange, categories }: { value: string, onChange: (value: string) => void, categories: string[] }) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value);
  }, [value])

  const handleSelect = (currentValue: string) => {
    const newValue = currentValue === inputValue ? "" : currentValue
    setInputValue(newValue)
    onChange(newValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {inputValue || "Seleccionar..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Buscar o crear categoría..."
            onValueChange={setInputValue}
            value={inputValue}
            />
          <CommandList>
            <CommandEmpty>
                <Button variant="ghost" className="w-full justify-start" onClick={() => handleSelect(inputValue)}>
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Crear "{inputValue}"
                </Button>
            </CommandEmpty>
            <CommandGroup>
              {categories.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

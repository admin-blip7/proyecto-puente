
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Product, StockEntryItem, Consignor, ownershipTypes, OwnershipType, LabelSettings } from "@/types";
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Trash2, Loader2, Printer, Mic, MicOff, Zap, Barcode, Camera, Wand2, Check, Package, ScanLine, XCircle, Grid, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { processStockEntry, searchProducts, updateProduct, uploadProductImage } from "@/lib/services/productService";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConsignors } from "@/lib/services/consignorService";
// import { parseStockEntryCommand } from "@/ai/flows/parse-stock-entry-command";
import { cn } from "@/lib/utils";
import { generateAndPrintLabels } from "@/lib/printing/labelPrinter";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { productCategories } from "@/components/admin/inventory/CategoryAttributes";
import CategoryAttributes from "@/components/admin/inventory/CategoryAttributes";
import { StockItemImageManager } from "./StockItemImageManager";
import { uploadStockEntryImage } from "@/lib/services/stockImageService";
import { ProductImageSearch } from "@/components/shared/ProductImageSearch";
import { Search } from "lucide-react";


interface StockEntryClientProps {
    allProducts: Product[];
    labelSettings: LabelSettings;
}

export default function StockEntryClient({ allProducts: initialProducts, labelSettings }: StockEntryClientProps) {
    const [entryList, setEntryList] = useState<StockEntryItem[]>([]);
    // Removed allProducts state in favor of server-side search
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
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

    // Quick Update Mode State
    const [isQuickUpdateMode, setIsQuickUpdateMode] = useState(false);
    const [quickUpdateSearch, setQuickUpdateSearch] = useState('');
    const [quickUpdateResults, setQuickUpdateResults] = useState<Product[]>([]);
    const [productToUpdate, setProductToUpdate] = useState<Product | null>(null);
    const [isSearchingQuick, setIsSearchingQuick] = useState(false);

    const [quickUpdatePopoverOpen, setQuickUpdatePopoverOpen] = useState(false);

    // Image Search State
    const [showImageSearch, setShowImageSearch] = useState(false);
    const [currentItemForImage, setCurrentItemForImage] = useState<string | null>(null);

    // Bulk Actions State
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isBulkImageMode, setIsBulkImageMode] = useState(false);

    // Barcode Scanning State
    const [scanningForSkuId, setScanningForSkuId] = useState<string | null>(null);

    // Quick Update Handlers
    const handleDirectUpdate = async (product: Product, updates: Partial<Product>) => {
        try {
            // Optimistic update for UI responsiveness
            setQuickUpdateResults(prev => prev.map(p =>
                p.id === product.id ? { ...p, ...updates } : p
            ));

            const updated = await updateProduct(product.id, updates);

            // Reconcile with server response
            setQuickUpdateResults(prev => prev.map(p =>
                p.id === product.id ? updated : p
            ));

            toast({ title: "Actualizado", description: "Producto actualizado correctamente." });
            return updated;
        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el producto." });
            // Revert on error (could implement full revert logic, but simply refetching search would be safer)
        }
    };

    const handleQuickUpdateImage = async (product: Product, imageFile: File) => {
        try {
            toast({ title: "Subiendo...", description: "Procesando imagen." });
            const imageUrl = await uploadStockEntryImage(imageFile, userProfile?.uid || 'unknown');

            const currentImages = product.imageUrls || [];
            // If replacing main image, put it first. 
            // Logic: If updating via the list, we usually want to set the MAIN image.
            const newImages = [imageUrl, ...currentImages];

            await handleDirectUpdate(product, { imageUrls: newImages });
        } catch (error) {
            console.error("Error updating image", error);
            toast({ variant: "destructive", title: "Error", description: "Falló la carga de imagen." });
        }
    };

    const handleBulkDirectImageUpdate = async (file: File) => {
        if (selectedItems.size === 0) return;

        setIsLoading(true);
        toast({ title: "Procesando en bloque", description: `Actualizando ${selectedItems.size} productos...` });

        try {
            const imageUrl = await uploadStockEntryImage(file, userProfile?.uid || 'unknown');

            // Update all selected products efficiently
            // We'll run them in parallel
            const updatePromises = Array.from(selectedItems).map(async (id) => {
                const product = quickUpdateResults.find(p => p.id === id);
                if (!product) return;

                const currentImages = product.imageUrls || [];
                const newImages = [imageUrl, ...currentImages];

                await updateProduct(id, { imageUrls: newImages });
            });

            await Promise.all(updatePromises);

            // Refresh results? OR Update local state
            setQuickUpdateResults(prev => prev.map(p => {
                if (selectedItems.has(p.id)) {
                    const current = p.imageUrls || [];
                    return { ...p, imageUrls: [imageUrl, ...current] };
                }
                return p;
            }));

            toast({ title: "Completado", description: "Imágenes actualizadas en todos los productos seleccionados." });
            setIsBulkImageMode(false);
            setSelectedItems(new Set());
        } catch (error) {
            console.error("Bulk update error", error);
            toast({ variant: "destructive", title: "Error", description: "Hubo un problema con la actualización masiva." });
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize quick update results with all products
    useEffect(() => {
        if (isQuickUpdateMode && quickUpdateResults.length === 0 && initialProducts.length > 0) {
            setQuickUpdateResults(initialProducts);
        }
    }, [isQuickUpdateMode, initialProducts, quickUpdateResults.length]);

    // Quick Search Effect - CLIENT SIDE FILTERING
    useEffect(() => {
        const searchQuick = () => {
            // If not in quick mode, do nothing
            if (!isQuickUpdateMode) return;

            // If empty search, show ALL products
            if (!quickUpdateSearch || quickUpdateSearch.trim() === '') {
                setQuickUpdateResults(initialProducts);
                return;
            }

            const query = quickUpdateSearch.toLowerCase();
            const filtered = initialProducts.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.sku.toLowerCase().includes(query) ||
                (p.category && p.category.toLowerCase().includes(query))
            );

            setQuickUpdateResults(filtered);
        };

        // Instant filter, no debounce needed for client side unless huge
        searchQuick();

    }, [quickUpdateSearch, isQuickUpdateMode, initialProducts]);

    // Scanner Detection
    useEffect(() => {
        const handleScannerInput = (e: KeyboardEvent) => {
            // In list mode, we rely on focused inputs or specific "scan mode" button usage.
            // The global "scan anywhere" is tricky with a list.
            // But we can keep the logic: If NO input is focused, and we type, we treat it as a search query?
            // Or if we Scan and it matches a SKU, we could highlight it.

            // For now, let's just focus on the specific "Scan SKU" button flow which is more robust.
        };
        // window.addEventListener('keydown', handleScannerInput);
        // return () => window.removeEventListener('keydown', handleScannerInput);
    }, []);

    useOnClickOutside(searchContainerRef, () => setPopoverOpen(false));

    const generateUniqueSku = useCallback(() => {
        // Optimized: Only check against current entry list to avoid needing full DB catalog in client
        // Backend validation will catch collisions on save if any
        const existingSkus = new Set(entryList.map(item => item.sku));
        let newSku = '';
        let isUnique = false;

        while (!isUnique) {
            newSku = Math.floor(100000 + Math.random() * 900000).toString();
            if (!existingSkus.has(newSku)) {
                isUnique = true;
            }
        }
        return newSku;
    }, [entryList]);

    const handleAddNewProduct = useCallback((name: string = '', quantity: number = 1) => {
        const newSku = generateUniqueSku();
        setEntryList(prev => [...prev, {
            id: uuidv4(),
            sku: newSku,
            name: name,
            quantity: quantity,
            price: 0,
            cost: 0,
            ownershipType: 'Propio',
            category: '',
            attributes: {},
            isNew: true
        }]);
    }, [generateUniqueSku]);

    useEffect(() => {
        getConsignors().then((loadedConsignors) => {
            // Remove duplicate consignors to prevent React key conflicts
            const uniqueConsignors = loadedConsignors.filter((consignor, index, self) =>
                index === self.findIndex(c => c.id === consignor.id)
            );
            setConsignors(uniqueConsignors);
        });

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
                        try {
                            // const result = await parseStockEntryCommand({ command: transcript });
                            // if (result.productName && result.quantity) {
                            //     handleAddNewProduct(result.productName, result.quantity);
                            //     toast({ title: "Producto Agregado", description: `${result.quantity} x ${result.productName}` });
                            // }
                            toast({ variant: 'default', title: "Comando Recibido", description: "La funcionalidad de IA para interpretar comandos ha sido desactivada." });
                        } catch (error) {
                            console.error('Error parsing command', error);
                            toast({ variant: 'destructive', title: "Error de IA", description: "No se pudo interpretar el comando." });
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

    // Server-side search effect
    useEffect(() => {
        const search = async () => {
            if (!searchQuery || searchQuery.trim() === '') {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const results = await searchProducts(searchQuery);
                setSearchResults(results);
            } catch (error) {
                console.error("Error searching products:", error);
                toast({ variant: 'destructive', title: "Error", description: "Error al buscar productos." });
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(search, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [searchQuery, toast]);


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
                category: product.category || '',
                attributes: product.attributes || {},
                isNew: false
            }];
        });
        setSearchQuery("");
        setPopoverOpen(false);
    };

    const handleUpdateItem = useCallback((id: string, field: keyof StockEntryItem, value: string | number | OwnershipType | boolean | File | undefined) => {
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

    const handleUpdateAttributes = useCallback((id: string, attributes: Record<string, any>) => {
        setEntryList(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, attributes };
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
            // 1. Upload Images Phase
            const itemsWithImages = await Promise.all(entryList.map(async (item) => {
                if (item.imageFile && userProfile) {
                    try {
                        // Create separate FormData if needed, but the service takes File directly if it's a Server Action receiving scalar/simple args.
                        // However, passing File directly to Server Function works if it's top level, but let's try.
                        // Actually, to be safe with Next.js serialization of Files, better to use FormData if strictly needed, 
                        // but Since `uploadStockEntryImage` is `use server`, we better pass formData or check if it accepts File.
                        // My service accepts `File`. Next.js 14 server actions support `File` and `FormData`.

                        // NOTE: To avoid serialization issues with complex objects, let's upload one by one using a helper that uses FormData if `uploadStockEntryImage` fails with raw File.
                        // But wait, `uploadStockEntryImage` is defined as `(file: File, userId: string) => Promise<string>`.
                        // Next.js handles File serialization automatically in Server Actions.

                        // We need a wrapper to pass FormData because usually strict File passing works best in FormData.
                        // Let's assume direct call works for now, if not we'll wrap in FormData.

                        // Actually, let's wrap it in FormData to be 100% sure and robust.
                        const formData = new FormData();
                        formData.append('file', item.imageFile);
                        formData.append('userId', userProfile.uid);

                        // We need to modify the service to accept FormData or just try passing File. 
                        // Let's rely on the service I created: `export async function uploadStockEntryImage(file: File, userId: string)`
                        // I will implicitly trust Next.js serialization.

                        // Wait, I cannot modify the service signature easily here. 
                        // I will try to upload directly.
                        const publicUrl = await uploadStockEntryImage(item.imageFile, userProfile.uid);
                        return { ...item, imageUrl: publicUrl, imageFile: undefined }; // Clean up file to avoid double sending
                    } catch (e) {
                        console.error("Error uploading image for " + item.name, e);
                        toast({ variant: "destructive", title: "Advertencia", description: `No se pudo subir la imagen de ${item.name}` });
                        return item; // Continue without image
                    }
                }
                return item;
            }));

            // 2. Process Entry Phase
            const processedItems = await processStockEntry(itemsWithImages, userProfile.uid);
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

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const toggleAll = () => {
        if (selectedItems.size === entryList.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(entryList.map(i => i.id)));
        }
    };

    const handleBulkImageSelect = (file: File, url: string) => {
        const itemsToUpdate = isBulkImageMode ? Array.from(selectedItems) : (currentItemForImage ? [currentItemForImage] : []);

        if (isQuickUpdateMode) {
            // DIRECT UPDATE MODE
            if (isBulkImageMode) {
                handleBulkDirectImageUpdate(file);
            } else if (currentItemForImage) {
                const product = quickUpdateResults.find(p => p.id === currentItemForImage);
                if (product) handleQuickUpdateImage(product, file);
            }
        } else {
            // STOCK ENTRY LOCAL STATE MODE
            itemsToUpdate.forEach(id => {
                handleUpdateItem(id, 'imageFile', file);
                handleUpdateItem(id, 'imageUrl', undefined);
                handleUpdateItem(id, 'hasOptimizedImage', true);
            });

            toast({
                title: isBulkImageMode ? "Imágenes Actualizadas" : "Imagen Agregada",
                description: isBulkImageMode
                    ? `Se aplicó la imagen a ${itemsToUpdate.length} productos.`
                    : "Imagen de Google seleccionada"
            });
        }

        setIsBulkImageMode(false);
        setCurrentItemForImage(null);
        // Optional: clear selection after bulk action? Let's keep it in case they want to do more action
        // setSelectedItems(new Set()); 
    };

    // Barcode Scanner Logic for specific row
    useEffect(() => {
        const handleRowScan = (e: KeyboardEvent) => {
            if (!scanningForSkuId) return;

            // Simple scanner detection: rapid input ending with Enter
            // For now, let's just listen to Enter on the active input if we focus it, 
            // OR global listener if we want "scan anywhere".
            // Let's rely on focusing the specific input.
        };
        // Actually, we can just trigger a prompt or focus the existing SKU input?
        // Better: When "Scan" is clicked, we focus the SKU input and select all text.
        // Then the scanner replaces it. 
        // We can add a visual indicator that we are "waiting for scan".

        if (scanningForSkuId) {
            const input = document.getElementById(`sku-input-${scanningForSkuId}`) as HTMLInputElement;
            if (input) {
                input.focus();
                input.select();

                // Add Enter listener specifically for this input if needed, 
                // but standard onChange/onBlur flow might be enough for simple edits.
                // For Scanning, usually we want "Enter" to trigger the save.
                const handleEnter = (e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        input.blur(); // Trigger blur which (could) save, or we save explicitly
                        // Actually better to have the Input's onKeyDown handle it.
                    }
                };
                input.addEventListener('keydown', handleEnter);
                return () => input.removeEventListener('keydown', handleEnter);
            }
        }
    }, [scanningForSkuId]);

    return (
        <>
            <ProductImageSearch
                open={showImageSearch}
                onOpenChange={(open) => {
                    setShowImageSearch(open);
                    if (!open) {
                        setIsBulkImageMode(false);
                        setCurrentItemForImage(null);
                    }
                }}
                productName={
                    isBulkImageMode
                        ? (selectedItems.size === 1 ? (isQuickUpdateMode ? quickUpdateResults : entryList).find(i => i.id === Array.from(selectedItems)[0])?.name || '' : '')
                        : ((isQuickUpdateMode ? quickUpdateResults : entryList).find(i => i.id === currentItemForImage)?.name || '')
                }
                onImageSelect={handleBulkImageSelect}
            />

            <div className="space-y-6">
                {/* Toggle Header */}
                <div className="flex items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-4">
                        <Switch
                            checked={isQuickUpdateMode}
                            onCheckedChange={(checked) => {
                                setIsQuickUpdateMode(checked);
                                setProductToUpdate(null);
                                setQuickUpdateSearch('');
                                setSelectedItems(new Set());
                            }}
                        />
                        <Label className="cursor-pointer font-medium">
                            {isQuickUpdateMode ? (
                                <span className="flex items-center gap-2 text-primary">
                                    <Zap className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                    Modo Actualización Rápida
                                </span>
                            ) : (
                                "Modo Ingreso Normal"
                            )}
                        </Label>
                    </div>
                    {isQuickUpdateMode && (
                        <Badge variant="outline" className="animate-pulse border-yellow-500 text-yellow-600">
                            ⚡ LIVE
                        </Badge>
                    )}
                </div>

                {/* Bulk Actions Bar */}
                {selectedItems.size > 0 && (
                    <div className="sticky top-4 z-50 bg-primary text-primary-foreground p-3 rounded-lg shadow-xl flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-4">
                            <span className="font-bold ml-2">{selectedItems.size} seleccionados</span>
                            <div className="h-4 w-px bg-primary-foreground/30" />
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    setIsBulkImageMode(true);
                                    setShowImageSearch(true);
                                }}
                                className="flex items-center gap-2"
                            >
                                <ImageIcon className="h-4 w-4" />
                                Asignar Imagen
                            </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedItems(new Set())} className="hover:bg-primary-foreground/10 text-primary-foreground">
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>
                    </div>
                )}

                {isQuickUpdateMode ? (
                    <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                        {/* Search Bar - Fixed at top */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                value={quickUpdateSearch}
                                onChange={(e) => setQuickUpdateSearch(e.target.value)}
                                placeholder="Filtrar productos por nombre o SKU..."
                                className="h-12 text-lg pl-12 shadow-sm bg-background"
                                autoFocus
                            />
                            {quickUpdateSearch && (
                                <button
                                    onClick={() => setQuickUpdateSearch('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* Fixed Table Container */}
                        <div className="border rounded-md shadow-sm bg-card overflow-hidden flex flex-col h-[600px]">
                            {/* Table Header - Fixed */}
                            <div className="bg-muted/50 border-b">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center">
                                                <Checkbox
                                                    checked={quickUpdateResults.length > 0 && selectedItems.size === quickUpdateResults.length}
                                                    onCheckedChange={() => {
                                                        if (selectedItems.size === quickUpdateResults.length) {
                                                            setSelectedItems(new Set());
                                                        } else {
                                                            setSelectedItems(new Set(quickUpdateResults.map(i => i.id)));
                                                        }
                                                    }}
                                                />
                                            </TableHead>
                                            <TableHead className="w-[100px]">Imagen</TableHead>
                                            <TableHead className="w-[180px]">SKU</TableHead>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead className="w-[120px]">Precio</TableHead>
                                            <TableHead className="w-[100px]">Stock</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                </Table>
                            </div>

                            {/* Table Body - Scrollable */}
                            <div className="overflow-y-auto flex-1">
                                <Table>
                                    <TableBody>
                                        {quickUpdateResults.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                    No se encontraron productos.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            quickUpdateResults.map((item) => (
                                                <TableRow key={item.id} className="hover:bg-accent/50 transition-colors">
                                                    <TableCell className="w-[50px] text-center">
                                                        <Checkbox
                                                            checked={selectedItems.has(item.id)}
                                                            onCheckedChange={() => toggleSelection(item.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="w-[100px] py-2">
                                                        <StockItemImageManager
                                                            itemName={item.name}
                                                            itemCategory={item.category || ''}
                                                            imageUrl={item.imageUrls?.[0]}
                                                            onImageUrlChange={() => { }}
                                                            onImageFileChange={(file) => {
                                                                if (file) handleQuickUpdateImage(item, file);
                                                            }}
                                                            onOptimizedChange={() => { }}
                                                            onProcessingChange={() => { }}
                                                            onSearchClick={() => {
                                                                setCurrentItemForImage(item.id);
                                                                setShowImageSearch(true);
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="w-[180px]">
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                id={`sku-input-${item.id}`}
                                                                defaultValue={item.sku}
                                                                onBlur={(e) => {
                                                                    setScanningForSkuId(null);
                                                                    if (e.target.value !== item.sku) {
                                                                        handleDirectUpdate(item, { sku: e.target.value });
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.currentTarget.blur();
                                                                    }
                                                                }}
                                                                readOnly={scanningForSkuId !== item.id}
                                                                className={cn(
                                                                    scanningForSkuId !== item.id && "bg-transparent border-transparent shadow-none px-0 h-auto font-mono text-sm cursor-pointer hover:underline text-muted-foreground hover:text-foreground w-full",
                                                                    scanningForSkuId === item.id && "border-2 border-yellow-500 ring-2 ring-yellow-500/20 bg-background px-2 h-9"
                                                                )}
                                                                onClick={(e) => {
                                                                    if (scanningForSkuId !== item.id) {
                                                                        // Optional: click to edit or just use scan button.
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className={cn(
                                                                    "h-8 w-8 shrink-0 transition-colors",
                                                                    scanningForSkuId === item.id
                                                                        ? "text-yellow-500 bg-yellow-100 font-bold"
                                                                        : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                )}
                                                                onClick={() => setScanningForSkuId(item.id)}
                                                                title="Escanear nuevo SKU"
                                                            >
                                                                <ScanLine className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {item.name}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        ${item.price.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={item.stock && item.stock > 0 ? "outline" : "destructive"}>
                                                            {item.stock || 0}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="bg-muted/30 p-2 text-xs text-center text-muted-foreground border-t">
                                Mostrando {quickUpdateResults.length} productos
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
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
                                                    <Command shouldFilter={false}>
                                                        <CommandInput
                                                            placeholder="Buscar producto por SKU o nombre..."
                                                            value={searchQuery}
                                                            onValueChange={setSearchQuery}
                                                            className="h-12"
                                                        />
                                                        <CommandList className="max-h-[300px]">
                                                            {searchQuery.length === 0 ? (
                                                                <div className="p-4 text-center text-sm text-muted-foreground">
                                                                    Escribe para buscar productos existentes en todo el inventario
                                                                </div>
                                                            ) : isSearching ? (
                                                                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                                                    <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                                                                </div>
                                                            ) : searchResults.length === 0 ? (
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
                                                                        Resultados de búsqueda ({searchResults.length})
                                                                    </div>
                                                                    {searchResults.map(product => (
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

                                                                    {/* Removed overflow message as backend limits to 50 anyway */}
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
                                                    <div className="col-span-12 md:col-span-1 flex justify-center md:block">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={selectedItems.has(item.id)}
                                                                onCheckedChange={() => toggleSelection(item.id)}
                                                                className="h-5 w-5"
                                                            />
                                                            <StockItemImageManager
                                                                itemName={item.name}
                                                                itemCategory={item.category}
                                                                imageFile={item.imageFile}
                                                                imageUrl={item.imageUrl}
                                                                isImageProcessing={item.isImageProcessing}
                                                                hasOptimizedImage={item.hasOptimizedImage}
                                                                onImageFileChange={(file) => handleUpdateItem(item.id, 'imageFile', file)}
                                                                onImageUrlChange={(url) => handleUpdateItem(item.id, 'imageUrl', url)}
                                                                onProcessingChange={(processing) => handleUpdateItem(item.id, 'isImageProcessing', processing)}
                                                                onOptimizedChange={(optimized) => handleUpdateItem(item.id, 'hasOptimizedImage', optimized)}
                                                                onSearchClick={() => {
                                                                    setCurrentItemForImage(item.id);
                                                                    setShowImageSearch(true);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-span-6 md:col-span-2">
                                                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">SKU</Label>
                                                        <div className="flex items-center gap-1">
                                                            <Input
                                                                id={`sku-input-${item.id}`}
                                                                value={item.sku}
                                                                readOnly={!item.isNew && scanningForSkuId !== item.id}
                                                                onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)}
                                                                onBlur={() => setScanningForSkuId(null)}
                                                                className={cn(
                                                                    !item.isNew && scanningForSkuId !== item.id && "bg-muted/50 text-xs",
                                                                    "h-9",
                                                                    scanningForSkuId === item.id && "border-2 border-yellow-500 ring-2 ring-yellow-500/20"
                                                                )}
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className={cn("h-8 w-8", scanningForSkuId === item.id ? "text-yellow-500 bg-yellow-100" : "text-muted-foreground")}
                                                                onClick={() => setScanningForSkuId(item.id)}
                                                                title="Escanear nuevo SKU"
                                                            >
                                                                <ScanLine className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-6 md:col-span-3">
                                                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre del Producto</Label>
                                                        <Input
                                                            value={item.name}
                                                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                                            className="h-9"
                                                            placeholder="Ingrese el nombre del producto"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</Label>
                                                        <Select value={item.category || 'none'} onValueChange={(value) => handleUpdateItem(item.id, 'category', value === 'none' ? '' : value)}>
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Seleccionar..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">Sin categoría</SelectItem>
                                                                {productCategories.map((cat, index) => (
                                                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
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
                                                                <SelectValue />
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
                                                                        <SelectValue placeholder="Seleccionar consignador..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {consignors.map((c, index) => <SelectItem key={`${c.id}-${index}`} value={c.id}>{c.name}</SelectItem>)}
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

                                                {/* Tercera fila: Atributos específicos de la categoría */}
                                                {item.category && (
                                                    <div className="border-t pt-4">
                                                        <CategoryAttributes
                                                            category={item.category}
                                                            attributes={item.attributes || {}}
                                                            onChange={(attributes) => handleUpdateAttributes(item.id, attributes)}
                                                        />
                                                    </div>
                                                )}
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
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-medium text-muted-foreground">Categoría</Label>
                                                            <Select value={item.category || 'none'} onValueChange={(value) => handleUpdateItem(item.id, 'category', value === 'none' ? '' : value)}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Seleccionar..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Sin categoría</SelectItem>
                                                                    {productCategories.map((cat, index) => (
                                                                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
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
                                                                    <SelectTrigger><SelectValue placeholder="Seleccionar consignador..." /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {consignors.map((c, index) => <SelectItem key={`${c.id}-${index}`} value={c.id}>{c.name}</SelectItem>)}
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

                                                    {/* Atributos específicos para móvil */}
                                                    {item.category && (
                                                        <div className="border-t pt-4 mt-4">
                                                            <CategoryAttributes
                                                                category={item.category}
                                                                attributes={item.attributes || {}}
                                                                onChange={(attributes) => handleUpdateAttributes(item.id, attributes)}
                                                            />
                                                        </div>
                                                    )}
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
                    </>
                )}
            </div>
        </>
    );
}

// Quick Update Mode Helpers & Components

const generateProductImage = async (productName: string): Promise<string> => {
    // Stub for AI generation
    return new Promise((resolve) => {
        setTimeout(() => {
            // Return a placeholder for now
            resolve("https://placehold.co/600x400/png?text=" + encodeURIComponent(productName));
        }, 1500);
    });
};

interface QuickUpdatePanelProps {
    product: Product;
    onUpdateSku: (newSku: string) => Promise<void>;
    onUpdateImage: (imageFile: File) => Promise<void>;
    onDone: () => void;
    onGenerateAiImage?: () => Promise<void>;
}

function QuickUpdatePanel({ product, onUpdateSku, onUpdateImage, onDone, onGenerateAiImage }: QuickUpdatePanelProps) {
    const [newSku, setNewSku] = useState('');
    const [isScanningSku, setIsScanningSku] = useState(false);

    // Auto-focus logic for the scanner input
    const skuInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isScanningSku && skuInputRef.current) {
            skuInputRef.current.focus();
        }
    }, [isScanningSku]);

    return (
        <Card className="border-2 border-primary bg-card">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex items-center justify-center relative">
                            {product.imageUrls?.[0] ? (
                                <Image src={product.imageUrls[0]} alt={product.name} fill className="object-cover" />
                            ) : (
                                <Package className="h-10 w-10 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-xl">{product.name}</CardTitle>
                            <CardDescription className="mt-1">
                                SKU actual: <span className="font-mono font-bold text-foreground">{product.sku}</span>
                            </CardDescription>
                        </div>
                    </div>
                    <Badge variant={product.imageUrls?.length ? 'default' : 'secondary'} className="text-xs">
                        {product.imageUrls?.length ? '📷 Con imagen' : '📷 Sin imagen'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <Button
                        size="lg"
                        variant={isScanningSku ? "default" : "outline"}
                        className="h-24 flex flex-col gap-1 relative"
                        onClick={() => setIsScanningSku(true)}
                    >
                        <Barcode className="h-8 w-8" />
                        <span className="font-medium">Actualizar SKU</span>
                        <span className="text-xs opacity-70">
                            {isScanningSku ? 'Esperando escáner...' : 'Escanear nuevo código'}
                        </span>
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        className="h-24 flex flex-col gap-1"
                        onClick={() => document.getElementById(`image-upload-${product.id}`)?.click()}
                    >
                        <Camera className="h-8 w-8" />
                        <span className="font-medium">Actualizar Imagen</span>
                        <span className="text-xs text-muted-foreground">
                            Cámara o archivo
                        </span>
                    </Button>
                </div>

                {isScanningSku && (
                    <div className="mt-4 p-4 bg-muted animate-in fade-in zoom-in duration-200 rounded-lg border border-primary/20">
                        <Label className="text-sm font-medium mb-2 block">Escanear o escribir nuevo SKU:</Label>
                        <div className="flex gap-2">
                            <Input
                                ref={skuInputRef}
                                value={newSku}
                                placeholder="Escanear ahora..."
                                onChange={(e) => setNewSku(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newSku) {
                                        onUpdateSku(newSku);
                                        setIsScanningSku(false);
                                        setNewSku('');
                                    }
                                }}
                                className="flex-1"
                            />
                            <Button onClick={() => {
                                if (newSku) {
                                    onUpdateSku(newSku);
                                    setIsScanningSku(false);
                                    setNewSku('');
                                }
                            }}>OK</Button>
                        </div>
                    </div>
                )}

                <input
                    id={`image-upload-${product.id}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            onUpdateImage(file);
                            // Reset input
                            e.target.value = '';
                        }
                    }}
                />
            </CardContent>
            <CardFooter className="flex gap-2 justify-between">
                <Button variant="ghost" onClick={onDone}>
                    Cancelar / Siguiente
                </Button>
                <div className="flex gap-2">
                    {onGenerateAiImage && (
                        <Button
                            variant="secondary"
                            onClick={onGenerateAiImage}
                        >
                            <Wand2 className="mr-2 h-4 w-4" />
                            IA Gen
                        </Button>
                    )}
                    <Button onClick={onDone}>
                        <Check className="mr-2 h-4 w-4" />
                        Listo
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}




"use client"

import { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import AddEditSupplierDialog from "@/components/admin/suppliers/AddEditSupplierDialog";
import {
  Package,
  Search,
  Copy,
  Save,
  CheckCircle,
  Loader2,
  Plus,
  Minus,
  ExternalLink,
  Truck,
  ArrowLeft,
  Users,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X
} from "lucide-react";
import { Product } from "@/types";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Supplier } from "@/types";
// import { formatMXNAmount } from "@/lib/validation/currencyValidation";
import { getLogger } from "@/lib/logger";
import { CurrencyInput } from "@/components/ui/currency-input";

// Types
interface ParsedItem {
  qty: number;
  rawName: string;
  productId?: string;
  productName?: string;
  cost?: number;
  salePrice?: number;
  // Prorrateo de envío
  allocatedShippingPerUnit?: number;
  totalAllocatedShipping?: number;
  finalCost?: number;
}

interface ShippingInfo {
  carrier?: string;
  tracking?: string;
  guideUrl?: string;
  cost?: number;
}

interface PurchaseOrder {
  createdAt: any;
  status: "draft" | "ordered" | "in_transit" | "received";
  supplierId?: string;
  supplier?: string; // Nombre del proveedor para mostrar en la UI
  orderNumber?: string; // Número de orden generado automáticamente
  totalAmount?: number; // Total calculado de la orden
  orderDate?: any; // Fecha de la orden
  expectedDelivery?: any; // Fecha esperada de entrega
  notes?: string; // Notas adicionales
  createdBy?: string; // Usuario que creó la orden
  updatedAt?: any; // Fecha de última actualización
  shipping: ShippingInfo;
  items: ParsedItem[];
  history?: Array<{
    action: string;
    status?: string;
    timestamp: any;
    user: string;
    notes?: string;
  }>; // Historial de cambios
}

const log = getLogger("QuickPOIntake");

async function quickIntakeApiRequest<T>(payload: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch("/api/quick-po-intake", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Solicitud fallida");
    }

    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    log.error("Quick intake API error", error);
    return null;
  }
}
export default function QuickPOIntake() {
  const { toast } = useToast();
  const router = useRouter();

  // State
  const [rawText, setRawText] = useState(`2 pantalla moto one fusion
1 pantalla samsung a50
1 pantalla oppo a38
1 pantalla moto e6 plus
1 iPhone 15 pro max`);

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [shipping, setShipping] = useState<ShippingInfo>({});
  const [supplier, setSupplier] = useState(''); // Nombre del proveedor
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [notes, setNotes] = useState(''); // Notas de la orden
  const [isOrdered, setIsOrdered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Utility functions
  const normalizeText = useCallback((text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^\w\s]/g, " ") // Replace special chars with spaces
      .replace(/\s+/g, " ") // Normalize spaces
      .trim();
  }, []);

  const tokenizeText = useCallback((text: string): string[] => {
    return normalizeText(text)
      .split(" ")
      .filter(token => token.length > 1); // Filter out single chars
  }, [normalizeText]);

  const parseLine = useCallback((line: string): ParsedItem | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Try to extract quantity from the beginning
    const qtyMatch = trimmed.match(/^(\d+)\s+(.+)$/);

    if (qtyMatch) {
      return {
        qty: parseInt(qtyMatch[1]),
        rawName: qtyMatch[2].trim(),
      };
    } else {
      // No quantity found, assume 1
      return {
        qty: 1,
        rawName: trimmed,
      };
    }
  }, []);



  // Función para buscar productos en el inventario
  const searchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearchingProducts(true);
      const tokens = tokenizeText(searchQuery).slice(0, 3);

      if (tokens.length === 0) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      const response = await quickIntakeApiRequest<{ products: Product[] }>({
        action: "searchProducts",
        query: searchQuery,
      });

      setSearchResults(response?.products ?? []);
      setShowSearchResults(true);
    } catch (error) {
      log.error("Error searching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al buscar productos."
      });
    } finally {
      setSearchingProducts(false);
    }
  }, [tokenizeText, toast]);

  // Función para agregar producto desde la búsqueda
  const addProductFromSearch = useCallback((product: Product) => {
    const newItem: ParsedItem = {
      qty: 1,
      rawName: product.name,
      productId: product.id,
      productName: product.name,
      cost: product.cost,
      salePrice: product.price
    };

    setParsedItems(prev => [...prev, newItem]);
    setProductSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);

    toast({
      title: "Producto agregado",
      description: `${product.name} ha sido agregado a la lista de compras.`
    });
  }, [toast]);

  // Load suppliers on component mount
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await quickIntakeApiRequest<{ suppliers: Supplier[] }>({ action: "listSuppliers" });
        if (response?.suppliers) {
          setSuppliers(response.suppliers);
        }
      } catch (error) {
        log.error("Error loading suppliers:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al cargar los proveedores."
        });
      }
    };

    loadSuppliers();
  }, [toast]);

  // Handlers
  const handleParseItems = useCallback(async () => {
    setSearchingProducts(true);
    try {
      const lines = rawText.split('\n').filter(line => line.trim());
      const items: ParsedItem[] = [];

      for (const line of lines) {
        const parsed = parseLine(line);
        if (parsed) {
          items.push(parsed);
        }
      }

      setParsedItems(items);
      toast({
        title: "Items parseados",
        description: `Se procesaron ${items.length} items correctamente.`
      });
    } catch (error) {
      log.error("Error parsing items:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al parsear los items."
      });
    } finally {
      setSearchingProducts(false);
    }
  }, [rawText, parseLine, toast]);

  const handleCopyNormalizedNames = useCallback(() => {
    const normalizedLines = parsedItems.map(item =>
      `${item.qty} x ${item.productName || item.rawName}`
    ).join('\n');

    navigator.clipboard.writeText(normalizedLines).then(() => {
      toast({
        title: "Copiado",
        description: "Nombres normalizados copiados al portapapeles."
      });
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo copiar al portapapeles."
      });
    });
  }, [parsedItems, toast]);

  const handleUpdateItem = useCallback((index: number, field: keyof ParsedItem, value: any) => {
    setParsedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  // Función auxiliar para actualizar el proveedor
  const handleSavePurchaseOrder = useCallback(async () => {
    // Validaciones
    if (parsedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe haber al menos un item para guardar."
      });
      return;
    }

    if (!supplier.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe especificar un proveedor para la orden."
      });
      return;
    }

    // Validar que los items tengan información mínima
    const invalidItems = parsedItems.filter(item =>
      !item.productName && !item.productId
    );

    if (invalidItems.length > 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `${invalidItems.length} productos no tienen nombre o ID válido.`
      });
      return;
    }

    setLoading(true);
    try {
      // Calcular el total base de la orden (sin envío)
      const baseTotal = parsedItems.reduce((sum, item) => sum + (((item.qty || 0)) * (item.cost || 0)), 0);
      const shippingCost = shipping.cost || 0;

      // Prorratear costo de envío entre items
      let itemsWithAllocation: ParsedItem[] = parsedItems;
      if (shippingCost > 0) {
        const totalBase = baseTotal;
        const totalQty = parsedItems.reduce((sum, item) => sum + item.qty, 0);
        itemsWithAllocation = parsedItems.map((item) => {
          const itemBase = item.qty * (item.cost || 0);
          const weight = totalBase > 0 ? (itemBase / totalBase) : (item.qty / Math.max(totalQty, 1));
          const allocatedTotal = shippingCost * weight;
          const perUnit = item.qty > 0 ? (allocatedTotal / item.qty) : 0;
          const finalCost = (item.cost || 0) + perUnit;
          return {
            ...item,
            totalAllocatedShipping: allocatedTotal,
            allocatedShippingPerUnit: perUnit,
            finalCost
          };
        });
      }

      const totalAmount = baseTotal + shippingCost;

      // Generar número de orden único
      const orderNumber = `PO-${Date.now()}`;

      // Limpiar objeto shipping de valores undefined
      const cleanShipping = Object.fromEntries(
        Object.entries(shipping).filter(([_, value]) => value !== undefined && value !== '')
      );

      const now = new Date();
      const purchaseOrder: PurchaseOrder = {
        createdAt: now,
        orderDate: now,
        updatedAt: now,
        status: isOrdered ? "ordered" : "draft",
        supplier: supplier.trim() || 'Proveedor no especificado',
        orderNumber,
        totalAmount,
        ...(notes?.trim() && { notes: notes.trim() }), // Solo incluir notes si tiene contenido
        createdBy: 'Usuario Actual', // Aquí deberías usar el usuario autenticado
        shipping: cleanShipping,
        items: itemsWithAllocation.map((item) => item), // Guardar items con costo final
        history: [{
          action: `Orden ${isOrdered ? 'creada y ordenada' : 'creada como borrador'}`,
          status: isOrdered ? "ordered" : "draft",
          timestamp: new Date(),
          user: 'Usuario Actual',
          notes: `Orden creada con ${parsedItems.length} productos`
        }]
      };
      const response = await quickIntakeApiRequest<{ order: any }>({
        action: "savePurchaseOrder",
        supplier: purchaseOrder.supplier,
        orderNumber,
        status: purchaseOrder.status,
        totalAmount,
        notes: purchaseOrder.notes ?? null,
        shipping: purchaseOrder.shipping,
        items: purchaseOrder.items,
        history: purchaseOrder.history?.map((entry) => ({
          ...entry,
          timestamp: new Date().toISOString(),
        })),
      });

      if (!response) {
        throw new Error("Error al guardar la orden de compra");
      }

      toast({
        title: "✅ Orden guardada exitosamente",
        description: `Orden ${orderNumber} guardada como ${isOrdered ? 'ordenada' : 'borrador'}. Proveedor: ${supplier}. Total: ${formatCurrency(totalAmount)}`
      });

      // Reset form
      setRawText("");
      setParsedItems([]);
      setShipping({});
      setSupplier("");
      setNotes("");

    } catch (error) {
      log.error("Error saving purchase order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al guardar la orden de compra."
      });
    } finally {
      setLoading(false);
    }
  }, [parsedItems, isOrdered, shipping, supplier, notes, toast]);

  const handleConfirmArrivalAndStock = useCallback(async () => {
    if (parsedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe haber al menos un item para ingresar a inventario."
      });
      return;
    }

    const itemsWithProducts = parsedItems.filter(item => item.productId);
    if (itemsWithProducts.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe haber al menos un item con producto asignado."
      });
      return;
    }

    setLoading(true);
    try {
      const baseTotal = parsedItems.reduce((sum, item) => sum + (((item.qty || 0)) * (item.cost || 0)), 0);
      const shippingCost = shipping.cost || 0;

      let itemsWithAllocation: ParsedItem[] = parsedItems;
      if (shippingCost > 0) {
        const totalBase = baseTotal;
        const totalQty = parsedItems.reduce((sum, item) => sum + ((item.qty || 0)), 0);
        itemsWithAllocation = parsedItems.map((item) => {
          const itemBase = ((item.qty || 0)) * (item.cost || 0);
          const weight = totalBase > 0 ? (itemBase / totalBase) : (((item.qty || 0)) / Math.max(totalQty, 1));
          const allocatedTotal = shippingCost * weight;
          const perUnit = item.qty > 0 ? (allocatedTotal / item.qty) : 0;
          const finalCost = (item.cost || 0) + perUnit;
          return {
            ...item,
            totalAllocatedShipping: allocatedTotal,
            allocatedShippingPerUnit: perUnit,
            finalCost
          };
        });
      }

      const totalAmount = baseTotal + shippingCost;
      const orderNumber = `PO-${Date.now()}`;
      const cleanShipping = Object.fromEntries(
        Object.entries(shipping).filter(([_, value]) => value !== undefined && value !== '')
      );

      const now = new Date();
      const purchaseOrder: PurchaseOrder = {
        createdAt: now,
        orderDate: now,
        updatedAt: now,
        status: "received",
        supplier: supplier.trim() || 'Proveedor no especificado',
        orderNumber,
        totalAmount,
        ...(notes?.trim() && { notes: notes.trim() }),
        createdBy: 'Usuario Actual',
        shipping: cleanShipping,
        items: itemsWithAllocation.map((item) => item),
        history: [{
          action: 'Orden creada y mercancía recibida directamente',
          status: "received",
          timestamp: now,
          user: 'Usuario Actual',
          notes: `Orden creada con ${parsedItems.length} productos e ingresada directamente a inventario`
        }]
      };

      const saveResponse = await quickIntakeApiRequest<{ order: any }>({
        action: "savePurchaseOrder",
        supplier: purchaseOrder.supplier,
        orderNumber,
        status: purchaseOrder.status,
        totalAmount,
        notes: purchaseOrder.notes ?? null,
        shipping: purchaseOrder.shipping,
        items: purchaseOrder.items,
        history: purchaseOrder.history?.map((entry) => ({
          ...entry,
          timestamp: new Date().toISOString(),
        })),
      });

      if (!saveResponse?.order) {
        throw new Error("No se pudo guardar la orden de compra");
      }

      await quickIntakeApiRequest({
        action: "confirmArrival",
        items: itemsWithAllocation,
        userId: 'Usuario Actual',
        purchaseOrderId: saveResponse.order.id ?? orderNumber,
      });

      toast({
        title: "✅ Mercancía recibida e inventario actualizado",
        description: `Orden ${orderNumber} creada como recibida. Se ingresaron ${itemsWithAllocation.filter(i => i.productId).length} productos al inventario. Proveedor: ${supplier}. Total: ${formatCurrency(totalAmount)}`
      });

      // Reset form
      setRawText("");
      setParsedItems([]);
      setShipping({});
      setSupplier("");
      setNotes("");

    } catch (error) {
      log.error("Error updating inventory:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar el inventario."
      });
    } finally {
      setLoading(false);
    }
  }, [parsedItems, shipping, supplier, notes, toast]);

  const canSave = useMemo(() => parsedItems.length > 0 && !loading, [parsedItems.length, loading]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Quick PO Intake</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      {/* Section 1: Text Input and Parsing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Parsear Items de Texto
          </CardTitle>
          <CardDescription>
            Pega las líneas de productos con formato: &quot;cantidad nombre del producto&quot;
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="2 pantalla moto one fusion&#10;1 pantalla samsung a50&#10;..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleParseItems}
              disabled={!rawText.trim() || searchingProducts}
              className="flex items-center gap-2"
            >
              {searchingProducts ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Parsear en Items
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyNormalizedNames}
              disabled={parsedItems.length === 0}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar Nombres Normalizados
            </Button>
          </div>

          {/* Barra de búsqueda de productos */}
          <div className="border-t pt-4 mt-4">
            <Label htmlFor="product-search" className="text-sm font-medium text-gray-700 mb-2 block">
              Buscar Productos en Inventario
            </Label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="product-search"
                    placeholder="Buscar productos existentes para agregar..."
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
                {searchingProducts && (
                  <div className="flex items-center px-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* Resultados de búsqueda */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => addProductFromSearch(product)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-600">Costo: {formatCurrency(product.cost ?? 0)}</span>
                            <span className="text-xs text-gray-600">Precio: {formatCurrency(product.price ?? 0)}</span>
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showSearchResults && searchResults.length === 0 && productSearchQuery.trim() && !searchingProducts && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-4">
                  <p className="text-sm text-gray-500 text-center">No se encontraron productos</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Editable Items List */}
      {parsedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items Parseados ({parsedItems.length})</CardTitle>
            <CardDescription>
              Edita cantidades, asigna productos y configura costos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parsedItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label htmlFor={`qty-${index}`}>Cantidad</Label>
                      <Input
                        id={`qty-${index}`}
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleUpdateItem(index, 'qty', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`rawName-${index}`}>Nombre Original</Label>
                      <Input
                        id={`rawName-${index}`}
                        value={item.rawName}
                        onChange={(e) => handleUpdateItem(index, 'rawName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`cost-${index}`}>Costo</Label>
                      <Input
                        id={`cost-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.cost || ''}
                        onChange={(e) => handleUpdateItem(index, 'cost', parseFloat(e.target.value) || undefined)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`salePrice-${index}`}>Precio Venta</Label>
                      <Input
                        id={`salePrice-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.salePrice || ''}
                        onChange={(e) => handleUpdateItem(index, 'salePrice', parseFloat(e.target.value) || undefined)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Product Assignment */}
                  <div>
                    <Label>Producto Asignado</Label>
                    {item.productId ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{item.productName}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateItem(index, 'productId', undefined)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-1">
                        <Input
                          placeholder="Nombre del producto (manual)"
                          value={item.productName || ''}
                          onChange={(e) => handleUpdateItem(index, 'productName', e.target.value)}
                        />
                      </div>
                    )}
                  </div>


                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Shipping and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Datos de Envío y Acciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Información del Proveedor y Orden */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted border border-border rounded-lg">
            <div className="space-y-3">
              <Label htmlFor="supplier" className="text-primary font-semibold">
                Proveedor
              </Label>
              <div className="space-y-2">
                <Popover open={showSupplierDropdown} onOpenChange={setShowSupplierDropdown}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={showSupplierDropdown}
                      className="w-full justify-between bg-white border border-border focus:ring-ring"
                    >
                      {supplier || "Seleccionar proveedor..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Buscar proveedor..."
                        value={supplierSearchQuery}
                        onValueChange={setSupplierSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron proveedores.</CommandEmpty>
                        <CommandGroup>
                          {suppliers
                            .filter(s =>
                              !supplierSearchQuery ||
                              s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
                              s.contactInfo?.toLowerCase().includes(supplierSearchQuery.toLowerCase())
                            )
                            .map((supplierItem) => (
                              <CommandItem
                                key={supplierItem.id}
                                value={supplierItem.name}
                                onSelect={() => {
                                  setSupplier(supplierItem.name);
                                  setSupplierSearchQuery('');
                                  setShowSupplierDropdown(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    supplier === supplierItem.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{supplierItem.name}</span>
                                  {supplierItem.contactInfo && (
                                    <span className="text-sm text-muted-foreground">{supplierItem.contactInfo}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-primary border border-border hover:bg-muted hover:border-border"
                    onClick={() => setShowCreateSupplierModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Crear Nuevo
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="notes" className="text-primary font-semibold">
                Notas de la Orden
              </Label>
              <Input
                id="notes"
                placeholder="Notas adicionales..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white border border-border focus:ring-ring mt-2"
              />
            </div>
          </div>

          {/* Datos de Envío */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="carrier">Paquetería</Label>
              <Input
                id="carrier"
                placeholder="DHL, FedEx, etc."
                value={shipping.carrier || ''}
                onChange={(e) => setShipping(prev => ({ ...prev, carrier: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="tracking">Tracking</Label>
              <Input
                id="tracking"
                placeholder="Número de seguimiento"
                value={shipping.tracking || ''}
                onChange={(e) => setShipping(prev => ({ ...prev, tracking: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="guideUrl">URL de Guía</Label>
              <div className="flex gap-1">
                <Input
                  id="guideUrl"
                  placeholder="https://..."
                  value={shipping.guideUrl || ''}
                  onChange={(e) => setShipping(prev => ({ ...prev, guideUrl: e.target.value }))}
                />
                {shipping.guideUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={shipping.guideUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div>
              <CurrencyInput
                id="shipping-cost"
                label="Costo de Envío"
                value={shipping.cost || 0}
                onChange={(value) => setShipping(prev => ({ ...prev, cost: value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ordered-status"
              checked={isOrdered}
              onCheckedChange={setIsOrdered}
            />
            <Label htmlFor="ordered-status">
              Guardar como Ordenada (si no, se guarda como borrador)
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSavePurchaseOrder}
              disabled={!canSave}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar Orden de Compra
            </Button>

            <Button
              variant="secondary"
              onClick={handleConfirmArrivalAndStock}
              disabled={!canSave}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Confirmar Llegada e Ingresar a Inventario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal de creación de proveedor */}
      <AddEditSupplierDialog
        isOpen={showCreateSupplierModal}
        onClose={() => setShowCreateSupplierModal(false)}
        onSupplierSaved={(supplier) => {
          setSupplier(supplier.name);
          setShowCreateSupplierModal(false);
          toast({
            title: "Proveedor creado",
            description: `${supplier.name} ha sido agregado exitosamente`
          });
        }}
      />
    </div>
  );
}
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CartItem, Sale, SaleItem, UserProfile, ClientProfile, CRMClient } from "@/types";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Search } from "lucide-react";
import { formatCurrency } from '@/lib/utils';
import SaleSummaryDialog from "./SaleSummaryDialog";
import { addSaleAndUpdateStock } from "@/lib/services/salesService";
import { getClientsWithCredit, createCreditSale } from "@/lib/services/creditService";
import { getCRMClients } from "@/lib/services/crmClientService";
import { ScrollArea } from "../ui/scroll-area";
import { getLogger } from "@/lib/logger";

const log = getLogger("CheckoutDialog");

interface CheckoutDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    cartItems: CartItem[];
    totalAmount: number;
    onSuccessfulSale: () => void;
    activeSessionId?: string;
}

export default function CheckoutDialog({ isOpen, onOpenChange, cartItems, totalAmount, onSuccessfulSale, activeSessionId }: CheckoutDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta de Crédito' | 'Crédito'>('Efectivo');
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [serials, setSerials] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(false);
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [isSummaryOpen, setSummaryOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<string>("");
    const [clients, setClients] = useState<any[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [crmClients, setCrmClients] = useState<CRMClient[]>([]);
    const [loadingCRMClients, setLoadingCRMClients] = useState(false);
    const [selectedCRMClient, setSelectedCRMClient] = useState<string>("");
    const [crmClientSearch, setCrmClientSearch] = useState<string>("");
    const [showCRMClientDropdown, setShowCRMClientDropdown] = useState(false);
    const { userProfile } = useAuth();
    const { toast } = useToast();

    const loadClients = useCallback(async () => {
        setLoadingClients(true);
        try {
            const clientsData = await getClientsWithCredit();
            setClients(clientsData);
        } catch (error) {
            log.error('Error loading clients:', error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los clientes",
                variant: "destructive",
            });
        } finally {
            setLoadingClients(false);
        }
    }, [toast]);

    const loadCRMClients = useCallback(async () => {
        setLoadingCRMClients(true);
        try {
            const clientsData = await getCRMClients({
                search: crmClientSearch || undefined,
                clientStatus: 'active' as any,
                limit: 50
            });
            setCrmClients(clientsData);
        } catch (error) {
            log.error('Error loading CRM clients:', error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los clientes del CRM",
                variant: "destructive",
            });
        } finally {
            setLoadingCRMClients(false);
        }
    }, [toast, crmClientSearch]);

    useEffect(() => {
        if (paymentMethod === 'Crédito') {
            loadClients();
        }
    }, [paymentMethod, loadClients]);

    useEffect(() => {
        if (isOpen) {
            loadCRMClients();
        }
    }, [isOpen, loadCRMClients]);

    const change = useMemo(() => {
        if (paymentMethod === 'Efectivo' && amountPaid > 0) {
            return amountPaid - totalAmount;
        }
        return 0;
    }, [paymentMethod, amountPaid, totalAmount]);

    const handleSerialChange = (productId: string, index: number, value: string) => {
        setSerials(prev => {
            const newSerials = [...(prev[productId] || [])];
            newSerials[index] = value;
            return { ...prev, [productId]: newSerials };
        });
    };

    const handleCRMClientSelect = (clientId: string) => {
        const client = crmClients.find(c => c.id === clientId);
        if (client) {
            setSelectedCRMClient(clientId);
            setCustomerName(`${client.firstName} ${client.lastName}`);
            setCustomerPhone(client.phone || '');
            setShowCRMClientDropdown(false);
            setCrmClientSearch('');
        }
    };

    const handleCRMClientSearch = (value: string) => {
        setCrmClientSearch(value);
        if (value.length >= 2 || value.length === 0) {
            loadCRMClients();
        }
    };

    const clearCRMClientSelection = () => {
        setSelectedCRMClient('');
        setCustomerName('');
        setCustomerPhone('');
    };

    const handleProcessSale = async () => {
        if (!userProfile) {
            toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
            return;
        }

        if (paymentMethod === 'Efectivo' && amountPaid < totalAmount) {
            toast({ variant: "destructive", title: "Pago Insuficiente", description: "El monto pagado es menor al total de la venta." });
            return;
        }

        if (paymentMethod === 'Crédito' && !selectedClient) {
            toast({
                title: "Error",
                description: "Debe seleccionar un cliente para la venta a crédito",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);

        const saleItems: SaleItem[] = cartItems.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            priceAtSale: item.price,
            serials: serials[item.id] || [],
        }));

        const saleDataForDb = {
            items: saleItems,
            totalAmount,
            paymentMethod,
            cashierId: userProfile.uid,
            cashierName: userProfile.name,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            customerEmail: null,
            crmClientId: selectedCRMClient || null,
            cashSessionId: activeSessionId || null,
            amountPaid: paymentMethod === 'Efectivo' ? amountPaid : totalAmount,
            changeGiven: paymentMethod === 'Efectivo' ? (change > 0 ? change : 0) : 0,
        }

        try {
            let newSale: Sale;

            console.log("Step 1: Sending sale data to the backend...", saleDataForDb);

            if (paymentMethod === 'Crédito') {
                newSale = await createCreditSale({
                    items: cartItems,
                    clientId: selectedClient,
                    totalAmount,
                    serials: Object.values(serials).flat(),
                    userId: userProfile.uid,
                    customerName: customerName || undefined,
                    customerPhone: customerPhone || undefined,
                });
            } else {
                // Usar API route para procesar la venta
                const response = await fetch('/api/sales', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        saleData: saleDataForDb,
                        cartItems: cartItems,
                        crmClientId: selectedCRMClient || null
                    })
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.details || result.error || 'Error al procesar la venta');
                }

                newSale = result.sale;
            }

            setLastSale(newSale);

            toast({
                title: "Venta Exitosa",
                description: `Venta ${paymentMethod === 'Crédito' ? 'a crédito' : ''} completada exitosamente`,
            });

            onSuccessfulSale();
            onOpenChange(false);
            setSummaryOpen(true);
            setCustomerName("");
            setCustomerPhone("");
            setAmountPaid(0);
            setSerials({});
            setSelectedClient("");
            setSelectedCRMClient("");
            setCrmClientSearch("");
            setShowCRMClientDropdown(false);

        } catch (error) {
            log.error("Sale processing error:", error);
            toast({
                variant: "destructive",
                title: "Error en la Venta",
                description: "No se pudo procesar la venta. Intente de nuevo.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-bold tracking-tight">Finalizar Venta</DialogTitle>
                        <DialogDescription>
                            Seleccione el método de pago y complete los datos para cerrar la transacción.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-4 py-4 pr-6">
                            <div className="space-y-2">
                                <Label htmlFor="crm-client-select">Cliente del CRM</Label>
                                <Popover open={showCRMClientDropdown} onOpenChange={setShowCRMClientDropdown} modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between text-left h-auto p-3"
                                        >
                                            <div className="flex flex-col items-start">
                                                {selectedCRMClient ? (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4" />
                                                            <span className="font-medium">
                                                                {crmClients.find(c => c.id === selectedCRMClient)?.firstName} {crmClients.find(c => c.id === selectedCRMClient)?.lastName}
                                                            </span>
                                                        </div>
                                                        {crmClients.find(c => c.id === selectedCRMClient)?.phone && (
                                                            <span className="text-sm text-muted-foreground">
                                                                {crmClients.find(c => c.id === selectedCRMClient)?.phone}
                                                            </span>
                                                        )}
                                                        {crmClients.find(c => c.id === selectedCRMClient)?.companyName && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {crmClients.find(c => c.id === selectedCRMClient)?.companyName}
                                                            </Badge>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-muted-foreground">
                                                        <User className="h-4 w-4" />
                                                        <span>Seleccionar cliente existente o buscar...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0 z-[100]" align="start">
                                        <div className="flex flex-col">
                                            <div className="flex items-center border-b px-3">
                                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                                <input
                                                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder="Buscar cliente por nombre, teléfono o cédula..."
                                                    value={crmClientSearch}
                                                    onChange={(e) => handleCRMClientSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
                                                {loadingCRMClients ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                        <span className="text-sm">Buscando clientes...</span>
                                                    </div>
                                                ) : crmClients.length === 0 ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Puedes crear un nuevo cliente desde el módulo de CRM
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                                            Clientes Activos
                                                        </div>
                                                        {crmClients.map((client) => (
                                                            <div
                                                                key={client.id}
                                                                onClick={() => handleCRMClientSelect(client.id)}
                                                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                                            >
                                                                <div className="flex items-center gap-3 w-full">
                                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-medium truncate">
                                                                                {client.firstName} {client.lastName}
                                                                            </span>
                                                                            {client.companyName && (
                                                                                <Badge variant="outline" className="text-xs">
                                                                                    {client.companyName}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            {client.phone && (
                                                                                <span className="text-sm text-muted-foreground">
                                                                                    {client.phone}
                                                                                </span>
                                                                            )}
                                                                            {client.phone && client.identificationNumber && (
                                                                                <span className="text-muted-foreground">•</span>
                                                                            )}
                                                                            {client.identificationNumber && (
                                                                                <span className="text-sm text-muted-foreground">
                                                                                    {client.identificationType}: {client.identificationNumber}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {client.totalPurchases > 0 && (
                                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                                Compras totales: {formatCurrency(client.totalPurchases)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {selectedCRMClient && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearCRMClientSelection}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <User className="h-3 w-3 mr-1" />
                                            Limpiar selección
                                        </Button>
                                    </div>
                                )}

                                <div className="text-xs text-muted-foreground mt-2">
                                    Si el cliente no existe en el CRM, puedes ingresarlo manualmente abajo o crearlo desde el módulo de CRM.
                                </div>
                            </div>

                            {!selectedCRMClient && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="customer-name">Nombre del Cliente (Opcional)</Label>
                                        <Input
                                            id="customer-name"
                                            placeholder="Ej: Juan Pérez"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="customer-phone">Teléfono del Cliente (Opcional)</Label>
                                        <Input
                                            id="customer-phone"
                                            placeholder="Ej: 555-123-4567"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <Label>Números de Serie/IMEI (Opcional)</Label>
                                <div className="space-y-3 mt-2 rounded-md border p-4">
                                    {cartItems.map(item => (
                                        <div key={item.id}>
                                            <p className="font-semibold text-sm">{item.name}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                                {Array.from({ length: item.quantity }).map((_, index) => (
                                                    <Input
                                                        key={`${item.id}-${index}`}
                                                        placeholder={`Serie/IMEI #${index + 1}`}
                                                        value={serials[item.id]?.[index] || ''}
                                                        onChange={(e) => handleSerialChange(item.id, index, e.target.value)}
                                                        className="text-xs h-8"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="text-2xl font-bold flex justify-between">
                                <span>Total a Pagar:</span>
                                <span className="text-primary">{formatCurrency(totalAmount)}</span>
                            </div>
                            <RadioGroup defaultValue="Efectivo" value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'Efectivo' | 'Tarjeta de Crédito' | 'Crédito')}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Efectivo" id="cash" />
                                    <Label htmlFor="cash">Efectivo</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Tarjeta de Crédito" id="card" />
                                    <Label htmlFor="card">Tarjeta de Crédito</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Crédito" id="credit" />
                                    <Label htmlFor="credit">Crédito</Label>
                                </div>
                            </RadioGroup>

                            {paymentMethod === 'Efectivo' && (
                                <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="amount-paid">Monto Pagado por el Cliente</Label>
                                        <Input
                                            id="amount-paid"
                                            type="number"
                                            placeholder="0.00"
                                            value={amountPaid || ''}
                                            onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                    {change > 0 && (
                                        <div className="text-lg font-bold flex justify-between items-center text-green-600">
                                            <span>Cambio a Devolver:</span>
                                            <span>{formatCurrency(change)}</span>
                                        </div>
                                    )}
                                    {change < 0 && (
                                        <div className="text-sm font-bold flex justify-between items-center text-destructive">
                                            <span>Faltante:</span>
                                            <span>{formatCurrency(Math.abs(change))}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'Crédito' && (
                                <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="client-select">Seleccionar Cliente</Label>
                                        {loadingClients ? (
                                            <div className="flex items-center space-x-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Cargando clientes...</span>
                                            </div>
                                        ) : (
                                            <Select value={selectedClient} onValueChange={setSelectedClient}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione un cliente" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {clients.map((client) => (
                                                        <SelectItem key={client.id} value={client.id}>
                                                            {client.name} - Límite: ${client.creditAccount?.creditLimit || 0} - Disponible: ${(client.creditAccount?.creditLimit || 0) - (client.creditAccount?.currentBalance || 0)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                    {selectedClient && (
                                        <div className="text-sm text-muted-foreground">
                                            <p>La venta se registrará como deuda del cliente seleccionado.</p>
                                            <p>El monto se descontará automáticamente de su límite de crédito disponible.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleProcessSale} disabled={loading || (paymentMethod === 'Efectivo' && amountPaid < totalAmount)}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Venta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {lastSale && (
                <SaleSummaryDialog
                    isOpen={isSummaryOpen}
                    onOpenChange={setSummaryOpen}
                    sale={lastSale}
                />
            )}
        </>
    );
}

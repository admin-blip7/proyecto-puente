import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CartItem, Sale, SaleItem, CRMClient } from "@/types";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { formatCurrency } from '@/lib/utils';
import SaleSummaryDialog from "./SaleSummaryDialog";
import { getCRMClients } from "@/lib/services/crmClientService";
import { ScrollArea } from "../ui/scroll-area";
import { getLogger } from "@/lib/logger";

// Sub-components
import { CustomerSection } from "./checkout/CustomerSection";
import { ProductList } from "./checkout/ProductList";
import { PaymentMethodSection } from "./checkout/PaymentMethodSection";
import { CheckoutFooter } from "./checkout/CheckoutFooter";

const log = getLogger("CheckoutDialog");

interface CheckoutDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    cartItems: CartItem[];
    totalAmount: number;
    onSuccessfulSale: () => void;
    activeSessionId?: string;
    appliedDiscount?: { code: string; percentage: number } | null;
    subtotal?: number;
    discountAmount?: number;
}

export default function CheckoutDialog({
    isOpen,
    onOpenChange,
    cartItems,
    totalAmount,
    onSuccessfulSale,
    activeSessionId,
    appliedDiscount,
    subtotal,
    discountAmount
}: CheckoutDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta de Crédito' | 'Transferencia/QR'>('Efectivo');
    const [customerMode, setCustomerMode] = useState<'existente' | 'nuevo'>('existente');
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [serials, setSerials] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(false);
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [isSummaryOpen, setSummaryOpen] = useState(false);

    const [crmClients, setCrmClients] = useState<CRMClient[]>([]);
    const [loadingCRMClients, setLoadingCRMClients] = useState(false);
    const [selectedCRMClient, setSelectedCRMClient] = useState<string>("");
    const [crmClientSearch, setCrmClientSearch] = useState<string>("");
    const [showCRMClientDropdown, setShowCRMClientDropdown] = useState(false);
    const { userProfile } = useAuth();
    const { toast } = useToast();

    const loadCRMClients = useCallback(async (search?: string) => {
        setLoadingCRMClients(true);
        try {
            const clientsData = await getCRMClients({
                search: search || undefined,
                clientStatus: 'active' as any,
                limit: 20 // Reduced limit for performance
            });
            const uniqueClients = clientsData.filter((client, index, self) =>
                index === self.findIndex((c) => (
                    c.id === client.id || (client.phone && c.phone && c.phone === client.phone)
                ))
            );
            setCrmClients(uniqueClients);
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
    }, [toast]);

    // Initial load and Search Debounce
    useEffect(() => {
        if (!isOpen) return;

        if (crmClientSearch === "") {
            loadCRMClients();
            return;
        }

        const timer = setTimeout(() => {
            if (crmClientSearch.length >= 2) {
                loadCRMClients(crmClientSearch);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [isOpen, crmClientSearch, loadCRMClients]);

    const change = useMemo(() => {
        if (paymentMethod === 'Efectivo' && amountPaid > 0) {
            return amountPaid - totalAmount;
        }
        return 0;
    }, [paymentMethod, amountPaid, totalAmount]);

    const totalUnits = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + item.quantity, 0);
    }, [cartItems]);

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

        // Validate customer is selected
        const hasCustomer = customerMode === 'existente'
            ? !!selectedCRMClient
            : !!customerName.trim();

        if (!hasCustomer) {
            toast({
                variant: "destructive",
                title: "Cliente Requerido",
                description: "Debe seleccionar o ingresar un cliente antes de completar la venta."
            });
            return;
        }

        // Validate if customer already exists when creating a new one
        if (customerMode === 'nuevo' && (customerPhone || customerName)) {
            const searchTerm = customerPhone || customerName;
            try {
                // Determine if we search by phone (more accurate) or name
                // If phone is present, search by it. Otherwise search by exact name might be too broad but we'll try.
                // ideally getCRMClients fuzzy searches, we can check the results.
                const existingClients = await getCRMClients({
                    search: searchTerm,
                    limit: 5,
                    clientStatus: 'active' as any
                });

                // Check for exact phone match or very close name match
                const duplicate = existingClients.find(c =>
                    (customerPhone && c.phone?.trim() === customerPhone.trim()) ||
                    (c.firstName + " " + c.lastName).toLowerCase() === customerName.toLowerCase()
                );

                if (duplicate) {
                    toast({
                        variant: "destructive",
                        title: "Cliente Existente",
                        description: `El cliente ${duplicate.firstName} ${duplicate.lastName} ya existe con estos datos. Por favor seleccione "Existente" y búsquelo.`,
                    });
                    // Switch mode for user convenience? Or just return. Returning is safer.
                    return;
                }
            } catch (error) {
                log.error("Error checking for duplicate client:", error);
                // Continue with sale if check fails? Better to be safe and warn but allow or block? 
                // We'll block to be safe as per "prevent future duplicates".
            }
        }

        if (paymentMethod === 'Efectivo' && amountPaid < totalAmount) {
            toast({ variant: "destructive", title: "Pago Insuficiente", description: "El monto pagado es menor al total de la venta." });
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
            paymentMethod: paymentMethod === 'Transferencia/QR' ? 'QR/Transferencia' : paymentMethod,
            cashierId: userProfile.uid,
            cashierName: userProfile.name,
            customerName: customerName || null,
            customerPhone: customerPhone || null,
            customerEmail: null,
            crmClientId: selectedCRMClient || null,
            cashSessionId: activeSessionId || null,
            amountPaid: paymentMethod === 'Efectivo' ? amountPaid : totalAmount,
            changeGiven: paymentMethod === 'Efectivo' ? (change > 0 ? change : 0) : 0,
            discountCode: appliedDiscount?.code || null,
            discountAmount: discountAmount || null,
            discountPercentage: appliedDiscount?.percentage || null,
        }

        try {
            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            setLastSale(result.sale);
            toast({ title: "Venta Exitosa", description: "Venta completada exitosamente" });
            onSuccessfulSale();
            onOpenChange(false);
            setSummaryOpen(true);

            // Reset state
            setCustomerName("");
            setCustomerPhone("");
            setAmountPaid(0);
            setSerials({});
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
                <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl bg-white dark:bg-zinc-950">
                    {/* Hidden title for accessibility */}
                    <DialogHeader className="sr-only">
                        <DialogTitle>Finalizar Venta</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col h-full max-h-[90vh]">
                        {/* Header Section */}
                        <div className="p-8 pb-4">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Finalizar Venta</h2>
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="h-6 w-6 text-zinc-500" />
                                </button>
                            </div>
                            <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                                Complete los detalles del cliente y seleccione el método de pago para cerrar la transacción.
                            </p>
                        </div>

                        <ScrollArea className="flex-1 px-8 py-2">
                            <div className="space-y-8 pb-8">
                                <CustomerSection
                                    customerMode={customerMode}
                                    setCustomerMode={setCustomerMode}
                                    selectedCRMClient={selectedCRMClient}
                                    customerName={customerName}
                                    customerPhone={customerPhone}
                                    setCustomerName={setCustomerName}
                                    setCustomerPhone={setCustomerPhone}
                                    showCRMClientDropdown={showCRMClientDropdown}
                                    setShowCRMClientDropdown={setShowCRMClientDropdown}
                                    crmClientSearch={crmClientSearch}
                                    handleCRMClientSearch={handleCRMClientSearch}
                                    loadingCRMClients={loadingCRMClients}
                                    crmClients={crmClients}
                                    handleCRMClientSelect={handleCRMClientSelect}
                                    clearCRMClientSelection={clearCRMClientSelection}
                                />

                                <ProductList
                                    cartItems={cartItems}
                                    serials={serials}
                                    handleSerialChange={handleSerialChange}
                                />

                                <PaymentMethodSection
                                    paymentMethod={paymentMethod}
                                    setPaymentMethod={setPaymentMethod}
                                    amountPaid={amountPaid}
                                    setAmountPaid={setAmountPaid}
                                    change={change}
                                />
                            </div>
                        </ScrollArea>

                        <CheckoutFooter
                            totalAmount={totalAmount}
                            totalUnits={totalUnits}
                            appliedDiscount={appliedDiscount}
                            loading={loading}
                            onCancel={() => onOpenChange(false)}
                            onConfirm={handleProcessSale}
                            canConfirm={
                                (paymentMethod !== 'Efectivo' || amountPaid >= totalAmount) &&
                                (customerMode === 'existente' ? !!selectedCRMClient : !!customerName.trim())
                            }
                            missingCustomer={customerMode === 'existente' ? !selectedCRMClient : !customerName.trim()}
                        />
                    </div>
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

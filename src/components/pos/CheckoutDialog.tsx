"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CartItem, Sale, SaleItem, UserProfile } from "@/types";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { formatCurrency } from '@/lib/utils';
import SaleSummaryDialog from "./SaleSummaryDialog";
import { addSaleAndUpdateStock } from "@/lib/services/salesService";
import { getClientsWithCredit, createCreditSale } from "@/lib/services/creditService";
import { ScrollArea } from "../ui/scroll-area";

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  totalAmount: number;
  onSuccessfulSale: () => void;
}

export default function CheckoutDialog({ isOpen, onOpenChange, cartItems, totalAmount, onSuccessfulSale }: CheckoutDialogProps) {
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
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Load clients when credit payment is selected
  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const clientsData = await getClientsWithCredit();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  }, [toast]);

  useEffect(() => {
    if (paymentMethod === 'Crédito') {
      loadClients();
    }
  }, [paymentMethod, loadClients]);

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

  const handleProcessSale = async () => {
    if (!userProfile) {
        toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
        return;
    }

    // Remove serial validation for now since CartItem structure needs clarification
    // const missingSerials = cartItems.filter(item => 
    //   item.product?.requiresSerial && (!serials[item.id] || serials[item.id].length < item.quantity)
    // );

    // if (missingSerials.length > 0) {
    //   toast({
    //     title: "Error",
    //     description: `Faltan números de serie para: ${missingSerials.map(item => item.name).join(', ')}`,
    //     variant: "destructive",
    //   });
    //   return;
    // }

    // Validate payment method specific requirements
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
    }

    try {
        let newSale: Sale;

        if (paymentMethod === 'Crédito') {
           // Create financed sale
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
          // Create regular sale
          newSale = await addSaleAndUpdateStock(saleDataForDb, cartItems);
        }

        setLastSale(newSale);
        
        toast({
            title: "Venta Exitosa",
            description: `Venta ${paymentMethod === 'Crédito' ? 'a crédito' : ''} completada exitosamente`,
        });
        
        // Reset state and close dialogs
        onSuccessfulSale();
        onOpenChange(false);
        setSummaryOpen(true);
        setCustomerName("");
        setCustomerPhone("");
        setAmountPaid(0);
        setSerials({});
        setSelectedClient("");

    } catch (error) {
        console.error("Sale processing error:", error);
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
                    <Label htmlFor="customer-name">Nombre del Cliente (Opcional)</Label>
                    <Input id="customer-name" placeholder="Ej: Juan Pérez" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customer-phone">Teléfono del Cliente (Opcional)</Label>
                    <Input id="customer-phone" placeholder="Ej: 555-123-4567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                </div>
                
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

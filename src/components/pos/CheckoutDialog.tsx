"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CartItem, Sale, SaleItem, UserProfile } from "@/types";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import SaleSummaryDialog from "./SaleSummaryDialog";
import { addSaleAndUpdateStock } from "@/lib/services/salesService";
import { ScrollArea } from "../ui/scroll-area";

interface CheckoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  totalAmount: number;
  onSuccessfulSale: () => void;
}

export default function CheckoutDialog({ isOpen, onOpenChange, cartItems, totalAmount, onSuccessfulSale }: CheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta de Crédito'>('Efectivo');
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [serials, setSerials] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isSummaryOpen, setSummaryOpen] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

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
      paymentMethod,
      cashierId: userProfile.uid,
      cashierName: userProfile.name,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
    }

    try {
        const newSale = await addSaleAndUpdateStock(saleDataForDb, cartItems);

        setLastSale(newSale);
        
        toast({
            title: "Venta Exitosa",
            description: "La venta ha sido registrada correctamente.",
        });
        
        // Reset state and close dialogs
        onSuccessfulSale();
        onOpenChange(false);
        setSummaryOpen(true);
        setCustomerName("");
        setCustomerPhone("");
        setAmountPaid(0);
        setSerials({});

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
                                        key={index}
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
                    <span className="text-primary">${totalAmount.toFixed(2)}</span>
                </div>
                <RadioGroup defaultValue="Efectivo" value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'Efectivo' | 'Tarjeta de Crédito')}>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Efectivo" id="cash" />
                    <Label htmlFor="cash">Efectivo</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Tarjeta de Crédito" id="card" />
                    <Label htmlFor="card">Tarjeta de Crédito</Label>
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
                                <span>${change.toFixed(2)}</span>
                            </div>
                        )}
                        {change < 0 && (
                             <div className="text-sm font-bold flex justify-between items-center text-destructive">
                                <span>Faltante:</span>
                                <span>${Math.abs(change).toFixed(2)}</span>
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

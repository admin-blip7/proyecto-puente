"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CartItem, SaleItem, UserProfile } from "@/types";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { generateSalesSummary, GenerateSalesSummaryInput } from '@/ai/flows/generate-sales-summary';
import { Loader2 } from "lucide-react";
import SaleSummaryDialog from "./SaleSummaryDialog";
import { addSaleAndUpdateStock } from "@/lib/services/salesService";

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
  const [loading, setLoading] = useState(false);
  const [saleSummary, setSaleSummary] = useState<string | null>(null);
  const [isSummaryOpen, setSummaryOpen] = useState(false);

  const { userProfile } = useAuth();
  const { toast } = useToast();

  const handleProcessSale = async () => {
    if (!userProfile) {
        toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
        return;
    }
    setLoading(true);
    
    const saleItems: SaleItem[] = cartItems.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        priceAtSale: item.price
    }));

    const saleDataForSummary: GenerateSalesSummaryInput = {
        items: saleItems,
        totalAmount,
        paymentMethod,
        cashierId: userProfile.uid,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
    };
    
    const saleDataForDb = {
      items: saleItems,
      totalAmount,
      paymentMethod,
      cashierId: userProfile.uid,
      cashierName: userProfile.name,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
    }

    try {
        await addSaleAndUpdateStock(saleDataForDb, cartItems);

        const result = await generateSalesSummary(saleDataForSummary);
        setSaleSummary(result.summary);
        
        toast({
            title: "Venta Exitosa",
            description: "La venta ha sido registrada correctamente.",
        });

        onSuccessfulSale();
        onOpenChange(false);
        setSummaryOpen(true);
        setCustomerName("");
        setCustomerPhone("");

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold tracking-tight">Finalizar Venta</DialogTitle>
            <DialogDescription>
              Seleccione el método de pago para completar la transacción.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label htmlFor="customer-name">Nombre del Cliente (Opcional)</Label>
                <Input id="customer-name" placeholder="Ej: Juan Pérez" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="customer-phone">Teléfono del Cliente (Opcional)</Label>
                <Input id="customer-phone" placeholder="Ej: 555-123-4567" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total a Pagar:</span>
              <span className="text-primary">${totalAmount.toFixed(2)}</span>
            </div>
            <RadioGroup defaultValue="Efectivo" onValueChange={(value) => setPaymentMethod(value as 'Efectivo' | 'Tarjeta de Crédito')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Efectivo" id="cash" />
                <Label htmlFor="cash">Efectivo</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Tarjeta de Crédito" id="card" />
                <Label htmlFor="card">Tarjeta de Crédito</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleProcessSale} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {saleSummary && (
        <SaleSummaryDialog
          isOpen={isSummaryOpen}
          onOpenChange={setSummaryOpen}
          summary={saleSummary}
        />
      )}
    </>
  );
}

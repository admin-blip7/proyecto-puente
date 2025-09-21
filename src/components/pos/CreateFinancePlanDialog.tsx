
"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Product, ClientProfile } from "@/types";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Package, User, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { addWeeks, addMonths } from "date-fns";

interface CreateFinancePlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allProducts: Product[];
  allClients: ClientProfile[];
}

interface AmortizationRow {
    paymentNumber: number;
    paymentDate: string;
    paymentAmount: number;
    interest: number;
    principal: number;
    remainingBalance: number;
}

export default function CreateFinancePlanDialog({
  isOpen,
  onOpenChange,
  allProducts,
  allClients,
}: CreateFinancePlanDialogProps) {
  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  
  // Form state
  const [downPayment, setDownPayment] = useState(0);
  const [annualInterestRate, setAnnualInterestRate] = useState(25);
  const [paymentFrequency, setPaymentFrequency] = useState<"Semanal" | "Mensual">("Semanal");
  const [term, setTerm] = useState(12);

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductPopoverOpen(false);
  };

  const handleSelectClient = (client: ClientProfile) => {
    setSelectedClient(client);
    setClientPopoverOpen(false);
  };
  
  const amortizationTable = useMemo((): AmortizationRow[] => {
    if (!selectedProduct || term <= 0 || annualInterestRate < 0) {
        return [];
    }

    const principal = selectedProduct.price - downPayment;
    if (principal <= 0) return [];

    const isWeekly = paymentFrequency === "Semanal";
    const periods = term;
    const periodicRate = (annualInterestRate / 100) / (isWeekly ? 52 : 12);

    if (periodicRate === 0) { // Simple division if no interest
        const paymentAmount = principal / periods;
        let balance = principal;
        return Array.from({ length: periods }, (_, i) => {
            balance -= paymentAmount;
            return {
                paymentNumber: i + 1,
                paymentDate: format(isWeekly ? addWeeks(new Date(), i + 1) : addMonths(new Date(), i + 1), "dd MMM yyyy", { locale: es }),
                paymentAmount: paymentAmount,
                interest: 0,
                principal: paymentAmount,
                remainingBalance: balance > 0 ? balance : 0,
            };
        });
    }

    const periodicPayment = (principal * periodicRate) / (1 - Math.pow(1 + periodicRate, -periods));

    let remainingBalance = principal;
    const table: AmortizationRow[] = [];
    const startDate = new Date();

    for (let i = 1; i <= periods; i++) {
        const interest = remainingBalance * periodicRate;
        const principalPayment = periodicPayment - interest;
        remainingBalance -= principalPayment;

        table.push({
            paymentNumber: i,
            paymentDate: format(isWeekly ? addWeeks(startDate, i) : addMonths(startDate, i), "dd MMM yyyy", { locale: es }),
            paymentAmount: periodicPayment,
            interest,
            principal: principalPayment,
            remainingBalance: remainingBalance > 0 ? remainingBalance : 0,
        });
    }
    return table;

}, [selectedProduct, downPayment, annualInterestRate, paymentFrequency, term]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Financiar Producto: Venta a Crédito</DialogTitle>
          <DialogDescription>
            Sigue los pasos para seleccionar el producto, definir los términos del crédito y asociar al cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow min-h-0 py-4">
            {/* Columna Izquierda: Formulario */}
            <div className="flex flex-col gap-4">
                {/* Paso 1: Producto */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-lg flex items-center gap-2"><span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full h-6 w-6 text-sm">1</span> Seleccionar Producto</h4>
                    <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between">
                                {selectedProduct ? (
                                    <><Package className="mr-2 h-4 w-4" />{selectedProduct.name}</>
                                ) : "Buscar producto..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar por nombre o SKU..." />
                                <CommandList>
                                    <CommandEmpty>No se encontró el producto.</CommandEmpty>
                                    {allProducts.map((product) => (
                                    <CommandItem key={product.id} onSelect={() => handleSelectProduct(product)}>
                                        {product.name}
                                    </CommandItem>
                                    ))}
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    {selectedProduct && <p className="text-right font-bold text-lg">Precio: ${selectedProduct.price.toFixed(2)}</p>}
                </div>

                {/* Paso 2: Términos */}
                <div className="space-y-3">
                     <h4 className="font-semibold text-lg flex items-center gap-2"><span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full h-6 w-6 text-sm">2</span> Definir Términos</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="downPayment">Enganche (Opcional)</Label>
                            <Input id="downPayment" type="number" value={downPayment} onChange={e => setDownPayment(parseFloat(e.target.value) || 0)} />
                        </div>
                         <div>
                            <Label htmlFor="interestRate">Tasa Interés Anual (%)</Label>
                            <Input id="interestRate" type="number" value={annualInterestRate} onChange={e => setAnnualInterestRate(parseFloat(e.target.value) || 0)} />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Frecuencia de Pago</Label>
                            <Select value={paymentFrequency} onValueChange={(val: "Semanal" | "Mensual") => setPaymentFrequency(val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Semanal">Semanal</SelectItem>
                                    <SelectItem value="Mensual">Mensual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="term">Plazo ({paymentFrequency === "Semanal" ? "Semanas" : "Meses"})</Label>
                            <Input id="term" type="number" value={term} onChange={e => setTerm(parseInt(e.target.value) || 0)} />
                        </div>
                     </div>
                </div>

                 {/* Paso 3: Cliente */}
                 <div className="space-y-2">
                    <h4 className="font-semibold text-lg flex items-center gap-2"><span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full h-6 w-6 text-sm">3</span> Asociar Cliente</h4>
                     <div className="flex gap-2">
                        <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {selectedClient ? (
                                        <><User className="mr-2 h-4 w-4" />{selectedClient.name}</>
                                    ) : "Buscar cliente existente..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Buscar por nombre o teléfono..." />
                                    <CommandList>
                                        <CommandEmpty>No se encontró el cliente.</CommandEmpty>
                                        {allClients.map((client) => (
                                        <CommandItem key={client.id} onSelect={() => handleSelectClient(client)}>
                                            {client.name}
                                        </CommandItem>
                                        ))}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Button variant="secondary"><PlusCircle className="mr-2 h-4 w-4"/> Nuevo</Button>
                     </div>
                </div>
            </div>
            
            {/* Columna Derecha: Plan de Pagos */}
            <div className="flex flex-col border rounded-lg">
                 <div className="p-4 border-b">
                    <h4 className="font-semibold text-lg">Plan de Pagos Calculado</h4>
                 </div>
                 <ScrollArea className="flex-grow">
                    <Table>
                        <TableHeader className="sticky top-0 bg-muted">
                            <TableRow>
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead className="text-right">Pago</TableHead>
                                <TableHead className="text-right">Capital</TableHead>
                                <TableHead className="text-right">Interés</TableHead>
                                <TableHead className="text-right">Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {amortizationTable.length > 0 ? (
                                amortizationTable.map(row => (
                                    <TableRow key={row.paymentNumber}>
                                        <TableCell>{row.paymentNumber}</TableCell>
                                        <TableCell>{row.paymentDate}</TableCell>
                                        <TableCell className="text-right font-medium">${row.paymentAmount.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-green-600">${row.principal.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-destructive">${row.interest.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold">${row.remainingBalance.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Completa los términos para ver el plan de pagos.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                 </ScrollArea>
                 <div className="p-4 border-t flex justify-between font-bold text-lg">
                    <span>Monto a Financiar:</span>
                    <span>${selectedProduct ? (selectedProduct.price - downPayment).toFixed(2) : '0.00'}</span>
                 </div>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!selectedProduct || !selectedClient || amortizationTable.length === 0}>
            Confirmar y Crear Crédito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DialogBody } from "@/components/ui/dialog-body";
import { Button } from "@/components/ui/button";
import { Product, ClientProfile } from "@/types";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Package, User, PlusCircle, Loader2, Calculator, CreditCard, CheckCircle2, DollarSign, Calendar, Percent, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { addWeeks, addMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { createFinancedSale } from "@/lib/services/creditService";
import { useAuth } from "@/lib/hooks";
import AddEditClientDialog from "@/components/admin/credit/AddEditClientDialog";
import { formatCurrency } from "@/lib/utils";

interface CreateFinancePlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allProducts: Product[];
  allClients: ClientProfile[];
  onSaleCreated: () => void;
  onClientAdded?: (client: ClientProfile) => void;
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
  onSaleCreated,
  onClientAdded,
}: CreateFinancePlanDialogProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewClientDialogOpen, setIsNewClientDialogOpen] = useState(false);
  
  // Form state
  const [downPayment, setDownPayment] = useState(0);
  const [annualInterestRate, setAnnualInterestRate] = useState(25);
  const [paymentFrequency, setPaymentFrequency] = useState<"Semanal" | "Mensual">("Semanal");
  const [term, setTerm] = useState(12);

  const { toast } = useToast();
  const { userProfile } = useAuth();

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductPopoverOpen(false);
  };

  const handleSelectClient = (client: ClientProfile) => {
    setSelectedClient(client);
    setClientPopoverOpen(false);
  };

  const handleNewClientClick = () => {
    setIsNewClientDialogOpen(true);
  };

  const handleClientAdded = (newClient: ClientProfile) => {
    setSelectedClient(newClient);
    setIsNewClientDialogOpen(false);
    if (onClientAdded) {
      onClientAdded(newClient);
    }
  };
  
  const handleClose = (open: boolean) => {
    if (!open) {
        setSelectedProduct(null);
        setSelectedClient(null);
        setDownPayment(0);
        setAnnualInterestRate(25);
        setPaymentFrequency("Semanal");
        setTerm(12);
        setIsLoading(false);
    }
    onOpenChange(open);
  }

  const handleConfirmSale = async () => {
    if (!selectedProduct || !selectedClient || !userProfile) {
        toast({ 
          variant: "destructive", 
          title: "Datos incompletos", 
          description: "Debes seleccionar un producto y un cliente para continuar." 
        });
        return;
    }

    if (term <= 0) {
        toast({ 
          variant: "destructive", 
          title: "Términos inválidos", 
          description: "El plazo debe ser mayor a cero." 
        });
        return;
    }

    if (annualInterestRate < 0) {
        toast({ 
          variant: "destructive", 
          title: "Términos inválidos", 
          description: "La tasa de interés no puede ser negativa." 
        });
        return;
    }

    setIsLoading(true);
    try {
        await createFinancedSale({
            product: selectedProduct,
            client: selectedClient,
            user: userProfile,
            terms: {
                downPayment,
                annualInterestRate,
                paymentFrequency,
                term,
            }
        });

        toast({
            title: "Venta a Crédito Creada",
            description: `Se ha generado el crédito para ${selectedClient.name} exitosamente.`
        });
        onSaleCreated();
        handleClose(false);

    } catch (error: any) {
        console.error("Error creating financed sale:", error);
        toast({
            variant: "destructive",
            title: "Error al crear el crédito",
            description: error.message || "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  const amortizationTable = useMemo((): AmortizationRow[] => {
    if (!selectedProduct || term <= 0 || annualInterestRate < 0) {
        return [];
    }

    const principal = selectedProduct.price - downPayment;
    if (principal <= 0) return [];

    const isWeekly = paymentFrequency === "Semanal";
    const periods = term;
    const periodicRate = (annualInterestRate / 100) / (isWeekly ? 52 : 12);

    if (periodicRate === 0) {
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

  const financingAmount = selectedProduct ? selectedProduct.price - downPayment : 0;
  const totalPayments = amortizationTable.reduce((sum, row) => sum + row.paymentAmount, 0);
  const totalInterest = amortizationTable.reduce((sum, row) => sum + row.interest, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Financiar Producto
              </DialogTitle>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Venta a Crédito • Plan Personalizado
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleClose(false)}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Barra de progreso moderna */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Progreso</span>
            <span className="text-primary font-semibold">
              {selectedProduct && selectedClient && term > 0 && annualInterestRate >= 0 ? 3 : selectedProduct ? 1 : 0} de 3
            </span>
          </div>
          <div className="relative">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(selectedProduct && selectedClient && term > 0 && annualInterestRate >= 0 ? 100 : selectedProduct ? 33 : 0)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {['Producto', 'Términos', 'Cliente'].map((step, index) => {
                const isActive = index === 0 ? selectedProduct : index === 1 ? term > 0 && annualInterestRate >= 0 : selectedClient;
                return (
                  <div key={step} className="text-center flex-1">
                    <div className={`text-xs font-medium transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground/70'
                    }`}>
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogHeader>

        <DialogBody className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 min-h-full p-3 sm:p-6">
            {/* Left Column: Form Steps */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Step 1: Product Selection */}
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                <CardHeader className="pb-4 bg-primary/5 rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="font-bold text-primary">Paso 1: Seleccionar Producto</span>
                      <p className="text-sm text-muted-foreground font-normal">Elija el producto a financiar</p>
                    </div>
                    {!selectedProduct && (
                      <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-300">
                        Requerido
                      </Badge>
                    )}
                    {selectedProduct && (
                      <Badge variant="outline" className="ml-auto bg-green-100 text-green-800 border-green-300">
                        ✓ Completado
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Busque y seleccione el producto que desea financiar
                    </p>
                  </div>
                  
                  <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        role="combobox" 
                        className={cn(
                          "w-full justify-between h-12 text-left border-2 transition-all duration-200",
                          selectedProduct 
                            ? "border-green-300 bg-green-50 hover:bg-green-100" 
                            : "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
                        )}
                      >
                        {selectedProduct ? (
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-xs sm:text-sm">{selectedProduct.name}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">SKU: {selectedProduct.id}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <span className="text-primary font-medium">Buscar producto...</span>
                          </div>
                        )}
                        <ChevronsUpDown className="ml-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar por nombre o SKU..." className="h-8 sm:h-9 text-xs sm:text-sm" />
                        <CommandList className="max-h-48 sm:max-h-64">
                          <CommandEmpty className="text-xs sm:text-sm">No se encontró el producto.</CommandEmpty>
                          {allProducts.map((product) => (
                            <CommandItem key={product.id} onSelect={() => handleSelectProduct(product)} className="text-xs sm:text-sm">
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs sm:text-sm">{product.name}</span>
                                <Badge variant="secondary" className="text-xs">{formatCurrency(product.price ?? 0)}</Badge>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  
                  {selectedProduct && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">Precio del Producto</span>
                        </div>
                        <span className="text-2xl font-bold text-primary">{formatCurrency(selectedProduct?.price ?? 0)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Step 2: Terms */}
              <Card className={cn(
                "border-2 backdrop-blur-sm transition-all duration-300 hover:shadow-lg",
                selectedProduct 
                  ? "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/40 hover:shadow-primary/10" 
                  : "border-gray-200 bg-gray-50/50 opacity-60"
              )}>
                <CardHeader className={cn(
                  "pb-4 rounded-t-lg",
                  selectedProduct ? "bg-primary/5" : "bg-gray-100/50"
                )}>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className={cn(
                      "p-2 rounded-lg",
                      selectedProduct ? "bg-primary/20" : "bg-gray-200"
                    )}>
                      <Calculator className={cn(
                        "h-5 w-5",
                        selectedProduct ? "text-primary" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <span className={cn(
                        "font-bold",
                        selectedProduct ? "text-primary" : "text-gray-500"
                      )}>Paso 2: Definir Términos del Crédito</span>
                      <p className="text-sm text-muted-foreground font-normal">Configure las condiciones del financiamiento</p>
                    </div>
                    {!selectedProduct && (
                      <Badge variant="outline" className="ml-auto bg-gray-100 text-gray-600 border-gray-300">
                        Esperando...
                      </Badge>
                    )}
                    {selectedProduct && term > 0 && annualInterestRate >= 0 && (
                      <Badge variant="outline" className="ml-auto bg-green-100 text-green-800 border-green-300">
                        ✓ Completado
                      </Badge>
                    )}
                    {selectedProduct && (term === 0 || annualInterestRate < 0) && (
                      <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-300">
                        Requerido
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="downPayment" className="flex items-center gap-2 text-sm font-medium">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Enganche (Opcional)
                      </Label>
                      <Input 
                        id="downPayment" 
                        type="number" 
                        value={downPayment} 
                        onChange={e => setDownPayment(parseFloat(e.target.value) || 0)}
                        className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualInterestRate" className="flex items-center gap-2 text-sm font-medium">
                        <Percent className="h-4 w-4 text-primary" />
                        Tasa de Interés Anual (%)
                      </Label>
                      <Input 
                        id="annualInterestRate" 
                        type="number" 
                        step="0.01" 
                        value={annualInterestRate} 
                        onChange={e => setAnnualInterestRate(parseFloat(e.target.value) || 0)}
                        className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                        placeholder="12.00"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Frecuencia de Pago
                      </Label>
                      <Select value={paymentFrequency} onValueChange={(val: "Semanal" | "Mensual") => setPaymentFrequency(val)}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Semanal">Semanal</SelectItem>
                          <SelectItem value="Mensual">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="term" className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4 text-primary" />
                        Plazo ({paymentFrequency === "Semanal" ? "Semanas" : "Meses"})
                      </Label>
                      <Input 
                        id="term" 
                        type="number" 
                        value={term} 
                        onChange={e => setTerm(parseInt(e.target.value) || 0)}
                        className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                        placeholder="12"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3: Client Association */}
              <Card className={cn(
                "border-2 backdrop-blur-sm transition-all duration-300 hover:shadow-lg",
                selectedProduct && term > 0 && annualInterestRate >= 0
                  ? "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/40 hover:shadow-primary/10" 
                  : "border-gray-200 bg-gray-50/50 opacity-60"
              )}>
                <CardHeader className={cn(
                  "pb-4 rounded-t-lg",
                  selectedProduct && term > 0 && annualInterestRate >= 0 ? "bg-primary/5" : "bg-gray-100/50"
                )}>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className={cn(
                      "p-2 rounded-lg",
                      selectedProduct && term > 0 && annualInterestRate >= 0 ? "bg-primary/20" : "bg-gray-200"
                    )}>
                      <User className={cn(
                        "h-5 w-5",
                        selectedProduct && term > 0 && annualInterestRate >= 0 ? "text-primary" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <span className={cn(
                        "font-bold",
                        selectedProduct && term > 0 && annualInterestRate >= 0 ? "text-primary" : "text-gray-500"
                      )}>Paso 3: Asociar Cliente</span>
                      <p className="text-sm text-muted-foreground font-normal">Seleccione el cliente beneficiario</p>
                    </div>
                    {!(selectedProduct && term > 0 && annualInterestRate >= 0) && (
                      <Badge variant="outline" className="ml-auto bg-gray-100 text-gray-600 border-gray-300">
                        Esperando...
                      </Badge>
                    )}
                    {selectedProduct && term > 0 && annualInterestRate >= 0 && selectedClient && (
                      <Badge variant="outline" className="ml-auto bg-green-100 text-green-800 border-green-300">
                        ✓ Completado
                      </Badge>
                    )}
                    {selectedProduct && term > 0 && annualInterestRate >= 0 && !selectedClient && (
                      <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-300">
                        Requerido
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="flex-1 justify-between h-12 text-left">
                          {selectedClient ? (
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-purple-600" />
                              <div>
                                <div className="font-medium">{selectedClient.name}</div>
                                <div className="text-sm text-muted-foreground">{selectedClient.phone}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Buscar cliente existente...</span>
                          )}
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
                                <div className="flex flex-col">
                                  <span className="font-medium">{client.name}</span>
                                  <span className="text-sm text-muted-foreground">{client.phone}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button variant="secondary" onClick={handleNewClientClick} className="h-12 px-6">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nuevo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column: Payment Plan & Summary */}
            <div className="space-y-6">
              {/* Financing Summary */}
              <Card className="border border-border/50 bg-card/30 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Resumen de Financiamiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Precio del Producto</span>
                      <span className="font-semibold">{formatCurrency(selectedProduct?.price ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Enganche</span>
                      <span className="font-semibold">-{formatCurrency(downPayment ?? 0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Monto a Financiar</span>
                      <span className="text-xl font-bold text-primary">{formatCurrency(financingAmount ?? 0)}</span>
                    </div>
                    {amortizationTable.length > 0 && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total a Pagar</span>
                          <span className="font-semibold">{formatCurrency(totalPayments ?? 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Intereses</span>
                          <span className="font-semibold text-destructive">{formatCurrency(totalInterest ?? 0)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Plan */}
              <Card className="flex-1 border border-border/50 bg-card/30 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Plan de Pagos Calculado
                  </CardTitle>
                  <CardDescription>
                    {amortizationTable.length > 0 
                      ? `${amortizationTable.length} pagos ${paymentFrequency.toLowerCase()}es`
                      : "Completa los términos para ver el plan de pagos"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card/50 backdrop-blur-sm">
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
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
                            <TableRow key={row.paymentNumber} className="hover:bg-primary/5 transition-colors">
                              <TableCell className="font-medium">{row.paymentNumber}</TableCell>
                              <TableCell className="text-sm">{row.paymentDate}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(row.paymentAmount ?? 0)}</TableCell>
                              <TableCell className="text-right text-primary">{formatCurrency(row.principal ?? 0)}</TableCell>
                              <TableCell className="text-right text-destructive">{formatCurrency(row.interest ?? 0)}</TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(row.remainingBalance ?? 0)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <Calculator className="h-8 w-8 opacity-50" />
                                <span>Completa los términos para ver el plan de pagos</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogBody>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 border-t bg-card/50 backdrop-blur-sm p-6">
          <div className="flex gap-3 w-full justify-end">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading} className="px-6">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmSale} 
              disabled={!selectedProduct || !selectedClient || amortizationTable.length === 0 || isLoading || term <= 0 || annualInterestRate < 0}
              className="px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg hover:shadow-primary/25"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CreditCard className="mr-2 h-4 w-4" />
              Confirmar y Crear Crédito
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AddEditClientDialog
        isOpen={isNewClientDialogOpen}
        onOpenChange={setIsNewClientDialogOpen}
        client={null}
        onClientAdded={handleClientAdded}
        onClientUpdated={() => {}}
      />
    </Dialog>
  );
}

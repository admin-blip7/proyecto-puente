"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RepairOrder, Product, repairStatuses, RepairStatus, TicketSettings, LabelSettings } from "@/types";
import { updateRepairOrder, addPartToRepairOrder } from "@/lib/services/repairService";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, PlusCircle, Trash2, Printer } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { generateAndPrintLabels } from "@/lib/utils";
import JsBarcode from 'jsbarcode';


interface EditRepairDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: RepairOrder;
  onOrderUpdated: (order: RepairOrder) => void;
  allSpareParts: Product[];
  ticketSettings: TicketSettings;
  labelSettings: LabelSettings;
}

const formSchema = z.object({
  status: z.enum(repairStatuses),
  technicianNotes: z.string().optional(),
  laborCost: z.coerce.number().min(0, "El costo debe ser positivo."),
});

export default function EditRepairDialog({
  isOpen,
  onOpenChange,
  order,
  onOrderUpdated,
  allSpareParts,
  ticketSettings,
  labelSettings
}: EditRepairDialogProps) {
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: order.status,
      technicianNotes: order.technicianNotes || "",
      laborCost: order.laborCost || 0,
    },
  });
  
  useEffect(() => {
    form.reset({
      status: order.status,
      technicianNotes: order.technicianNotes || "",
      laborCost: order.laborCost || 0,
    })
  }, [order, form]);

  const filteredParts = useMemo(() => {
    if (!searchQuery) return [];
    return allSpareParts.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allSpareParts]);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
        let dataToUpdate: Partial<RepairOrder> = {};
        if (values.status !== order.status) dataToUpdate.status = values.status;
        if (values.technicianNotes !== order.technicianNotes) dataToUpdate.technicianNotes = values.technicianNotes;
        if (values.laborCost !== order.laborCost) {
            dataToUpdate.laborCost = values.laborCost;
            // Recalculate total price
            const partsPrice = order.partsUsed.reduce((sum, p) => sum + p.price * p.quantity, 0);
            dataToUpdate.totalPrice = partsPrice + values.laborCost;
            dataToUpdate.profit = dataToUpdate.totalPrice - order.totalCost;
        }

        if (Object.keys(dataToUpdate).length === 0) {
            toast({ title: "Sin cambios", description: "No se ha realizado ninguna modificación." });
            onOpenChange(false);
            return;
        }
        
        if (dataToUpdate.status === 'Completado') {
            dataToUpdate.completedAt = new Date();
        }

        await updateRepairOrder(order.id, dataToUpdate);

        const updatedOrder = { ...order, ...dataToUpdate };
        onOrderUpdated(updatedOrder);

        toast({
            title: "Orden Actualizada",
            description: "El estado de la orden ha sido actualizado.",
        });

        onOpenChange(false);
    } catch (error) {
      console.error("Error updating repair order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la orden.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPart = async (part: Product) => {
    if (!userProfile) {
        toast({ variant: 'destructive', title: "Error", description: 'No se pudo obtener el usuario.'});
        return;
    }
    setLoading(true);
    setPopoverOpen(false);
    setSearchQuery("");
    try {
        const updatedOrder = await addPartToRepairOrder(order, part, 1, userProfile.uid);
        onOrderUpdated(updatedOrder);
        toast({ title: "Refacción agregada", description: `Se agregó ${part.name} a la orden.`});
    } catch(error: any) {
        toast({ variant: 'destructive', title: "Error al agregar refacción", description: error.message});
    } finally {
        setLoading(false);
    }
  }

  const generateTicketHTML = () => {
    const { header, body, footer } = ticketSettings;
    return `...`; // Same as in PrintRepairDocumentsDialog
  };

  const generateLabelHTML = () => {
    const barcodeId = `barcode-${order.orderId}`;
    return `...`; // Same as in PrintRepairDocumentsDialog
  };

  const handlePrint = (type: 'ticket' | 'label') => {
    const contentGenerator = type === 'ticket' ? generateTicketHTML : generateLabelHTML;
    const isLabel = type === 'label';
    const printContent = contentGenerator();
    
    const printWindow = window.open('', 'PRINT', 'height=800,width=800');
    if (!printWindow) {
      alert("El navegador bloqueó la ventana de impresión.");
      return;
    }
    
    printWindow.document.write('<html><head><title>Imprimir</title>');
     if (isLabel) {
        printWindow.document.write(`
            <style>
                @page { size: ${labelSettings.width}mm ${labelSettings.height}mm; margin: 0; }
                body { margin: 0; padding: 0; }
            </style>
        `);
    }
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    
    if (isLabel) {
        try {
            JsBarcode(printWindow.document.getElementById(`barcode-${order.orderId}`), order.orderId, {
                format: 'CODE128',
                displayValue: false,
                height: labelSettings.barcodeHeight,
                width: 1.5,
                margin: 0,
            });
        } catch(e) { console.error(e); }
    }

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
  };
  
  const watchedLaborCost = form.watch('laborCost');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-row items-center justify-between flex-shrink-0 pr-6">
          <div>
            <DialogTitle>Orden de Reparación #{order.orderId}</DialogTitle>
            <DialogDescription>
              Revisa, actualiza el estado, añade notas y gestiona las refacciones utilizadas.
            </DialogDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handlePrint('ticket')}>
                    Reimprimir Ticket de Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePrint('label')}>
                    Reimprimir Etiqueta de Dispositivo
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-6 -mr-6">
          <Form {...form}>
            <form id="edit-repair-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Columna de Info */}
                  <div className="space-y-4 md:col-span-1">
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                          <p className="font-semibold">{order.customerName} ({order.customerPhone})</p>
                      </div>
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Dispositivo</p>
                          <p className="font-semibold">{order.deviceBrand} {order.deviceModel}</p>
                          <p className="text-sm font-mono">{order.deviceSerialIMEI}</p>
                      </div>
                      <div>
                          <p className="text-sm font-medium text-muted-foreground">Fecha de Recepción</p>
                          <p className="font-semibold">{format(order.createdAt, "dd MMM yyyy, HH:mm", { locale: es })}</p>
                      </div>
                       <div>
                          <p className="text-sm font-medium text-muted-foreground">Problema Reportado</p>
                          <p className="text-sm bg-muted p-2 rounded-md">{order.reportedIssue}</p>
                      </div>
                  </div>

                   {/* Columna de Formulario y Refacciones */}
                  <div className="space-y-6 md:col-span-2">
                      
                              <FormField
                              control={form.control}
                              name="status"
                              render={({ field }) => (
                                  <FormItem>
                                  <FormLabel>Estado de la Reparación</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Seleccione un estado..." />
                                      </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                      {repairStatuses.map((status) => (
                                          <SelectItem key={status} value={status}>
                                          {status}
                                          </SelectItem>
                                      ))}
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                                  </FormItem>
                              )}
                              />

                               <FormField
                                  control={form.control}
                                  name="technicianNotes"
                                  render={({ field }) => (
                                      <FormItem>
                                      <FormLabel>Notas del Técnico (Diagnóstico)</FormLabel>
                                      <FormControl>
                                          <Textarea
                                          placeholder="Diagnóstico, procedimiento realizado, etc."
                                          className="resize-y"
                                          rows={4}
                                          {...field}
                                          />
                                      </FormControl>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />

                              <div className="border rounded-lg p-4 space-y-4">
                                  <h4 className="font-semibold text-lg">Refacciones y Costos</h4>

                                  {order.partsUsed.length > 0 ? (
                                      <div className="space-y-2">
                                          {order.partsUsed.map(part => (
                                              <div key={part.productId} className="flex justify-between items-center text-sm">
                                                  <p>{part.name} (x{part.quantity})</p>
                                                  <p>${part.price.toFixed(2)}</p>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <p className="text-sm text-muted-foreground italic">No se han agregado refacciones.</p>
                                  )}
                                  <Command>
                                      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                                          <PopoverTrigger asChild>
                                              <Button variant="outline" className="w-full justify-start">
                                                  <PlusCircle className="mr-2 h-4 w-4" />
                                                  Agregar Refacción
                                              </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                                              <CommandInput 
                                                  placeholder="Buscar refacción..."
                                                  value={searchQuery}
                                                  onValueChange={setSearchQuery}
                                              />
                                              <CommandList>
                                                  <CommandEmpty>No se encontraron refacciones.</CommandEmpty>
                                                  {filteredParts.map(part => (
                                                      <CommandItem key={part.id} onSelect={() => handleSelectPart(part)} disabled={part.stock <= 0}>
                                                          {part.name} (Stock: {part.stock})
                                                      </CommandItem>
                                                  ))}
                                              </CommandList>
                                          </PopoverContent>
                                      </Popover>
                                  </Command>
                                  
                                  <FormField
                                      control={form.control}
                                      name="laborCost"
                                      render={({ field }) => (
                                          <FormItem>
                                          <FormLabel>Costo de Mano de Obra</FormLabel>
                                          <FormControl>
                                              <Input type="number" step="0.01" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                  
                                  <div className="space-y-2 text-sm font-medium">
                                       <div className="flex justify-between">
                                          <span>Subtotal Refacciones:</span>
                                          <span>${(order.totalPrice - order.laborCost).toFixed(2)}</span>
                                       </div>
                                       <div className="flex justify-between">
                                          <span>Mano de Obra:</span>
                                          <span>${Number(watchedLaborCost || 0).toFixed(2)}</span>
                                       </div>
                                        <hr />
                                       <div className="flex justify-between text-lg font-bold">
                                          <span>Total a Cobrar:</span>
                                          <span>${(order.partsUsed.reduce((sum, p) => sum + p.price * p.quantity, 0) + Number(watchedLaborCost || 0)).toFixed(2)}</span>
                                       </div>
                                       <div className="flex justify-between text-xs text-green-600">
                                          <span>Ganancia Estimada:</span>
                                          <span>${((order.partsUsed.reduce((sum, p) => sum + p.price * p.quantity, 0) + Number(watchedLaborCost || 0)) - order.totalCost).toFixed(2)}</span>
                                       </div>
                                  </div>
                              </div>
                  </div>
              </div>
            </form>
          </Form>
        </ScrollArea>
        
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
          </Button>
          <Button type="submit" form="edit-repair-form" disabled={loading}>
              {loading ? <><Loader2 className="animate-spin mr-2"/> Actualizando...</> : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

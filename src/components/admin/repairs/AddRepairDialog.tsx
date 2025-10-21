"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { RepairOrder } from "@/types";
import { Loader2, Wrench, Plus, Save, X, CloudUpload, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RepairTicket } from "./RepairTicket";
import { createRepairOrder } from "@/app/admin/repairs/actions";

interface AddRepairDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderAdded: (order: RepairOrder) => void;
}

const commonProblems = [
  { id: "screen", label: "Pantalla Rota" },
  { id: "battery", label: "Problemas de Batería" },
  { id: "water", label: "Daño por Agua" },
  { id: "camera", label: "Cámara Dañada" },
  { id: "charging", label: "Puerto de Carga" },
  { id: "speaker", label: "Altavoz/Micrófono" },
  { id: "button", label: "Botones Dañados" },
  { id: "software", label: "Problemas de Software" }
];

const formSchema = z.object({
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerPhone: z.string().min(1, "El teléfono es requerido."),
  deviceBrand: z.string().min(1, "La marca es requerida."),
  deviceModel: z.string().min(1, "El modelo es requerido."),
  deviceSerialIMEI: z.string().optional(),
  reportedIssue: z.string().optional(), // Hacerlo opcional ya que se construye automáticamente
  technicianNotes: z.string().optional(),
});

interface PartItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
}

interface ProblemItem {
  id: string;
  label: string;
  price: number;
}

export default function AddRepairDialog({ isOpen, onOpenChange, onOrderAdded }: AddRepairDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProblems, setSelectedProblems] = useState<ProblemItem[]>([]);
  const [customProblem, setCustomProblem] = useState("");
  const [customProblemPrice, setCustomProblemPrice] = useState("");
  const [selectedParts, setSelectedParts] = useState<PartItem[]>([]);
  const [customPart, setCustomPart] = useState("");
  const [customPartPrice, setCustomPartPrice] = useState("");
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showTicket, setShowTicket] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<RepairOrder | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      deviceBrand: "",
      deviceModel: "",
      deviceSerialIMEI: "",
      reportedIssue: "",
      technicianNotes: "",
    },
  });

  // Calcular totales
  const totalProblems = selectedProblems.reduce((sum, problem) => sum + problem.price, 0);
  const totalPartsRevenue = selectedParts.reduce((sum, part) => sum + (part.price * part.quantity), 0);
  const totalPartsCost = selectedParts.reduce((sum, part) => sum + (part.cost * part.quantity), 0);
  const totalLaborCost = totalProblems; // Problems are considered labor
  const totalCost = totalPartsCost + totalLaborCost;
  const totalPrice = totalPartsRevenue + totalLaborCost;
  const totalProfit = totalPrice - totalCost;

  const handleProblemToggle = (problem: any) => {
    setSelectedProblems(prev => {
      const exists = prev.find(p => p.id === problem.id);
      if (exists) {
        return prev.filter(p => p.id !== problem.id);
      } else {
        return [...prev, { ...problem, price: 0 }]; // Start with 0 price
      }
    });
  };

  const handleProblemPriceChange = (problemId: string, price: number) => {
    setSelectedProblems(prev => prev.map(p =>
      p.id === problemId ? { ...p, price } : p
    ));
  };

  const handleAddCustomProblem = () => {
    if (customProblem.trim()) {
      const newProblem: ProblemItem = {
        id: `custom-${Date.now()}`,
        label: customProblem.trim(),
        price: parseFloat(customProblemPrice) || 0
      };
      setSelectedProblems(prev => [...prev, newProblem]);
      setCustomProblem("");
      setCustomProblemPrice("");
    }
  };

  const handleAddPart = (partName: string) => {
    const existingPart = selectedParts.find(p => p.name === partName);
    if (existingPart) {
      setSelectedParts(prev => prev.map(p =>
        p.name === partName ? { ...p, quantity: p.quantity + 1 } : p
      ));
    } else {
      setSelectedParts(prev => [...prev, {
        id: `part-${Date.now()}`,
        name: partName,
        price: 0, // Start with 0 price
        cost: 0, // Start with 0 cost
        quantity: 1
      }]);
    }
  };

  const handlePartPriceChange = (partId: string, price: number) => {
    setSelectedParts(prev => prev.map(p =>
      p.id === partId ? { ...p, price } : p
    ));
  };

  const handlePartCostChange = (partId: string, cost: number) => {
    setSelectedParts(prev => prev.map(p =>
      p.id === partId ? { ...p, cost } : p
    ));
  };

  const handleAddCustomPart = () => {
    if (customPart.trim()) {
      const price = parseFloat(customPartPrice) || 0;
      const cost = Math.round(price * 0.7); // Default cost is 70% of price
      const existingPart = selectedParts.find(p => p.name === customPart.trim());
      if (existingPart) {
        setSelectedParts(prev => prev.map(p =>
          p.name === customPart.trim() ? { ...p, quantity: p.quantity + 1, price, cost } : p
        ));
      } else {
        setSelectedParts(prev => [...prev, {
          id: `part-${Date.now()}`,
          name: customPart.trim(),
          price,
          cost,
          quantity: 1
        }]);
      }
      setCustomPart("");
      setCustomPartPrice("");
    }
  };

  const handleRemovePart = (partId: string) => {
    setSelectedParts(prev => prev.filter(p => p.id !== partId));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedImages(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleTicketClose = () => {
    setShowTicket(false);
    setCreatedOrder(null);
    onOpenChange(false);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      // Construir el reportedIssue con los problemas seleccionados
      const problemsText = selectedProblems.map(p => `• ${p.label} - $${p.price.toFixed(2)}`).join('\n');
      const partsText = selectedParts.map(p => `• ${p.name} x${p.quantity} - $${p.price.toFixed(2)} c/u`).join('\n');
      const baseIssue = values.reportedIssue || "Problemas detectados por el cliente";
      const fullReportedIssue = `${baseIssue}\n\nProblemas Detectados:\n${problemsText}\n\nPiezas para Cambio:\n${partsText}`;

      // Crear partsUsed para el backend
      const partsUsed = selectedParts.map(part => ({
        productId: part.id,
        name: part.name,
        price: part.price,
        cost: part.cost,
        quantity: part.quantity,
      }));

      // Combine problems and parts for the ticket
      const servicesForTicket = [
        ...selectedProblems.map(p => ({
          productId: p.id,
          name: p.label,
          price: p.price,
          cost: 0, // Problems are labor, no cost
          quantity: 1
        })),
        ...selectedParts
      ];

      // Create FormData for server action
      const formData = new FormData();
      formData.append('customerName', values.customerName);
      formData.append('customerPhone', values.customerPhone);
      formData.append('deviceBrand', values.deviceBrand);
      formData.append('deviceModel', values.deviceModel);
      if (values.deviceSerialIMEI) {
        formData.append('deviceSerialIMEI', values.deviceSerialIMEI);
      }
      formData.append('reportedIssue', fullReportedIssue);
      if (values.technicianNotes) {
        formData.append('technicianNotes', values.technicianNotes);
      }
      formData.append('partsUsed', JSON.stringify(partsUsed));
      formData.append('totalPrice', totalPrice.toString());
      formData.append('laborCost', totalLaborCost.toString());
      formData.append('totalCost', totalCost.toString());
      formData.append('profit', totalProfit.toString());

      // Call server action
      const result = await createRepairOrder(formData);

      if (result.success && result.order) {
        // Create the order with combined services for ticket
        const orderWithServices = {
          ...result.order,
          partsUsed: servicesForTicket
        };

        setCreatedOrder(orderWithServices);
        onOrderAdded(result.order);
        toast({
          title: "Orden de Reparación Creada",
          description: `La orden #${result.order.orderId} ha sido creada exitosamente.`,
        });

        // Show ticket
        setShowTicket(true);

        // Reset form (but keep dialog open for ticket)
        form.reset();
        setSelectedProblems([]);
        setSelectedParts([]);
        setUploadedImages([]);
        setImagePreviews([]);
        setCustomProblem("");
        setCustomProblemPrice("");
        setCustomPart("");
        setCustomPartPrice("");
      } else {
        throw new Error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error("Error adding repair order:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la orden de reparación.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Wrench className="text-primary" />
              Nueva Orden de Reparación
            </DialogTitle>
            <DialogDescription>
              Complete los detalles del cliente, el dispositivo y los problemas detectados.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Información del Cliente y Dispositivo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Ana Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: +1 555 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deviceBrand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca del Dispositivo</FormLabel>
                      <FormControl>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary"
                          {...field}
                        >
                          <option value="">Seleccionar marca</option>
                          <option value="iPhone">iPhone</option>
                          <option value="Samsung">Samsung</option>
                          <option value="Xiaomi">Xiaomi</option>
                          <option value="Huawei">Huawei</option>
                          <option value="Google">Google Pixel</option>
                          <option value="Other">Otra</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deviceModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo del Dispositivo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: iPhone 13 Pro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* IMEI/Serie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deviceSerialIMEI"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>IMEI / Número de Serie</FormLabel>
                      <FormControl>
                        <Input placeholder="15 dígitos IMEI o número de serie" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Problemas Detectados */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <FormLabel className="text-base font-medium">Problemas Detectados</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const randomProblems = commonProblems
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 2);
                      setSelectedProblems(randomProblems);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Sugerir Comunes
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      {commonProblems.map((problem) => {
                        const selectedProblem = selectedProblems.find(p => p.id === problem.id);
                        return (
                          <div key={problem.id} className="flex items-center gap-2 p-2 border rounded-lg">
                            <Checkbox
                              id={problem.id}
                              checked={!!selectedProblem}
                              onCheckedChange={() => handleProblemToggle(problem)}
                            />
                            <label
                              htmlFor={problem.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                            >
                              {problem.label}
                            </label>
                            {selectedProblem && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={selectedProblem.price || ""}
                                  onChange={(e) => handleProblemPriceChange(problem.id, parseFloat(e.target.value) || 0)}
                                  className="w-24 h-8 text-sm"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Input
                        placeholder="Añadir otro problema..."
                        value={customProblem}
                        onChange={(e) => setCustomProblem(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomProblem())}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Precio"
                        value={customProblemPrice}
                        onChange={(e) => setCustomProblemPrice(e.target.value)}
                        className="w-24"
                        min="0"
                        step="0.01"
                      />
                      <Button type="button" onClick={handleAddCustomProblem} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Custom problems with prices */}
                    {selectedProblems.filter(p => p.id.startsWith('custom-')).map((problem) => (
                      <div key={problem.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm font-medium flex-1">{problem.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={problem.price || ""}
                            onChange={(e) => handleProblemPriceChange(problem.id, parseFloat(e.target.value) || 0)}
                            className="w-24 h-8 text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Piezas a Ordenar para Cambio */}
              <div>
                <FormLabel className="text-base font-medium">Piezas a Ordenar para Cambio</FormLabel>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleAddPart("Reemplazo de pantalla")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Pantalla
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleAddPart("Instalación de batería")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Batería
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleAddPart("Reemplazo de cámara")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Cámara
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => handleAddPart("Reparación de puerto de carga")}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Puerto Carga
                  </Button>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {selectedParts.map((part) => (
                        <div key={part.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{part.name} x{part.quantity}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePart(part.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Costo (oculto)</label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={part.cost || ""}
                                onChange={(e) => handlePartCostChange(part.id, parseFloat(e.target.value) || 0)}
                                className="w-full h-8 text-sm"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Precio Cliente</label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={part.price || ""}
                                onChange={(e) => handlePartPriceChange(part.id, parseFloat(e.target.value) || 0)}
                                className="w-full h-8 text-sm"
                                min="0"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Ganancia</label>
                              <div className="w-full h-8 border rounded px-2 flex items-center text-sm font-semibold text-green-600">
                                ${((part.price - part.cost) * part.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-2 pt-2 border-t">
                        <Input
                          placeholder="Nombre de la pieza..."
                          value={customPart}
                          onChange={(e) => setCustomPart(e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Precio $"
                          value={customPartPrice}
                          onChange={(e) => setCustomPartPrice(e.target.value)}
                          className="w-24"
                          min="0"
                          step="0.01"
                        />
                        <Button type="button" onClick={handleAddCustomPart} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Costo de Piezas:</span>
                        <span>${totalPartsCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Costo de Mano de Obra:</span>
                        <span>${totalLaborCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Costo Total:</span>
                        <span>${totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Precio Cliente:</span>
                        <span className="text-primary">${totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-green-600">
                        <span>Ganancia Estimada:</span>
                        <span>${totalProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fotos del Dispositivo */}
              <div>
                <FormLabel className="text-base font-medium">Fotos del Dispositivo</FormLabel>
                <div
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CloudUpload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Arrastra y suelta tus fotos aquí o <span className="text-primary font-bold">haz click para seleccionar</span>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notas Adicionales */}
              <FormField
                control={form.control}
                name="technicianNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionales</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Cualquier información adicional sobre el dispositivo o la reparación..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Problema Reportado (oculto, se construye automáticamente) */}
              <FormField
                control={form.control}
                name="reportedIssue"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      Guardando Orden...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Orden
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      {createdOrder && (
        <RepairTicket
          isOpen={showTicket}
          onClose={handleTicketClose}
          repairOrder={createdOrder}
        />
      )}
    </>
  );
}
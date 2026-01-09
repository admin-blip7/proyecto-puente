"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { RepairOrder, RepairPart, CRMClient } from "@/types";
import { Loader2, Wrench, Plus, Save, X, CloudUpload, CheckCircle, ChevronLeft, ChevronRight, User, Smartphone, AlertTriangle, Box, FileText, Search, History, RefreshCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RepairTicket } from "./RepairTicket";
import { createRepairOrder } from "@/app/admin/repairs/actions";
import { searchClients, getClientRepairs } from "@/app/admin/repairs/client-actions";
import { COMMON_MODELS, COMMON_PROBLEMS, BASE_PRICES, QUICK_ACTIONS } from "./repair-constants";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddRepairDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderAdded: (order: RepairOrder) => void;
}

const formSchema = z.object({
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerPhone: z.string().min(1, "El teléfono es requerido."),
  deviceBrand: z.string().min(1, "La marca es requerida."),
  deviceModel: z.string().min(1, "El modelo es requerido."),
  deviceSerialIMEI: z.string().optional(),
  reportedIssue: z.string().optional(),
  technicianNotes: z.string().optional(),
  isDraft: z.boolean().default(false),
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

const STEPS = [
  { id: 1, title: 'Cliente', icon: User },
  { id: 2, title: 'Dispositivo', icon: Smartphone },
  { id: 3, title: 'Problemas', icon: AlertTriangle },
  { id: 4, title: 'Piezas', icon: Box },
  { id: 5, title: 'Resumen', icon: FileText },
];

export default function AddRepairDialog({ isOpen, onOpenChange, onOrderAdded }: AddRepairDialogProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for complex data
  const [selectedProblems, setSelectedProblems] = useState<ProblemItem[]>([]);
  const [selectedParts, setSelectedParts] = useState<PartItem[]>([]);
  const [customProblem, setCustomProblem] = useState("");
  const [customProblemPrice, setCustomProblemPrice] = useState("");
  const [customPart, setCustomPart] = useState("");
  const [customPartPrice, setCustomPartPrice] = useState("");

  // Images
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Ticket
  const [showTicket, setShowTicket] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<RepairOrder | null>(null);

  // Client Search
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<CRMClient[]>([]);
  const [searchingClient, setSearchingClient] = useState(false);
  const [previousRepairs, setPreviousRepairs] = useState<RepairOrder[]>([]);

  // Form
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
      isDraft: false,
    },
  });

  // Load draft functionality
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem('repair_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Only prompt or load if it's recent? For now, just load state if user wants?
          // Simplification: Auto-load fields if empty
          if (!form.getValues('customerName')) {
            form.reset(parsed.form);
            setSelectedProblems(parsed.selectedProblems || []);
            setSelectedParts(parsed.selectedParts || []);
            setStep(parsed.step || 1);
          }
        } catch (e) {
          console.error("Error loading draft", e);
        }
      }
    }
  }, [isOpen]);

  // Save draft functionality
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const draft = {
          form: form.getValues(),
          selectedProblems,
          selectedParts,
          step
        };
        localStorage.setItem('repair_draft', JSON.stringify(draft));
      }, 1000); // Debounce save
      return () => clearTimeout(timer);
    }
  }, [form.watch(), selectedProblems, selectedParts, step, isOpen]);

  // Search clients effect
  useEffect(() => {
    if (clientQuery.length >= 2) {
      setSearchingClient(true);
      const timer = setTimeout(() => {
        searchClients(clientQuery).then(results => {
          setClientResults(results);
          setSearchingClient(false);
        });
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setClientResults([]);
    }
  }, [clientQuery]);

  // Totals Calculation
  const totalProblems = selectedProblems.reduce((sum, problem) => sum + problem.price, 0);
  const totalPartsRevenue = selectedParts.reduce((sum, part) => sum + (part.price * part.quantity), 0);
  const totalPartsCost = selectedParts.reduce((sum, part) => sum + (part.cost * part.quantity), 0);
  const totalLaborCost = totalProblems;
  const totalCost = totalPartsCost + totalLaborCost;
  const totalPrice = totalPartsRevenue + totalLaborCost;
  const totalProfit = totalPrice - totalCost;

  // Handlers
  const handleClientSelect = async (client: CRMClient) => {
    form.setValue("customerName", `${client.firstName} ${client.lastName}`);
    form.setValue("customerPhone", client.phone || client.secondaryPhone || "");
    setClientSearchOpen(false);

    // Fetch previous repairs to maybe auto-fill device?
    if (client.phone) {
      const repairs = await getClientRepairs(client.phone);
      setPreviousRepairs(repairs);
      if (repairs.length > 0) {
        toast({
          title: "Cliente Recurrente found",
          description: `Este cliente tiene ${repairs.length} reparaciones anteriores.`,
        });
      }
    }
  };

  const fillDeviceFromHistory = (repair: RepairOrder) => {
    form.setValue("deviceBrand", repair.deviceBrand);
    form.setValue("deviceModel", repair.deviceModel);
    form.setValue("deviceSerialIMEI", repair.deviceSerialIMEI);
    toast({ title: "Datos copiados", description: "Se copiaron los datos del dispositivo de la reparación anterior." });
  };

  const handleNext = async () => {
    const fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate.push("customerName", "customerPhone");
    if (step === 2) fieldsToValidate.push("deviceBrand", "deviceModel");

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleProblemToggle = (problemId: string) => {
    const problemDef = COMMON_PROBLEMS.find(p => p.id === problemId);
    if (!problemDef) return;

    setSelectedProblems(prev => {
      const exists = prev.find(p => p.id === problemId);
      if (exists) {
        return prev.filter(p => p.id !== problemId);
      } else {
        // Smart price suggestion
        const suggestedPrice = BASE_PRICES[problemId] || 0;
        return [...prev, { id: problemDef.id, label: problemDef.label, price: suggestedPrice }];
      }
    });
  };

  const handleAddCustomProblem = () => {
    if (customProblem.trim()) {
      setSelectedProblems(prev => [...prev, {
        id: `custom-${Date.now()}`,
        label: customProblem.trim(),
        price: parseFloat(customProblemPrice) || 0
      }]);
      setCustomProblem("");
      setCustomProblemPrice("");
    }
  };

  const handleAddPart = (partName: string, priceOverride?: number) => {
    setSelectedParts(prev => {
      const existing = prev.find(p => p.name === partName);
      if (existing) {
        return prev.map(p => p.name === partName ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, {
        id: `part-${Date.now()}`,
        name: partName,
        price: priceOverride || 0,
        cost: 0,
        quantity: 1
      }];
    });
  };

  const handleAddCustomPart = () => {
    if (customPart.trim()) {
      const price = parseFloat(customPartPrice) || 0;
      const cost = Math.round(price * 0.7);
      handleAddPart(customPart.trim(), price);
      setCustomPart("");
      setCustomPartPrice("");
    }
  };

  const applyQuickAction = (action: any) => {
    // Find problem
    const problemDef = COMMON_PROBLEMS.find(p => p.label === action.problem) || { id: 'quick', label: action.problem };

    setSelectedProblems(prev => {
      if (prev.find(p => p.label === action.problem)) return prev;
      return [...prev, { id: problemDef.id as string, label: action.problem, price: action.price }];
    });

    // If action implies a part (e.g., Screen), try to add it
    if (action.problem.includes("Pantalla")) handleAddPart("Pantalla Nueva", action.price * 0.5); // Guess
    if (action.problem.includes("Batería")) handleAddPart("Batería Nueva", action.price * 0.4); // Guess

    toast({ title: "Acción Rápida Aplicada", description: `Se agregó ${action.label}` });
  };

  const onSubmit = async () => {
    setLoading(true);
    try {
      const values = form.getValues();

      const problemsText = selectedProblems.map(p => `• ${p.label} - $${p.price.toFixed(2)}`).join('\n');
      const partsText = selectedParts.map(parts => `• ${parts.name} x${parts.quantity} - $${parts.price.toFixed(2)} c/u`).join('\n');
      const baseIssue = values.reportedIssue || "Problemas detectados por el cliente";
      const fullReportedIssue = `${baseIssue}\n\nProblemas Detectados:\n${problemsText}\n\nPiezas para Cambio:\n${partsText}`;

      const partsUsedForBackend = selectedParts.map(part => ({
        productId: part.id,
        name: part.name,
        price: part.price,
        cost: part.cost,
        quantity: part.quantity,
      }));

      const servicesForTicket: RepairPart[] = [
        ...selectedProblems.map(p => ({
          productId: p.id,
          name: p.label,
          price: p.price,
          cost: 0,
          quantity: 1
        })),
        ...selectedParts.map(part => ({
          productId: part.id,
          name: part.name,
          price: part.price,
          cost: part.cost,
          quantity: part.quantity
        }))
      ];

      const formData = new FormData();
      formData.append('customerName', values.customerName);
      formData.append('customerPhone', values.customerPhone);
      formData.append('deviceBrand', values.deviceBrand);
      formData.append('deviceModel', values.deviceModel);
      formData.append('deviceSerialIMEI', values.deviceSerialIMEI || '');
      formData.append('reportedIssue', fullReportedIssue);
      formData.append('technicianNotes', values.technicianNotes || '');
      formData.append('partsUsed', JSON.stringify(partsUsedForBackend));
      formData.append('totalPrice', totalPrice.toString());
      formData.append('laborCost', totalLaborCost.toString());
      formData.append('totalCost', totalCost.toString());
      formData.append('profit', totalProfit.toString());

      const result = await createRepairOrder(formData);

      if (result.success && result.order) {
        const orderWithServices = { ...result.order, partsUsed: servicesForTicket };
        setCreatedOrder(orderWithServices);
        onOrderAdded(result.order);
        toast({ title: "Orden Creada", description: "Reparación registrada exitosamente." });
        setShowTicket(true);
        // Clear draft
        localStorage.removeItem('repair_draft');
        handleReset();
      } else {
        throw new Error(result.error || "Failed");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear la orden." });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.reset();
    setSelectedProblems([]);
    setSelectedParts([]);
    setStep(1);
    setPreviousRepairs([]);
  };

  const handleClose = () => {
    if (step > 1 && !createdOrder) {
      if (!confirm("Tiene una reparación en progreso. Se guardará como borrador. ¿Salir?")) return;
    }
    onOpenChange(false);
  };

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (step < 5) handleNext();
        else onSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Wrench className="w-5 h-5 text-primary" />
                Nueva Reparación
              </DialogTitle>
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => (
                  <div key={s.id} className="flex items-center">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors",
                      step === s.id ? "bg-primary text-primary-foreground" :
                        step > s.id ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {step > s.id ? <CheckCircle className="w-5 h-5" /> : s.id}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn("w-6 h-0.5 mx-1", step > s.id ? "bg-green-500" : "bg-muted")} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Form {...form}>
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <User className="w-5 h-5" /> Datos del Cliente
                      </h3>
                      <Badge variant="outline">Paso 1 de 5</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Nombre del Cliente</FormLabel>
                            <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      placeholder="Buscar o escribir nombre..."
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        setClientQuery(e.target.value);
                                        setClientSearchOpen(true);
                                      }}
                                      autoComplete="off"
                                    />
                                    {searchingClient && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                                  </div>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandList>
                                    {clientResults.length > 0 ? (
                                      <CommandGroup heading="Clientes Encontrados">
                                        {clientResults.map(client => (
                                          <CommandItem key={client.id} onSelect={() => handleClientSelect(client)} className="cursor-pointer">
                                            <User className="mr-2 h-4 w-4" />
                                            <div className="flex flex-col">
                                              <span>{client.firstName} {client.lastName}</span>
                                              <span className="text-xs text-muted-foreground">{client.phone}</span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    ) : (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                        {clientQuery.length < 2 ? "Escribe para buscar..." : "No se encontraron clientes. Se creará uno nuevo."}
                                      </div>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input placeholder="+52 ..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {previousRepairs.length > 0 && (
                      <Card className="bg-muted/30 border-dashed">
                        <CardContent className="pt-4">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <History className="w-4 h-4" /> Historial Reciente
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {previousRepairs.slice(0, 3).map(rep => (
                              <Badge
                                key={rep.id}
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                                onClick={() => fillDeviceFromHistory(rep)}
                              >
                                <RefreshCcw className="w-3 h-3 mr-1" />
                                {rep.deviceBrand} {rep.deviceModel} ({new Date(rep.createdAt).toLocaleDateString()})
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Smartphone className="w-5 h-5" /> Dispositivo
                    </h3>
                    <Badge variant="outline">Paso 2 de 5</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="deviceBrand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marca</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                              onChange={e => {
                                field.onChange(e);
                                form.setValue('deviceModel', ''); // Reset model
                              }}
                            >
                              <option value="">Selecciona una marca</option>
                              {Object.keys(COMMON_MODELS).map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                              ))}
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
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            {COMMON_MODELS[form.watch('deviceBrand')] ? (
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...field}
                              >
                                <option value="">Selecciona un modelo</option>
                                {COMMON_MODELS[form.watch('deviceBrand')].map(model => (
                                  <option key={model} value={model}>{model}</option>
                                ))}
                                <option value="other">Otro (Escribir manual)</option>
                              </select>
                            ) : (
                              <Input placeholder="Modelo específico" {...field} />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deviceSerialIMEI"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>IMEI / Serie (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Escáner o manual..." {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> Problemas y Diagnóstico
                    </h3>
                    <Badge variant="outline">Paso 3 de 5</Badge>
                  </div>

                  <FormLabel>Acciones Rápidas</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {QUICK_ACTIONS.map((action, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100"
                        onClick={(e) => { e.preventDefault(); applyQuickAction(action); }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> {action.label} (${action.price})
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {COMMON_PROBLEMS.map(prob => {
                      const isSelected = selectedProblems.some(p => p.id === prob.id);
                      return (
                        <div key={prob.id} className={cn("border rounded-lg p-3 cursor-pointer transition-all hover:border-primary", isSelected ? "bg-primary/5 border-primary ring-1 ring-primary" : "")} onClick={() => handleProblemToggle(prob.id)}>
                          <div className="flex items-start gap-2">
                            <Checkbox checked={isSelected} />
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{prob.label}</span>
                              {isSelected && (
                                <Input
                                  type="number"
                                  className="h-7 w-24 mt-2 text-xs"
                                  onClick={e => e.stopPropagation()}
                                  value={selectedProblems.find(p => p.id === prob.id)?.price}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setSelectedProblems(prev => prev.map(p => p.id === prob.id ? { ...p, price: val } : p));
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 items-end pt-4 border-t">
                    <div className="flex-1">
                      <FormLabel>Problema Personalizado</FormLabel>
                      <Input value={customProblem} onChange={e => setCustomProblem(e.target.value)} placeholder="Descripción..." />
                    </div>
                    <div className="w-24">
                      <FormLabel>Precio</FormLabel>
                      <Input type="number" value={customProblemPrice} onChange={e => setCustomProblemPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <Button type="button" onClick={handleAddCustomProblem} size="icon"><Plus className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Box className="w-5 h-5" /> Refacciones y Fotos
                    </h3>
                    <Badge variant="outline">Paso 4 de 5</Badge>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <FormLabel>Agregar Refacción</FormLabel>
                      <Input value={customPart} onChange={e => setCustomPart(e.target.value)} placeholder="Nombre de la pieza..." />
                    </div>
                    <div className="w-24">
                      <FormLabel>Precio Cl.</FormLabel>
                      <Input type="number" value={customPartPrice} onChange={e => setCustomPartPrice(e.target.value)} placeholder="0.00" />
                    </div>
                    <Button type="button" onClick={handleAddCustomPart} size="icon"><Plus className="w-4 h-4" /></Button>
                  </div>

                  {selectedParts.length > 0 && (
                    <div className="space-y-2">
                      {selectedParts.map(part => (
                        <div key={part.id} className="flex items-center justify-between p-3 border rounded bg-muted/20">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">x{part.quantity}</Badge>
                            <span className="font-medium">{part.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-green-600">${(part.price * part.quantity).toFixed(2)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setSelectedParts(p => p.filter(x => x.id !== part.id))}><X className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <FormLabel>Notas Técnicas</FormLabel>
                    <Textarea {...form.register('technicianNotes')} placeholder="Detalles ocultos para el cliente..." className="mt-2" />
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="w-5 h-5" /> Resumen Final
                    </h3>
                    <Badge variant="outline">Paso 5 de 5</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                      <p className="text-muted-foreground font-medium">Cliente</p>
                      <p className="text-lg font-bold">{form.getValues('customerName')}</p>
                      <p>{form.getValues('customerPhone')}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-2">
                      <p className="text-muted-foreground font-medium">Dispositivo</p>
                      <p className="text-lg font-bold">{form.getValues('deviceBrand')} {form.getValues('deviceModel')}</p>
                      <p className="text-muted-foreground">{form.getValues('deviceSerialIMEI') || 'Sin IMEI'}</p>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">Detalle de Costos</div>
                    <div className="p-4 space-y-2">
                      {selectedProblems.map(p => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span>{p.label} (Mano de obra)</span>
                          <span>${p.price.toFixed(2)}</span>
                        </div>
                      ))}
                      {selectedParts.map(p => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span>{p.name} x{p.quantity}</span>
                          <span>${(p.price * p.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2 flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span className="text-primary">${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <p>Verifique los datos antes de guardar. Se generará una orden de reparación y se imprimirá el ticket automáticamente si está configurado.</p>
                  </div>
                </div>
              )}
            </Form>
          </div>

          <DialogFooter className="border-t p-4 flex items-center justify-between sm:justify-between w-full bg-muted/10">
            <Button variant="ghost" onClick={handleClose} type="button">Cancelar</Button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} type="button">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                </Button>
              )}
              {step < 5 ? (
                <Button onClick={handleNext} type="button">
                  Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={onSubmit} disabled={loading} className="px-8 bg-green-600 hover:bg-green-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Confirmar Orden
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createdOrder && (
        <RepairTicket
          isOpen={showTicket}
          onClose={() => {
            setShowTicket(false);
            setCreatedOrder(null);
            onOpenChange(false);
          }}
          repairOrder={createdOrder}
        />
      )}
    </>
  );
}
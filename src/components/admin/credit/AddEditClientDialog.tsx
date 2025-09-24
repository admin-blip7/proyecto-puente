"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ClientProfile } from "@/types";
import { addClient, uploadClientDocument } from "@/lib/services/creditService";
import { Loader2, Calendar as CalendarIcon, Upload } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface AddEditClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientProfile | null;
  onClientAdded: (client: ClientProfile) => void;
  onClientUpdated: (client: ClientProfile) => void;
}

const formSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
    phone: z.string().min(10, "El teléfono debe tener al menos 10 dígitos."),
    address: z.string().min(10, "La dirección es requerida."),
    curp: z.string().optional(),
    socialMedia: z.object({
        facebook: z.string().optional(),
        instagram: z.string().optional(),
        whatsapp: z.string().optional(),
    }).optional(),
    employmentInfo: z.object({
        workplace: z.string().min(3, "El lugar de trabajo es requerido."),
        workPhone: z.string().min(7, "El teléfono del trabajo es requerido."),
    }),
    creditLimit: z.coerce.number().min(0, "El límite no puede ser negativo."),
    paymentDueDate: z.date({ required_error: "La fecha de pago es requerida."}),
    interestRate: z.coerce.number().min(0, "La tasa de interés no puede ser negativa."),
});

export default function AddEditClientDialog({
  isOpen,
  onOpenChange,
  client,
  onClientAdded,
  onClientUpdated,
}: AddEditClientDialogProps) {
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [idPreview, setIdPreview] = useState<string | undefined>(client?.documents?.idUrl);
    const idFileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const isEditMode = !!client;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && client) {
                form.reset({
                    name: client.name,
                    phone: client.phone,
                    address: client.address,
                    curp: client.curp || "",
                    socialMedia: {
                        facebook: client.socialMedia?.facebook || "",
                        instagram: client.socialMedia?.instagram || "",
                        whatsapp: client.socialMedia?.whatsapp || "",
                    },
                    employmentInfo: client.employmentInfo,
                    creditLimit: client.creditAccount?.creditLimit,
                    paymentDueDate: client.creditAccount?.paymentDueDate,
                    interestRate: client.creditAccount?.interestRate,
                });
                setIdPreview(client.documents?.idUrl);
            } else {
                form.reset({
                    name: "",
                    phone: "",
                    address: "",
                    curp: "",
                    socialMedia: { facebook: "", instagram: "", whatsapp: ""},
                    employmentInfo: { workplace: "", workPhone: "" },
                    creditLimit: 0,
                    paymentDueDate: new Date(),
                    interestRate: 25,
                });
                setIdPreview(undefined);
            }
        }
    }, [isOpen, client, isEditMode, form]);

    const handleIdUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !client) return;

        setIsUploading(true);
        try {
            const downloadURL = await uploadClientDocument(client.id, 'idUrl', file);
            setIdPreview(downloadURL);
            onClientUpdated({ ...client, documents: { ...client.documents, idUrl: downloadURL }});
            toast({
                title: "Documento Subido",
                description: "La credencial del cliente ha sido guardada."
            });
        } catch (error) {
            console.error("Error uploading ID:", error);
            toast({
                variant: "destructive",
                title: "Error de Subida",
                description: "No se pudo guardar la imagen de la credencial."
            })
        } finally {
            setIsUploading(false);
        }
    }


    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            if (isEditMode) {
                toast({ 
                    title: "Función no disponible aquí", 
                    description: "La edición completa se realizará en el perfil del cliente.",
                    variant: "default"
                });
            } else {
                const clientData = {
                    name: values.name,
                    phone: values.phone,
                    address: values.address,
                    curp: values.curp,
                    socialMedia: values.socialMedia,
                    employmentInfo: values.employmentInfo,
                };
                const newClientProfile = await addClient(clientData, values.creditLimit, values.paymentDueDate, values.interestRate);
                onClientAdded(newClientProfile);
                toast({ title: "Cliente Creado", description: `Se ha creado el cliente ${values.name} con un límite de crédito.`});
            }
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Error processing client:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: isEditMode ? "No se pudo actualizar el cliente." : "No se pudo crear el cliente.",
            });
        } finally {
            setLoading(false);
        }
    };
    
return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl w-[92vw] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>{isEditMode ? "Editar Cliente a Crédito" : "Agregar Nuevo Cliente a Crédito"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles del cliente y su cuenta." : "Completa la información para crear un nuevo cliente y su línea de crédito."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-6 py-4 space-y-6">
                    <div>
                        <h4 className="font-semibold text-lg mb-3">Información Personal</h4>
                        <div className="space-y-4">
                            <FormField name="name" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField name="phone" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Teléfono Celular</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField name="address" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Dirección Particular</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField name="curp" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>CURP (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h4 className="font-semibold text-lg mb-3">Redes Sociales (Opcional)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="socialMedia.facebook" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Facebook</FormLabel><FormControl><Input placeholder="ej: juan.perez" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField name="socialMedia.instagram" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Instagram</FormLabel><FormControl><Input placeholder="ej: @juan.perez" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField name="socialMedia.whatsapp" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </div>
                    
                    <Separator />

                    <div>
                        <h4 className="font-semibold text-lg mb-3">Información Laboral</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="employmentInfo.workplace" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Lugar de Trabajo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField name="employmentInfo.workPhone" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Teléfono del Trabajo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                        <h4 className="font-semibold text-lg mb-3">Documentos</h4>
                        {idPreview && isEditMode && (
                           <div className="mb-4">
                             <a href={idPreview} target="_blank" rel="noopener noreferrer">
                                <Image src={idPreview} alt="Vista previa de ID" width={200} height={120} className="rounded-md object-cover border" />
                             </a>
                           </div>
                        )}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-full">
                                        <Button type="button" variant="outline" className="w-full" onClick={() => idFileInputRef.current?.click()} disabled={!isEditMode || isUploading}>
                                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                            {isUploading ? "Subiendo..." : (idPreview ? "Reemplazar Credencial (INE)" : "Subir Credencial (INE)")}
                                        </Button>
                                        <input ref={idFileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleIdUpload} disabled={!isEditMode || isUploading} />
                                    </div>
                                </TooltipTrigger>
                                {!isEditMode && (
                                    <TooltipContent>
                                        <p>Guarda el cliente primero para poder subir documentos.</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    <Separator />

                    <div>
                        <h4 className="font-semibold text-lg mb-3">Información del Crédito</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField name="creditLimit" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Límite de Crédito</FormLabel><FormControl><Input type="number" step="100" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField name="interestRate" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Tasa Interés Anual (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="paymentDueDate" render={({ field }) => (
                            <FormItem className="flex flex-col mt-4"><FormLabel>Próxima Fecha de Pago</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}/>
                    </div>
                </div>
            </ScrollArea>
            <DialogFooter className="px-6 pt-3 pb-6 border-t flex-shrink-0">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                <Button type="submit" disabled={loading || isUploading}>
                    {loading ? <><Loader2 className="animate-spin mr-2"/> Guardando...</> : (isEditMode ? "Guardar Cambios" : "Crear Cliente")}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
);
}

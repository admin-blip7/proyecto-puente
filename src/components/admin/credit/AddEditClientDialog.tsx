"use client";

import { useState, useEffect } from "react";
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
import { addClient } from "@/lib/services/creditService";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    employmentInfo: z.object({
        workplace: z.string().min(3, "El lugar de trabajo es requerido."),
        workPhone: z.string().min(7, "El teléfono del trabajo es requerido."),
    }),
    creditLimit: z.coerce.number().min(0, "El límite no puede ser negativo."),
    paymentDueDate: z.date({ required_error: "La fecha de pago es requerida."}),
});

export default function AddEditClientDialog({
  isOpen,
  onOpenChange,
  client,
  onClientAdded,
  onClientUpdated,
}: AddEditClientDialogProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    const isEditMode = !!client;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                form.reset({
                    name: client.name,
                    phone: client.phone,
                    address: client.address,
                    employmentInfo: client.employmentInfo,
                    creditLimit: client.creditAccount?.creditLimit,
                    paymentDueDate: client.creditAccount?.paymentDueDate,
                });
            } else {
                form.reset({
                    name: "",
                    phone: "",
                    address: "",
                    employmentInfo: { workplace: "", workPhone: "" },
                    creditLimit: 0,
                    paymentDueDate: new Date(),
                });
            }
        }
    }, [isOpen, client, isEditMode, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            if (isEditMode) {
                // TODO: Implement update logic in a dedicated profile page
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
                    employmentInfo: values.employmentInfo,
                };
                const newClientProfile = await addClient(clientData, values.creditLimit, values.paymentDueDate);
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
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? "Editar Cliente a Crédito" : "Agregar Nuevo Cliente a Crédito"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Modifica los detalles del cliente y su cuenta." : "Completa la información para crear un nuevo cliente y su línea de crédito."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow min-h-0">
                        <ScrollArea className="flex-grow">
                            <div className="space-y-4 py-4 pr-6">
                                <h4 className="font-semibold text-lg">Información Personal</h4>
                                <FormField name="name" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="phone" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Teléfono Celular</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="address" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Dirección Particular</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                
                                <h4 className="font-semibold text-lg pt-4 border-t">Información Laboral</h4>
                                <FormField name="employmentInfo.workplace" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Lugar de Trabajo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="employmentInfo.workPhone" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Teléfono del Trabajo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>

                                <h4 className="font-semibold text-lg pt-4 border-t">Información del Crédito</h4>
                                <FormField name="creditLimit" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Límite de Crédito</FormLabel><FormControl><Input type="number" step="100" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="paymentDueDate" render={({ field }) => (
                                    <FormItem className="flex flex-col"><FormLabel>Próxima Fecha de Pago</FormLabel>
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
                        </ScrollArea>
                        
                        <DialogFooter className="pt-6 border-t flex-shrink-0">
                            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <><Loader2 className="animate-spin mr-2"/> Guardando...</> : (isEditMode ? "Guardar Cambios" : "Crear Cliente")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

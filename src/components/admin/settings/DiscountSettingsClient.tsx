"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DiscountSettings, DiscountSettingsSchema, DiscountSetting } from "@/types/discount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { saveDiscountSettings } from "@/lib/services/settingsService";
import { Loader2, Plus, Trash2, Save, Percent, Tag } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { formatDateTimeWithPreferences } from "@/lib/appPreferences";

interface DiscountSettingsClientProps {
    initialSettings: DiscountSettings;
}

// Form schema for adding a new discount
const NewDiscountSchema = z.object({
    discountCode: z.string().min(1, "El código es requerido"),
    discountPercentage: z.coerce.number().min(0.01, "Mínimo 0.01%").max(100, "Máximo 100%"),
    validFrom: z.string().min(1, "Fecha inicio requerida"),
    validTo: z.string().min(1, "Fecha fin requerida"),
});

type NewDiscountFormValues = z.infer<typeof NewDiscountSchema>;

export default function DiscountSettingsClient({ initialSettings }: DiscountSettingsClientProps) {
    const [discounts, setDiscounts] = useState<DiscountSetting[]>(initialSettings.discounts || []);
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const { toast } = useToast();

    const form = useForm<NewDiscountFormValues>({
        resolver: zodResolver(NewDiscountSchema),
        defaultValues: {
            discountCode: "",
            discountPercentage: 10,
            validFrom: new Date().toISOString().split("T")[0],
            validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
    });

    const handleAddDiscount = (values: NewDiscountFormValues) => {
        const newDiscount: DiscountSetting = {
            id: uuidv4(),
            discountCode: values.discountCode.toUpperCase(),
            discountPercentage: values.discountPercentage,
            isActive: true,
            validFrom: values.validFrom,
            validTo: values.validTo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Check for duplicate code
        if (discounts.some(d => d.discountCode.toUpperCase() === newDiscount.discountCode)) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Ya existe un descuento con este código.",
            });
            return;
        }

        setDiscounts([...discounts, newDiscount]);
        setHasChanges(true);
        form.reset();
        toast({
            title: "Descuento agregado",
            description: "Recuerda guardar los cambios.",
        });
    };

    const handleToggleActive = (id: string) => {
        setDiscounts(
            discounts.map(d =>
                d.id === id ? { ...d, isActive: !d.isActive, updatedAt: new Date().toISOString() } : d
            )
        );
        setHasChanges(true);
    };

    const handleDeleteDiscount = (id: string) => {
        setDiscounts(discounts.filter(d => d.id !== id));
        setHasChanges(true);
        toast({
            title: "Descuento eliminado",
            description: "Recuerda guardar los cambios.",
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await saveDiscountSettings({ discounts });
            setHasChanges(false);
            toast({
                title: "Configuración guardada",
                description: "Los descuentos se han guardado exitosamente.",
            });
        } catch (error) {
            console.error("Error saving discount settings:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar la configuración.",
            });
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return formatDateTimeWithPreferences(new Date(dateString), {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const isDiscountExpired = (discount: DiscountSetting) => {
        const now = new Date();
        const validTo = new Date(discount.validTo);
        validTo.setHours(23, 59, 59, 999);
        return now > validTo;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Percent className="h-6 w-6 text-purple-500" />
                        Gestión de Descuentos
                    </h1>
                    <p className="text-muted-foreground">
                        Configura códigos de descuento para aplicar en el punto de venta.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={loading || !hasChanges}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Add New Discount Form */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Plus className="h-5 w-5" />
                            Nuevo Descuento
                        </CardTitle>
                        <CardDescription>
                            Crea un nuevo código de descuento
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleAddDiscount)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="discountCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Código de Descuento</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        {...field}
                                                        placeholder="ej. PROMO10"
                                                        className="pl-9 uppercase"
                                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="discountPercentage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Porcentaje de Descuento</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        min={0.01}
                                                        max={100}
                                                        step={0.01}
                                                        className="pl-9"
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="validFrom"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Válido Desde</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="date" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="validTo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Válido Hasta</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="date" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar Descuento
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Discount List */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Descuentos Configurados</CardTitle>
                        <CardDescription>
                            {discounts.length === 0
                                ? "No hay descuentos configurados"
                                : `${discounts.length} descuento(s) registrado(s)`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {discounts.length > 0 ? (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead className="text-center">%</TableHead>
                                            <TableHead>Vigencia</TableHead>
                                            <TableHead className="text-center">Activo</TableHead>
                                            <TableHead className="w-[60px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {discounts.map((discount) => {
                                            const expired = isDiscountExpired(discount);
                                            return (
                                                <TableRow
                                                    key={discount.id}
                                                    className={expired ? "opacity-50" : ""}
                                                >
                                                    <TableCell className="font-mono font-semibold">
                                                        {discount.discountCode}
                                                        {expired && (
                                                            <span className="ml-2 text-xs text-red-500 font-normal">
                                                                (Expirado)
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium text-green-600">
                                                        {discount.discountPercentage}%
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {formatDate(discount.validFrom)} - {formatDate(discount.validTo)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Switch
                                                            checked={discount.isActive}
                                                            onCheckedChange={() => handleToggleActive(discount.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteDiscount(discount.id)}
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Percent className="h-12 w-12 mb-4 opacity-50" />
                                <p>No hay descuentos configurados</p>
                                <p className="text-sm">Usa el formulario para agregar uno</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

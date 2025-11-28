"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/hooks";


import { Income, IncomeCategory, Account } from "@/types";
import { addIncome, getIncomeCategories, addIncomeCategory } from "@/lib/services/incomeService";
import { getAccounts } from "@/lib/services/accountService";
import { Loader2, Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface AddIncomeDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onIncomeAdded: (income: Income) => void;
}

const formSchema = z.object({
    description: z.string().min(3, "La descripción es requerida."),
    amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
    category: z.string({ required_error: "Debe seleccionar una categoría." }),
    destinationAccountId: z.string({ required_error: "Debe seleccionar una cuenta de destino." }),
    source: z.string().min(2, "El origen es requerido (ej: Cliente, Reembolso)."),
    receipt: z.custom<FileList>().optional(),
});

export default function AddIncomeDialog({ isOpen, onOpenChange, onIncomeAdded }: AddIncomeDialogProps) {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<IncomeCategory[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const { toast } = useToast();
    const { userProfile } = useAuth();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: "",
            amount: 0,
            source: "",
        },
    });

    const receiptFileRef = form.register("receipt");

    useEffect(() => {
        if (isOpen) {
            getIncomeCategories().then(setCategories);
            getAccounts().then(setAccounts);
        }
    }, [isOpen]);

    const handleAddNewCategory = async () => {
        if (!newCategoryName.trim()) return;
        setLoading(true);
        try {
            const newCategory = await addIncomeCategory({ name: newCategoryName, isActive: true });
            setCategories(prev => [...prev, newCategory]);
            form.setValue('category', newCategory.name);
            setNewCategoryName("");
            setOpenCategoryPopover(false);
            toast({ title: "Categoría Agregada", description: `Se agregó "${newCategory.name}".` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo agregar la categoría." });
        } finally {
            setLoading(false);
        }
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);
        try {
            const receiptFile = values.receipt?.[0];
            const incomeData = {
                description: values.description,
                amount: values.amount,
                category: values.category,
                destinationAccountId: values.destinationAccountId,
                source: values.source,
            };

            const newIncome = await addIncome(incomeData, receiptFile, userProfile?.uid);

            onIncomeAdded(newIncome);
            toast({
                title: "Ingreso Registrado",
                description: `Se registró un ingreso de $${values.amount.toFixed(2)}.`,
            });
            handleDialogClose(false);
        } catch (error) {
            console.error("Error registering income:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo registrar el ingreso.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            form.reset();
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Ingreso</DialogTitle>
                    <DialogDescription>
                        Registra ingresos adicionales o inyecciones de capital.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción / Concepto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Venta de activo, Aporte de socio" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="source"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Origen (¿De quién/dónde viene?)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Juan Pérez, Venta de Mobiliario" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Monto</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Categoría</FormLabel>
                                        <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover} modal={true}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full justify-between",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value
                                                            ? categories.find(
                                                                (cat) => cat.name === field.value
                                                            )?.name
                                                            : "Seleccionar categoría"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-full p-0 z-[200]">
                                                <Command>
                                                    <CommandInput placeholder="Buscar o crear..." />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            <div className="p-4 text-sm">No se encontró la categoría.</div>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {categories.map((cat) => (
                                                                <CommandItem
                                                                    value={cat.name}
                                                                    key={cat.id}
                                                                    onSelect={() => {
                                                                        form.setValue("category", cat.name)
                                                                        setOpenCategoryPopover(false)
                                                                    }}
                                                                    className="cursor-pointer data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            cat.name === field.value
                                                                                ? "opacity-100"
                                                                                : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {cat.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                        <CommandSeparator />
                                                        <CommandGroup>
                                                            <div className="p-2">
                                                                <div className="flex items-center">
                                                                    <Input
                                                                        placeholder="Nueva categoría..."
                                                                        value={newCategoryName}
                                                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                                                        className="mr-2"
                                                                    />
                                                                    <Button type="button" size="sm" onClick={handleAddNewCategory} disabled={loading || !newCategoryName.trim()}>
                                                                        {loading ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="destinationAccountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Depositar en Cuenta</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione una cuenta..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {accounts.map((account) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    {account.name} (${account.currentBalance.toFixed(2)})
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
                            name="receipt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Comprobante (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input type="file" accept="image/*,application/pdf" {...receiptFileRef} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="secondary" onClick={() => handleDialogClose(false)} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <><Loader2 className="animate-spin mr-2" /> Registrando...</> : "Agregar Ingreso"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

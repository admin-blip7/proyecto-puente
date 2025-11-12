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
import { Expense, ExpenseCategory } from "@/types";
import { addExpense } from "@/lib/services/financeService";
import { addExpenseCategory, getExpenseCategories } from "@/lib/services/expenseCategoryService";
import { Loader2, Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { Command, CommandInput, CommandItem, CommandList, CommandEmpty, CommandGroup, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface QuickExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded: (description: string, amount: number, category: string) => Promise<void>;
}

const formSchema = z.object({
  description: z.string().min(3, "La descripción es requerida."),
  amount: z.coerce.number().positive("El monto debe ser mayor a cero."),
  category: z.string({ required_error: "Debe seleccionar una categoría." }),
});

export default function QuickExpenseDialog({ isOpen, onOpenChange, onExpenseAdded }: QuickExpenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { description: "", amount: 0, category: "Retiro de Caja" },
  });

  useEffect(() => {
    if (isOpen) {
      getExpenseCategories()
        .then(setCategories)
        .catch((error) => {
          console.error('Error loading categories:', error);
          toast({ 
            variant: 'destructive', 
            title: "Error al cargar categorías", 
            description: error.message || "No se pudieron cargar las categorías. Verifique la configuración de la base de datos."
          });
        });
    }
  }, [isOpen, toast]);

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    setLoading(true);
    try {
      const newCategory = await addExpenseCategory({ name: newCategoryName, isActive: true });
      setCategories(prev => [...prev, newCategory]);
      form.setValue('category', newCategory.name);
      setNewCategoryName("");
      setOpenCategoryPopover(false);
      toast({ title: "Categoría Agregada", description: `Se agregó "${newCategory.name}".`});
    } catch (error) {
      console.error('Error adding category:', error);
      const errorMessage = error instanceof Error ? error.message : "No se pudo agregar la categoría.";
      toast({ 
        variant: 'destructive', 
        title: "Error al agregar categoría", 
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      await onExpenseAdded(values.description, values.amount, values.category);
      handleDialogClose(false);
    } catch (error) {
      // Error is handled by the parent component's toast
    } finally {
      setLoading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset({ description: "", amount: 0, category: "Retiro de Caja" });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Gasto Rápido de Caja</DialogTitle>
          <DialogDescription>
            Anota una salida de dinero para mantener el control de tu caja.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Gasto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Compra de agua" {...field} />
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
                  <Popover open={openCategoryPopover} onOpenChange={setOpenCategoryPopover}>
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
                            ? categories.find(cat => cat.name === field.value)?.name
                            : "Seleccionar categoría"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                                  form.setValue("category", cat.name);
                                  setOpenCategoryPopover(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    cat.name === field.value ? "opacity-100" : "opacity-0"
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
            <DialogFooter className="pt-4">
              <Button type="button" variant="secondary" onClick={() => handleDialogClose(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2"/> Registrando...</> : "Agregar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

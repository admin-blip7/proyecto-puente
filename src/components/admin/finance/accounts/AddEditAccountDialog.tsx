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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Account, accountTypes, AccountType } from "@/types";
import { addAccount, updateAccount } from "@/lib/services/accountService";
import { Loader2 } from "lucide-react";

interface AddEditAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onAccountAdded: (account: Account) => void;
  onAccountUpdated: (account: Account) => void;
}

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  type: z.enum(accountTypes, { required_error: "Debe seleccionar un tipo." }),
  currentBalance: z.coerce.number().min(0, "El saldo inicial no puede ser negativo."),
});

export default function AddEditAccountDialog({
  isOpen,
  onOpenChange,
  account,
  onAccountAdded,
  onAccountUpdated,
}: AddEditAccountDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const isEditMode = !!account;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        form.reset({
          name: account.name,
          type: account.type,
          currentBalance: account.currentBalance,
        });
      } else {
        form.reset({
          name: "",
          type: "Banco",
          currentBalance: 0,
        });
      }
    }
  }, [isOpen, account, isEditMode, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      if (isEditMode) {
        await updateAccount(account.id, values);
        onAccountUpdated({ ...account, ...values });
        toast({ title: "Cuenta Actualizada", description: "La información ha sido guardada." });
      } else {
        const newAccount = await addAccount(values);
        onAccountAdded(newAccount);
        toast({ title: "Cuenta Agregada", description: "La nueva cuenta ha sido creada." });
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error processing account:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: isEditMode ? "No se pudo actualizar la cuenta." : "No se pudo agregar la cuenta.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Cuenta" : "Agregar Nueva Cuenta"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Modifica los detalles de la cuenta." : "Completa la información de la nueva cuenta."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Cuenta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Banorte, Caja Chica" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Cuenta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccione un tipo..." />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {accountTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                            {type}
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
                    name="currentBalance"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Saldo {isEditMode ? 'Actual' : 'Inicial'}</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2"/> Guardando...</> : (isEditMode ? "Guardar Cambios" : "Agregar Cuenta")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

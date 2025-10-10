"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Debt } from "@/types";
import { deleteDebt } from "@/lib/services/debtService";
import { Loader2 } from "lucide-react";

interface DeleteDebtDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt;
  onDebtDeleted: (debtId: string) => void;
}

export default function DeleteDebtDialog({
  isOpen,
  onOpenChange,
  debt,
  onDebtDeleted,
}: DeleteDebtDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteDebt(debt.id);
      onDebtDeleted(debt.id);
      toast({
        title: "Deuda Eliminada",
        description: `La deuda con "${debt.creditorName}" ha sido eliminada.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting debt:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la deuda. Asegúrate de que no tenga pagos asociados.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de la deuda con{" "}
            <span className="font-semibold">{debt.creditorName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? <><Loader2 className="animate-spin mr-2"/> Eliminando...</> : "Sí, eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

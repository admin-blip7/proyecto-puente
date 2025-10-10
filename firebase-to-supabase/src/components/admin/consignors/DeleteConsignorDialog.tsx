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
import { Consignor } from "@/types";
import { deleteConsignor } from "@/lib/services/consignorService";
import { Loader2 } from "lucide-react";

interface DeleteConsignorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  consignor: Consignor;
  onConsignorDeleted: (consignorId: string) => void;
}

export default function DeleteConsignorDialog({
  isOpen,
  onOpenChange,
  consignor,
  onConsignorDeleted,
}: DeleteConsignorDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteConsignor(consignor.id);
      onConsignorDeleted(consignor.id);
      toast({
        title: "Consignador Eliminado",
        description: `El consignador "${consignor.name}" ha sido eliminado.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting consignor:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el consignador. Asegúrate de que no tenga productos asociados.",
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
            Esta acción no se puede deshacer. Esto eliminará permanentemente al consignador{" "}
            <span className="font-semibold">{consignor.name}</span>.
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

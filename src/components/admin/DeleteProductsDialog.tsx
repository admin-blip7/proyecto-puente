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
import { deleteProducts } from "@/lib/services/productService";
import { Loader2 } from "lucide-react";

interface DeleteProductsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onProductsDeleted: (productIds: string[]) => void;
}

export default function DeleteProductsDialog({
  isOpen,
  onOpenChange,
  productIds,
  onProductsDeleted,
}: DeleteProductsDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const numProducts = productIds.length;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteProducts(productIds);
      onProductsDeleted(productIds);
      toast({
        title: "Productos Eliminados",
        description: `${numProducts} producto(s) ha(n) sido eliminado(s).`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron eliminar los productos.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (numProducts === 0) {
      return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente {" "}
            <span className="font-semibold">{numProducts} producto(s)</span>.
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

"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Supplier } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface DeleteSupplierDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  supplier: Supplier;
}

export default function DeleteSupplierDialog({
  isOpen,
  onClose,
  onConfirm,
  supplier
}: DeleteSupplierDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar Proveedor
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el proveedor y toda su información.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Proveedor a eliminar:</h4>
            <p className="text-sm"><strong>Nombre:</strong> {supplier.name}</p>
            <p className="text-sm"><strong>Contacto:</strong> {supplier.contactInfo}</p>
            <p className="text-sm">
              <strong>Total comprado (año):</strong> {formatCurrency(supplier.totalPurchasedYTD ?? 0)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Eliminar Proveedor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

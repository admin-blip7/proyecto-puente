"use client";

import { useMemo, useState } from "react";
import { Barcode, Link2, PlusCircle, Search } from "lucide-react";
import { Product } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";

interface ScannedCodeResolutionDialogProps {
  open: boolean;
  scannedCode: string | null;
  products: Product[];
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNew: () => void;
  onAssociate: (product: Product) => void;
}

export default function ScannedCodeResolutionDialog({
  open,
  scannedCode,
  products,
  isSaving = false,
  onOpenChange,
  onCreateNew,
  onAssociate,
}: ScannedCodeResolutionDialogProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const baseProducts = products
      .filter((product) => product.type !== "Servicio")
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!query) return baseProducts.slice(0, 50);

    return baseProducts
      .filter((product) => {
        const barcode = String(product.attributes?.barcode ?? "").toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          barcode.includes(query)
        );
      })
      .slice(0, 50);
  }, [products, search]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) {
          onOpenChange(nextOpen);
          if (!nextOpen) setSearch("");
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Código no registrado
          </DialogTitle>
          <DialogDescription>
            {scannedCode ? (
              <>
                El código <span className="font-medium text-foreground">{scannedCode}</span> no existe en el sistema.
                Puedes crear un producto nuevo o ligarlo a un producto ya existente.
              </>
            ) : (
              "El código escaneado no existe en el sistema."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Opción 1: Crear producto nuevo</p>
                <p className="text-sm text-muted-foreground">
                  Abrimos el alta de inventario con el código ya precargado en el campo SKU.
                </p>
              </div>
              <Button onClick={onCreateNew} disabled={!scannedCode || isSaving} className="sm:min-w-44">
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear producto
              </Button>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">Opción 2: Asociar a producto existente</p>
                <p className="text-sm text-muted-foreground">
                  Guarda este barcode en el producto elegido para que el siguiente escaneo lo encuentre.
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                Actualiza barcode
              </Badge>
            </div>

            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="pl-9"
                disabled={isSaving}
              />
            </div>

            <ScrollArea className="h-72 rounded-lg border">
              <div className="divide-y">
                {filteredProducts.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No encontramos productos con esa búsqueda.
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onAssociate(product)}
                      disabled={isSaving}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>SKU: {product.sku}</span>
                          {product.attributes?.barcode ? (
                            <span>Barcode: {String(product.attributes.barcode)}</span>
                          ) : null}
                          <span>Stock: {product.stock}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(product.price)}
                        </span>
                        <span className="rounded-full border p-2 text-muted-foreground">
                          <Link2 className="h-4 w-4" />
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

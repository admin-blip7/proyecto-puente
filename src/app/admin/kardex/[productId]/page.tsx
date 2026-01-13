export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { getProductById } from "@/lib/services/productService";
import { getKardexEntries, getStockActualByProductId } from "@/lib/services/kardexService";
import KardexClient from "@/components/admin/kardex/KardexClient";
import { KardexMovementType } from "@/types";

const toStartIso = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const toEndIso = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export default async function KardexDetailPage(props: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ start?: string; end?: string; tipo?: string }>;
}) {
  const { productId } = await props.params;
  const searchParams = await props.searchParams;
  const start = typeof searchParams.start === "string" ? searchParams.start : "";
  const end = typeof searchParams.end === "string" ? searchParams.end : "";
  const tipo =
    searchParams.tipo === "INGRESO" || searchParams.tipo === "SALIDA"
      ? (searchParams.tipo as KardexMovementType)
      : undefined;

  const [product, stockActual, entries] = await Promise.all([
    getProductById(productId),
    getStockActualByProductId(productId),
    getKardexEntries(productId, {
      startDate: toStartIso(start),
      endDate: toEndIso(end),
      tipo,
    }),
  ]);

  if (!product) {
    notFound();
  }

  const stockActualValue = stockActual?.stockActual ?? product.stock ?? 0;
  const ultimaActualizacion = stockActual?.ultimaActualizacion ?? entries[0]?.createdAt ?? null;

  return (
    <div className="flex h-screen w-full flex-row">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>
      <div className="absolute top-4 left-4 z-50 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-24">
            <SheetTitle className="sr-only">Kardex Menu</SheetTitle>
            <LeftSidebar />
          </SheetContent>
        </Sheet>
      </div>
      <main className="flex-1 overflow-hidden p-4 md:p-6 md:pt-12">
        <KardexClient
          product={product}
          entries={entries}
          stockActual={stockActualValue}
          ultimaActualizacion={ultimaActualizacion}
          filters={{ start, end, tipo: tipo ?? "all" }}
        />
      </main>
    </div>
  );
}

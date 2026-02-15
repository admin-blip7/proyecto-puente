"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import { KardexEntry, KardexMovementType, Product } from "@/types";
import { CalendarRange, Filter, RefreshCcw } from "lucide-react";
import { formatDateTimeWithPreferences, formatNumberWithPreferences } from "@/lib/appPreferences";

interface KardexClientProps {
  product: Product;
  entries: KardexEntry[];
  stockActual: number;
  ultimaActualizacion?: Date | null;
  filters: {
    start?: string;
    end?: string;
    tipo?: KardexMovementType | "all";
  };
}

const formatDateTime = (value: Date | string) => {
  return formatDateTimeWithPreferences(value);
};

const formatQuantity = (value: number) => formatNumberWithPreferences(value);

export default function KardexClient({
  product,
  entries,
  stockActual,
  ultimaActualizacion,
  filters,
}: KardexClientProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(filters.start ?? "");
  const [endDate, setEndDate] = useState(filters.end ?? "");
  const [tipo, setTipo] = useState<KardexMovementType | "all">(filters.tipo ?? "all");

  const lowStockThreshold = product.reorderPoint ?? product.minStock ?? 5;
  const isOutOfStock = stockActual <= 0;
  const isLowStock = stockActual > 0 && stockActual <= lowStockThreshold;

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        if (entry.tipo === "INGRESO") {
          acc.ingresos += entry.cantidad;
        } else {
          acc.salidas += entry.cantidad;
        }
        return acc;
      },
      { ingresos: 0, salidas: 0 }
    );
  }, [entries]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (tipo && tipo !== "all") params.set("tipo", tipo);
    const query = params.toString();
    router.push(query ? `/admin/kardex/${product.id}?${query}` : `/admin/kardex/${product.id}`);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setTipo("all");
    router.push(`/admin/kardex/${product.id}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kardex</h1>
            <p className="text-sm text-muted-foreground">
              {product.name} · SKU {product.sku || "N/A"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              className={cn(
                "border-transparent",
                isOutOfStock
                  ? "bg-red-100 text-red-700"
                  : isLowStock
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              )}
            >
              {isOutOfStock ? "Stock agotado" : isLowStock ? "Stock bajo" : "Stock saludable"}
            </Badge>
            <Badge variant="outline">Stock actual: {formatQuantity(stockActual)}</Badge>
          </div>
        </div>
        {ultimaActualizacion ? (
          <p className="text-xs text-muted-foreground">
            Última actualización: {formatDateTime(ultimaActualizacion)}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ingresos totales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">
            {formatQuantity(totals.ingresos)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Salidas totales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-600">
            {formatQuantity(totals.salidas)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Movimientos registrados</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{entries.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Historial de movimientos</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="pl-8"
              />
            </div>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={tipo} onValueChange={(value) => setTipo(value as KardexMovementType | "all")}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="INGRESO">Ingresos</SelectItem>
                <SelectItem value="SALIDA">Salidas</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleApplyFilters}>Aplicar</Button>
            <Button variant="outline" onClick={handleClearFilters}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Salida</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      Sin movimientos registrados en este rango.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const isIngreso = entry.tipo === "INGRESO";
                    const valor =
                      entry.valorTotal ??
                      (entry.precioUnitario ? entry.precioUnitario * entry.cantidad : null);

                    return (
                      <TableRow
                        key={entry.id}
                        className={cn(isIngreso ? "bg-emerald-50/50" : "bg-rose-50/50")}
                      >
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(entry.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border-transparent",
                              isIngreso ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}
                          >
                            {entry.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate">{entry.concepto}</TableCell>
                        <TableCell className="text-right text-emerald-700">
                          {isIngreso ? formatQuantity(entry.cantidad) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-rose-700">
                          {isIngreso ? "-" : formatQuantity(entry.cantidad)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatQuantity(entry.stockNuevo)}
                        </TableCell>
                        <TableCell className="text-right">
                          {valor !== null ? formatCurrency(valor) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

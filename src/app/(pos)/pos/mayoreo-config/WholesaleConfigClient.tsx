"use client";

import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeWithPreferences } from "@/lib/appPreferences";
import type { ProductCategory } from "@/lib/services/categoryService";
import type { WholesaleProfitSetting } from "@/types";
import { AlertTriangle, Edit, Percent, Save, Search, Tag, Trash2, X } from "lucide-react";

interface WholesaleConfigClientProps {
  initialCategories: ProductCategory[];
  initialSettings: WholesaleProfitSetting[];
  updatedBy: string;
}

const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

const isValidDraft = (value: string) => /^\d{0,4}(\.\d{0,2})?$/.test(value);

const parseApiError = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json();
    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Ignore malformed payloads and use generic fallback below.
  }

  return "Intenta nuevamente.";
};

export default function WholesaleConfigClient({
  initialCategories,
  initialSettings,
  updatedBy,
}: WholesaleConfigClientProps) {
  const [settings, setSettings] = useState<WholesaleProfitSetting[]>(initialSettings);
  const [search, setSearch] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draftPercentage, setDraftPercentage] = useState("");
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
  const { toast } = useToast();

  const settingsMap = useMemo(() => {
    return new Map(settings.map((setting) => [setting.category_id, setting]));
  }, [settings]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return initialCategories.filter((category) => {
      if (!normalizedSearch) return true;

      return (
        category.label.toLowerCase().includes(normalizedSearch) ||
        category.value.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [initialCategories, search]);

  const configuredCount = settings.length;
  const unconfiguredCount = Math.max(initialCategories.length - configuredCount, 0);

  const beginEdit = (category: ProductCategory) => {
    const currentSetting = settingsMap.get(category.value);
    setEditingCategoryId(category.value);
    setDraftPercentage(currentSetting ? currentSetting.profit_percentage.toFixed(2) : "");
  };

  const cancelEdit = () => {
    setEditingCategoryId(null);
    setDraftPercentage("");
  };

  const handleDraftChange = (value: string) => {
    if (value === "" || isValidDraft(value)) {
      setDraftPercentage(value);
    }
  };

  const handleSave = async (category: ProductCategory) => {
    const normalizedDraft = draftPercentage.trim();
    const parsedValue = Number.parseFloat(normalizedDraft);

    if (!normalizedDraft || Number.isNaN(parsedValue)) {
      toast({
        variant: "destructive",
        title: "Porcentaje inválido",
        description: "Ingresa un número válido entre 0 y 1000 con hasta 2 decimales.",
      });
      return;
    }

    if (parsedValue < 0 || parsedValue > 1000) {
      toast({
        variant: "destructive",
        title: "Porcentaje fuera de rango",
        description: "El porcentaje debe estar entre 0 y 1000.",
      });
      return;
    }

    setPendingCategoryId(category.value);
    setPendingAction("save");

    try {
      const response = await fetch("/api/wholesale-profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: category.value,
          categoryLabel: category.label,
          profitPercentage: parsedValue,
          updatedBy,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const payload = (await response.json()) as { setting: WholesaleProfitSetting };
      const savedSetting = payload.setting;

      setSettings((current) => {
        const next = current.filter((setting) => setting.category_id !== savedSetting.category_id);
        next.push(savedSetting);
        return next;
      });
      cancelEdit();
      toast({
        title: "Configuración guardada",
        description: `${category.label} ahora usa ${formatPercentage(savedSetting.profit_percentage)} de ganancia mayoreo.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setPendingCategoryId(null);
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setPendingCategoryId(deleteTarget.value);
    setPendingAction("delete");

    try {
      const response = await fetch(
        `/api/wholesale-profit?categoryId=${encodeURIComponent(deleteTarget.value)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setSettings((current) => current.filter((setting) => setting.category_id !== deleteTarget.value));
      if (editingCategoryId === deleteTarget.value) {
        cancelEdit();
      }
      toast({
        title: "Configuración eliminada",
        description: `${deleteTarget.label} quedó sin porcentaje de mayoreo configurado.`,
      });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setPendingCategoryId(null);
      setPendingAction(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted/40">
                <Percent className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Configuración Mayoreo</h1>
                <p className="text-sm text-muted-foreground">
                  Porcentaje de ganancia aplicado en ventas de mayoreo por categoría
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                {configuredCount} configuradas
              </Badge>
              <Badge variant="outline" className="border-slate-300 bg-slate-100 text-slate-700">
                {unconfiguredCount} sin configurar
              </Badge>
              <Badge variant="outline" className="border-border bg-background text-foreground">
                {filteredCategories.length} visibles
              </Badge>
            </div>
          </div>
        </section>

        <Card className="border border-border bg-background shadow-sm">
          <CardHeader className="gap-4 border-b border-border">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Tag className="h-5 w-5 text-primary" />
                  Categorías con margen mayoreo
                </CardTitle>
                <CardDescription>
                  Edita el porcentaje por categoría sin tocar el flujo de ventas actual.
                </CardDescription>
              </div>
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar categoría por nombre o clave"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">Categoría</TableHead>
                    <TableHead className="min-w-[220px]">% Ganancia Mayoreo</TableHead>
                    <TableHead className="min-w-[220px]">Última actualización</TableHead>
                    <TableHead className="min-w-[220px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                        No hay categorías que coincidan con tu búsqueda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories.map((category) => {
                      const setting = settingsMap.get(category.value) ?? null;
                      const isEditing = editingCategoryId === category.value;
                      const isPendingRow = pendingCategoryId === category.value;
                      const showDeleteSkeleton = isPendingRow && pendingAction === "delete";

                      return (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-xl border border-border bg-muted/40 p-2">
                                <Tag className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="space-y-1">
                                <div className="font-medium text-foreground">{category.label}</div>
                                <div className="text-xs text-muted-foreground">{category.value}</div>
                                <Badge
                                  variant="outline"
                                  className={
                                    setting
                                      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                      : "border-slate-300 bg-slate-100 text-slate-600"
                                  }
                                >
                                  {setting ? "Configurado" : "Sin configurar"}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {showDeleteSkeleton ? (
                              <div className="space-y-2">
                                <Skeleton className="h-5 w-28" />
                                <Skeleton className="h-4 w-20" />
                              </div>
                            ) : isEditing ? (
                              <div className="space-y-3">
                                <div className="relative max-w-[220px]">
                                  <Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    value={draftPercentage}
                                    onChange={(event) => handleDraftChange(event.target.value)}
                                    inputMode="decimal"
                                    placeholder="0.00"
                                    className="pl-9"
                                    min={0}
                                    max={1000}
                                    step={0.01}
                                    disabled={isPendingRow}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">Rango permitido: 0.00% a 1000.00%</p>
                                {isPendingRow ? <Skeleton className="h-4 w-36" /> : null}
                              </div>
                            ) : setting ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-foreground">{formatPercentage(setting.profit_percentage)}</div>
                                <div className="text-xs text-muted-foreground">Ganancia activa para mayoreo</div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin configurar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {showDeleteSkeleton ? (
                              <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-4 w-24" />
                              </div>
                            ) : setting ? (
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-foreground">
                                  {formatDateTimeWithPreferences(setting.updated_at)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {setting.updated_by ? `Por ${setting.updated_by}` : "Actualización manual"}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sin registro</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {showDeleteSkeleton ? (
                              <div className="ml-auto flex w-full max-w-[220px] justify-end gap-2">
                                <Skeleton className="h-9 w-24" />
                                <Skeleton className="h-9 w-24" />
                              </div>
                            ) : isEditing ? (
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(category)}
                                  disabled={isPendingRow}
                                  className="min-w-[96px]"
                                >
                                  <Save className="h-4 w-4" />
                                  Guardar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                  disabled={isPendingRow}
                                  className="min-w-[96px]"
                                >
                                  <X className="h-4 w-4" />
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant={setting ? "outline" : "default"}
                                  onClick={() => beginEdit(category)}
                                  disabled={isPendingRow}
                                  className="min-w-[110px]"
                                >
                                  <Edit className="h-4 w-4" />
                                  {setting ? "Editar" : "+ Agregar %"}
                                </Button>
                                {setting ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDeleteTarget(category)}
                                    disabled={isPendingRow}
                                    className="min-w-[110px] border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Eliminar
                                  </Button>
                                ) : null}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Eliminar configuración de mayoreo
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Se eliminará el porcentaje configurado para ${deleteTarget.label}. La categoría quedará sin margen de mayoreo hasta que se configure otra vez.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction === "delete"}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pendingAction === "delete"}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Eliminar configuración
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

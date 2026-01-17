"use client";

import { useState } from "react";
import { FixedAsset } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import AddAssetDialog from "./AddAssetDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { runAnnualDepreciation, getAssets } from "@/lib/services/assetService";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { formatMXNAmount } from "@/lib/validation/currencyValidation";
import InventoryHistoryChart from "./InventoryHistoryChart";

interface AssetClientProps {
  initialAssets: FixedAsset[];
  inventoryValue: number;
  historyData: { date: string; value: number }[];
}

export default function AssetClient({ initialAssets, inventoryValue, historyData }: AssetClientProps) {
  const [assets, setAssets] = useState<FixedAsset[]>(initialAssets);
  const [isAddAssetOpen, setAddAssetOpen] = useState(false);
  const [isDepreciating, setIsDepreciating] = useState(false);
  const { toast } = useToast();

  const handleAssetAdded = (newAsset: FixedAsset) => {
    setAssets(prev => [newAsset, ...prev].sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()));
  };

  const handleRunDepreciation = async () => {
    setIsDepreciating(true);
    try {
      const count = await runAnnualDepreciation();
      const updatedAssets = await getAssets();
      setAssets(updatedAssets);
      toast({
        title: "Depreciación Completada",
        description: `${count} activo(s) fueron depreciados. La vista ha sido actualizada.`
      });
    } catch (error) {
      console.error("Error running depreciation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo ejecutar el proceso de depreciación.",
      });
    } finally {
      setIsDepreciating(false);
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Activos Fijos</h1>
          <p className="text-muted-foreground">Administra los activos de tu empresa y su valor a lo largo del tiempo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRunDepreciation} variant="outline" disabled={isDepreciating}>
            {isDepreciating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingDown className="mr-2 h-4 w-4" />}
            Ejecutar Depreciación
          </Button>
          <Button onClick={() => setAddAssetOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Registrar Activo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <InventoryHistoryChart data={historyData} currentValue={inventoryValue} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-320px)] w-full">
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Fecha Compra</TableHead>
                    <TableHead className="text-right">Costo Original</TableHead>
                    <TableHead className="text-right">Valor Actual</TableHead>
                    <TableHead className="text-right">Depreciación Anual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => {
                    const annualDepreciation = (asset.purchaseCost - asset.salvageValue) / asset.usefulLifeYrs;
                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell><Badge variant="secondary">{asset.category}</Badge></TableCell>
                        <TableCell>{format(asset.purchaseDate, "dd MMM yyyy", { locale: es })}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMXNAmount(asset.purchaseCost ?? 0)}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{formatMXNAmount(asset.currentValue ?? 0)}</TableCell>
                        <TableCell className="text-right text-destructive">-{formatMXNAmount(annualDepreciation ?? 0)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AddAssetDialog
        isOpen={isAddAssetOpen}
        onOpenChange={setAddAssetOpen}
        onAssetAdded={handleAssetAdded}
      />
    </>
  );
}

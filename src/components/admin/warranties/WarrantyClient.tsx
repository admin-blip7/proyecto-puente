"use client";

import { useState } from "react";
import { Warranty } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/appPreferences";
import { Button } from "@/components/ui/button";
import { Edit, Plus } from "lucide-react";
import EditWarrantyDialog from "./EditWarrantyDialog";
import CreateWarrantyDialog from "./CreateWarrantyDialog";
import { getWarrantyStatusVariant } from "@/lib/utils";


interface WarrantyClientProps {
  initialWarranties: Warranty[];
}

export default function WarrantyClient({ initialWarranties }: WarrantyClientProps) {
  const [warranties, setWarranties] = useState<Warranty[]>(initialWarranties);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  const handleOpenEditDialog = (warranty: Warranty) => {
    setSelectedWarranty(warranty);
    setEditDialogOpen(true);
  };

  const handleWarrantyUpdated = (updatedWarranty: Warranty) => {
    setWarranties(prev => 
      prev.map(w => w.id === updatedWarranty.id ? updatedWarranty : w)
    );
    setEditDialogOpen(false);
    setSelectedWarranty(null);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Garantías</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Garantía</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-200px)]">
             <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Fecha de Reporte</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>ID Venta</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {warranties.map((warranty) => (
                    <TableRow key={warranty.id}>
                        <TableCell className="font-medium">{warranty.productName}</TableCell>
                        <TableCell>
                            <div className="font-medium">{warranty.customerName || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">{warranty.customerPhone}</div>
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">{warranty.reason}</TableCell>
                        <TableCell>
                            {format(warranty.reportedAt, "dd MMM yyyy, HH:mm", { locale: getDateFnsLocale() })}
                        </TableCell>
                        <TableCell>
                            <Badge variant={getWarrantyStatusVariant(warranty.status)}>
                                {warranty.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{warranty.saleId}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(warranty)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar Garantía</span>
                          </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      {selectedWarranty && (
        <EditWarrantyDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setEditDialogOpen}
          warranty={selectedWarranty}
          onWarrantyUpdated={handleWarrantyUpdated}
        />
      )}
    </>
  );
}

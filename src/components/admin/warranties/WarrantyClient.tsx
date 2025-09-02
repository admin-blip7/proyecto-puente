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
import { es } from "date-fns/locale";

interface WarrantyClientProps {
  initialWarranties: Warranty[];
}

const getStatusVariant = (status: Warranty['status']) => {
    switch (status) {
      case 'Pendiente':
        return 'default';
      case 'En Revisión':
        return 'secondary';
      case 'Resuelta':
        return 'outline';
      case 'Rechazada':
        return 'destructive';
      default:
        return 'default';
    }
  };


export default function WarrantyClient({ initialWarranties }: WarrantyClientProps) {
  const [warranties, setWarranties] = useState<Warranty[]>(initialWarranties);

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
                        <TableCell>{warranty.reason}</TableCell>
                        <TableCell>
                            {format(warranty.reportedAt, "dd MMM yyyy, HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(warranty.status)}>
                                {warranty.status}
                            </Badge>
                        </TableCell>
                        <TableCell>{warranty.saleId}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}

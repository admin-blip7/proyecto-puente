"use client"

import { useState, useMemo } from "react";
import { Consignor, Product, Sale } from "@/types";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface ConsignorClientProps {
  initialConsignors: Consignor[];
  allProducts: Product[];
  allSales: Sale[];
}

export default function ConsignorClient({ initialConsignors, allProducts, allSales }: ConsignorClientProps) {
  const [consignors, setConsignors] = useState<Consignor[]>(initialConsignors);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Reporte de Consignadores</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldos Pendientes</CardTitle>
          <CardDescription>
            Esta tabla muestra el saldo pendiente de pago para cada consignador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-200px)]">
             <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre del Consignador</TableHead>
                        <TableHead>Información de Contacto</TableHead>
                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {consignors.map((consignor) => (
                    <TableRow key={consignor.id}>
                        <TableCell className="font-medium">{consignor.name}</TableCell>
                        <TableCell>{consignor.contactInfo}</TableCell>
                        <TableCell className="text-right font-bold text-lg text-destructive">
                           <div className="flex items-center justify-end">
                             <DollarSign className="h-5 w-5 mr-1" />
                             {consignor.balanceDue.toFixed(2)}
                           </div>
                        </TableCell>
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

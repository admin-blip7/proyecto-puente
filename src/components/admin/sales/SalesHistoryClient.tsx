"use client";

import { useState } from "react";
import { Sale } from "@/types";
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

interface SalesHistoryClientProps {
  initialSales: Sale[];
}

export default function SalesHistoryClient({ initialSales }: SalesHistoryClientProps) {
  const [sales] = useState<Sale[]>(initialSales);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-headline">Historial de Ventas</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cajero</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.saleId}</TableCell>
                    <TableCell>
                      {format(sale.createdAt, "dd MMM yyyy, HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{sale.customerName || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{sale.customerPhone}</div>
                    </TableCell>
                    <TableCell>{sale.cashierName}</TableCell>
                    <TableCell>
                      <Badge variant={sale.paymentMethod === 'Efectivo' ? 'secondary' : 'default'}>
                        {sale.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${sale.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}

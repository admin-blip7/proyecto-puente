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
import { DollarSign, TrendingUp } from "lucide-react";

interface SalesHistoryClientProps {
  initialSales: Sale[];
  dailyCost: number;
  dailyProfit: number;
}

export default function SalesHistoryClient({ initialSales, dailyCost, dailyProfit }: SalesHistoryClientProps) {
  const [sales] = useState<Sale[]>(initialSales);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Historial de Ventas</h1>
      </div>

       <div className="grid gap-4 md:grid-cols-2 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Total del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dailyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Costo de los productos vendidos hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia del Día</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dailyProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ganancia total de las ventas de hoy</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-370px)]">
             <div className="relative w-full overflow-auto">
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
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}

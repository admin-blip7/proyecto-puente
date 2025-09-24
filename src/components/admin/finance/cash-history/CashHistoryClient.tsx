"use client"

import { useState } from "react";
import { CashSession } from "@/types";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";

interface CashHistoryClientProps {
  initialSessions: CashSession[];
}

export default function CashHistoryClient({ initialSessions }: CashHistoryClientProps) {
  const [sessions, setSessions] = useState<CashSession[]>(initialSessions);

  const formatDateTime = (date?: Date) => {
    if (!date) return 'N/A';
    return format(date, "dd MMM yyyy, HH:mm", { locale: es });
  }
  
  // Usar util global de MXN para formateo consistente

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Historial de Cortes de Caja</h1>
            <p className="text-muted-foreground">Revisa el historial y los detalles de cada sesión de caja cerrada.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Cortes de Caja Cerrados</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-250px)] w-full">
            <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID Sesión</TableHead>
                        <TableHead>Fecha Cierre</TableHead>
                        <TableHead>Cajero</TableHead>
                        <TableHead className="text-right">Fondo Inicial</TableHead>
                        <TableHead className="text-right">Ventas Efectivo</TableHead>
                        <TableHead className="text-right">Efectivo Esperado</TableHead>
                        <TableHead className="text-right">Efectivo Contado</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sessions.map((session) => (
                        <TableRow key={session.id}>
                            <TableCell className="font-mono">{session.sessionId}</TableCell>
                            <TableCell>{formatDateTime(session.closedAt)}</TableCell>
                            <TableCell>{session.closedByName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(session.startingFloat ?? 0)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(session.totalCashSales ?? 0)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(session.expectedCashInDrawer ?? 0)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(session.actualCashCount ?? 0)}</TableCell>
                            <TableCell className={cn("text-right font-bold", 
                                session.difference && session.difference > 0 && "text-green-600",
                                session.difference && session.difference < 0 && "text-red-600"
                            )}>
                                {formatCurrency(session.difference ?? 0)}
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

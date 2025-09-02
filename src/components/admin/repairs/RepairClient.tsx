"use client";

import { useState } from "react";
import { Repair } from "@/types";
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
import { Button } from "@/components/ui/button";
import { Edit, PlusCircle } from "lucide-react";
import AddRepairDialog from "./AddRepairDialog";
import EditRepairDialog from "./EditRepairDialog";

interface RepairClientProps {
  initialRepairs: Repair[];
}

const getStatusVariant = (status: Repair['status']) => {
    switch (status) {
        case 'Ingresado': return 'default';
        case 'En Diagnóstico': return 'secondary';
        case 'Esperando Refacción': return 'outline';
        case 'Reparado': return 'default';
        case 'Listo para Entrega': return 'default';
        case 'Entregado': return 'outline';
        default: return 'default';
    }
};

export default function RepairClient({ initialRepairs }: RepairClientProps) {
  const [repairs, setRepairs] = useState<Repair[]>(initialRepairs);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);

  const handleOpenEditDialog = (repair: Repair) => {
    setSelectedRepair(repair);
    setEditDialogOpen(true);
  };
  
  const handleRepairAdded = (newRepair: Repair) => {
    setRepairs(prev => [newRepair, ...prev]);
  };

  const handleRepairUpdated = (updatedRepair: Repair) => {
    setRepairs(prev => 
      prev.map(r => r.id === updatedRepair.id ? updatedRepair : r)
    );
    setEditDialogOpen(false);
    setSelectedRepair(null);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Reparaciones</h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Reparación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-200px)]">
             <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Falla Reportada</TableHead>
                        <TableHead>Fecha de Ingreso</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Costo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {repairs.map((repair) => (
                    <TableRow key={repair.id}>
                        <TableCell>
                            <div className="font-medium">{repair.customerName}</div>
                            <div className="text-sm text-muted-foreground">{repair.customerPhone}</div>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{repair.deviceModel}</div>
                            <div className="text-sm text-muted-foreground">IMEI: {repair.deviceImei}</div>
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">{repair.reportedIssue}</TableCell>
                        <TableCell>
                            {format(repair.createdAt, "dd MMM yyyy, HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(repair.status)}>
                                {repair.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">${repair.cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(repair)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar Reparación</span>
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
      
      <AddRepairDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onRepairAdded={handleRepairAdded}
      />

      {selectedRepair && (
        <EditRepairDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setEditDialogOpen}
          repair={selectedRepair}
          onRepairUpdated={handleRepairUpdated}
        />
      )}
    </>
  );
}

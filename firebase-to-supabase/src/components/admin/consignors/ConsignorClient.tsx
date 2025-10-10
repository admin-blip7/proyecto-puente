"use client";

import { useState } from "react";
import { Consignor } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
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
import AddEditConsignorDialog from "./AddEditConsignorDialog";
import DeleteConsignorDialog from "./DeleteConsignorDialog";
import RegisterPaymentDialog from "./RegisterPaymentDialog";
import { DollarSign, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

interface ConsignorClientProps {
  initialConsignors: Consignor[];
}

export default function ConsignorClient({ initialConsignors }: ConsignorClientProps) {
  const [consignors, setConsignors] = useState<Consignor[]>(initialConsignors);
  const [selectedConsignor, setSelectedConsignor] = useState<Consignor | null>(null);
  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const handleOpenAddDialog = () => {
    setSelectedConsignor(null);
    setAddEditDialogOpen(true);
  };

  const handleOpenEditDialog = (consignor: Consignor) => {
    setSelectedConsignor(consignor);
    setAddEditDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (consignor: Consignor) => {
    setSelectedConsignor(consignor);
    setDeleteDialogOpen(true);
  };
  
  const handleOpenPaymentDialog = (consignor: Consignor) => {
    setSelectedConsignor(consignor);
    setPaymentDialogOpen(true);
  };

  const handleConsignorAdded = (newConsignor: Consignor) => {
    setConsignors(prev => [newConsignor, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
  };
  
  const handleConsignorUpdated = (updatedConsignor: Consignor) => {
      setConsignors(prev => prev.map(c => c.id === updatedConsignor.id ? updatedConsignor : c));
  };
  
  const handleConsignorDeleted = (consignorId: string) => {
      setConsignors(prev => prev.filter(c => c.id !== consignorId));
  };
  
  const handlePaymentRegistered = (consignorId: string, amountPaid: number) => {
      setConsignors(prev => prev.map(c => 
        c.id === consignorId 
            ? { ...c, balanceDue: c.balanceDue - amountPaid } 
            : c
      ));
  };


  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Gestión de Consignadores</h1>
        <Button onClick={handleOpenAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Consignador
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Consignadores</CardTitle>
           <CardDescription>
            Agrega, edita, elimina o registra pagos a tus consignadores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-250px)] w-full">
            <div className="relative w-full overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Información de Contacto</TableHead>
                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {consignors.map((consignor) => (
                        <TableRow key={consignor.id}>
                            <TableCell className="font-medium">{consignor.name}</TableCell>
                            <TableCell>{consignor.contactInfo}</TableCell>
                            <TableCell className="text-right font-semibold">
                                <div className="flex items-center justify-end">
                                    <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                                    {consignor.balanceDue.toFixed(2)}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Abrir menú</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenPaymentDialog(consignor)}>
                                            <DollarSign className="mr-2 h-4 w-4" />
                                            <span>Registrar Pago</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleOpenEditDialog(consignor)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Editar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenDeleteDialog(consignor)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Eliminar</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <AddEditConsignorDialog
        isOpen={isAddEditDialogOpen}
        onOpenChange={setAddEditDialogOpen}
        consignor={selectedConsignor}
        onConsignorAdded={handleConsignorAdded}
        onConsignorUpdated={handleConsignorUpdated}
      />
      {selectedConsignor && (
        <>
            <DeleteConsignorDialog
                isOpen={isDeleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                consignor={selectedConsignor}
                onConsignorDeleted={handleConsignorDeleted}
            />
            <RegisterPaymentDialog 
                isOpen={isPaymentDialogOpen}
                onOpenChange={setPaymentDialogOpen}
                consignor={selectedConsignor}
                onPaymentRegistered={handlePaymentRegistered}
            />
        </>
      )}
    </>
  );
}

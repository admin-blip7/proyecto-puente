"use client";

import { useState, useEffect } from "react";
import { Consignor } from "@/types";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, RefreshCw } from "lucide-react";
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
import RegisterPaymentDialog from "./RegisterPaymentDialogFixed";
import { DollarSign, MoreHorizontal, BarChart3, Receipt } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { getConsignors } from "@/lib/services/consignorService";

interface ConsignorClientProps {
  initialConsignors: Consignor[];
}

export default function ConsignorClient({ initialConsignors }: ConsignorClientProps) {
  // Remove duplicate consignors by ID to avoid React key conflicts
  const uniqueConsignors = initialConsignors.filter((consignor, index, self) => 
    index === self.findIndex(c => c.id === consignor.id)
  );
  
  const [consignors, setConsignors] = useState<Consignor[]>(uniqueConsignors);
  const [selectedConsignor, setSelectedConsignor] = useState<Consignor | null>(null);
  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

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
    console.log("Opening payment dialog for:", consignor.name);
    setSelectedConsignor(consignor);
    setPaymentDialogOpen(true);
  };

  const handleConsignorAdded = (newConsignor: Consignor) => {
    setConsignors(prev => {
      // Filter out any existing consignor with the same ID, then add the new one
      const filtered = prev.filter(c => c.id !== newConsignor.id);
      return [newConsignor, ...filtered].sort((a,b) => a.name.localeCompare(b.name));
    });
  };
  
  const handleConsignorUpdated = (updatedConsignor: Consignor) => {
      setConsignors(prev => {
        // Remove any existing consignor with the same ID, then update with the new one
        const filtered = prev.filter(c => c.id !== updatedConsignor.id);
        return [updatedConsignor, ...filtered];
      });
  };
  
  const handleConsignorDeleted = (consignorId: string) => {
      setConsignors(prev => prev.filter(c => c.id !== consignorId));
  };
  
  const handlePaymentRegistered = (consignorId: string, amountPaid: number) => {
      // Update local state immediately for UI feedback
      setConsignors(prev => prev.map(c =>
        (c.id === consignorId || c.firestore_id === consignorId)
            ? { ...c, balanceDue: c.balanceDue - amountPaid }
            : c
      ));
      
      // Delayed and conditional data refresh to prevent render conflicts
      setTimeout(() => {
        // Only refresh if the dialog is closed to avoid interference
        if (!isPaymentDialogOpen) {
          handleRefreshData();
        }
      }, 1500);
  };

  const handlePaymentDialogOpenChange = (open: boolean) => {
    setPaymentDialogOpen(open);
    if (!open) {
      setSelectedConsignor(null);
    }
  };

  const handleViewSalesReport = (consignor: Consignor) => {
    router.push(`/admin/consignors/${consignor.id}/sales-report`);
  };
  
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const refreshedConsignors = await getConsignors();
      // Remove duplicates by ID
      const uniqueRefreshed = refreshedConsignors.filter((consignor, index, self) => 
        index === self.findIndex(c => c.id === consignor.id)
      );
      setConsignors(uniqueRefreshed);
    } catch (error) {
      console.error('Error refreshing consignors:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consignadores</h1>
          <p className="text-muted-foreground">
            Gestiona los consignadores y sus balances
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/consignors/payments')}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Ver Pagos
          </Button>
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Agregar Consignador
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Consignadores</CardTitle>
          <CardDescription>
            {consignors.length} consignador{consignors.length !== 1 ? 'es' : ''} registrado{consignors.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Información de Contacto</TableHead>
                  <TableHead className="text-right">Balance Pendiente</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consignors.map((consignor) => (
                  <TableRow key={consignor.id}>
                    <TableCell className="font-medium">{consignor.name}</TableCell>
                    <TableCell>{consignor.contactInfo || 'No especificado'}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${consignor.balanceDue > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        ${consignor.balanceDue?.toFixed(2) || '0.00'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(consignor)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewSalesReport(consignor)}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Ver Reportes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleOpenPaymentDialog(consignor)}
                            disabled={consignor.balanceDue <= 0}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Registrar Pago
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleOpenDeleteDialog(consignor)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {consignors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No hay consignadores registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
      <DeleteConsignorDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          consignor={selectedConsignor}
          onConsignorDeleted={handleConsignorDeleted}
      />
      <RegisterPaymentDialog
          isOpen={isPaymentDialogOpen}
          onOpenChange={handlePaymentDialogOpenChange}
          consignor={selectedConsignor}
          onPaymentRegistered={handlePaymentRegistered}
      />
    </>
  );
}

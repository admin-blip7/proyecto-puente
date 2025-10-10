"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Eye, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Supplier } from "@/types";
import { getSuppliers, deleteSupplier, searchSuppliers } from "@/lib/services/supplierService";
import AddEditSupplierDialog from "./AddEditSupplierDialog";
import DeleteSupplierDialog from "./DeleteSupplierDialog";
import { useRouter } from "next/navigation";
import { getLogger } from "@/lib/logger";
import { formatCurrency } from "@/lib/utils";
const log = getLogger("SuppliersClient");

interface SuppliersClientProps {
  initialSuppliers: Supplier[];
}

export default function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();

  // Filtrar proveedores por término de búsqueda con debouncing
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setFilteredSuppliers(suppliers);
    } else {
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        supplier.contactInfo.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (supplier.notes && supplier.notes.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      );
      setFilteredSuppliers(filtered);
    }
  }, [debouncedSearchTerm, suppliers]);

  const refreshSuppliers = async () => {
    try {
      setLoading(true);
      const updatedSuppliers = await getSuppliers();
      setSuppliers(updatedSuppliers);
    } catch (error) {
      log.error("Error refreshing suppliers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar la lista de proveedores."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierAdded = (newSupplier: Supplier) => {
    setSuppliers(prev => [...prev, newSupplier]);
    setIsAddDialogOpen(false);
    toast({
      title: "✅ Proveedor agregado",
      description: `${newSupplier.name} ha sido agregado exitosamente.`
    });
  };

  const handleSupplierUpdated = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    setEditingSupplier(null);
    toast({
      title: "✅ Proveedor actualizado",
      description: `${updatedSupplier.name} ha sido actualizado exitosamente.`
    });
  };

  const handleSupplierDeleted = async (supplierId: string) => {
    try {
      await deleteSupplier(supplierId);
      setSuppliers(prev => prev.filter(s => s.id !== supplierId));
      setDeletingSupplier(null);
      toast({
        title: "✅ Proveedor eliminado",
        description: "El proveedor ha sido eliminado exitosamente."
      });
    } catch (error) {
      log.error("Error deleting supplier:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al eliminar el proveedor."
      });
    }
  };

  const handleViewDetails = (supplierId: string) => {
    router.push(`/admin/suppliers/${supplierId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
            <p className="text-muted-foreground">
              Gestiona tu base de datos de proveedores y su historial de compras
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Agregar Proveedor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compras Totales (Año)</CardTitle>
            <Badge variant="secondary">YTD</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(suppliers.reduce((sum, s) => sum + s.totalPurchasedYTD, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proveedor Principal</CardTitle>
            <Badge variant="outline">Top</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {suppliers.length > 0 
                ? suppliers.reduce((max, s) => s.totalPurchasedYTD > max.totalPurchasedYTD ? s : max).name
                : "N/A"
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
          <CardDescription>
            Busca y gestiona tus proveedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, contacto o notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Información de Contacto</TableHead>
                  <TableHead className="text-right">Total Comprado (Año)</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No se encontraron proveedores" : "No hay proveedores registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/admin/suppliers/${supplier.id}`)}
                          className="text-primary hover:underline font-medium"
                        >
                          {supplier.name}
                        </button>
                      </TableCell>
                      <TableCell>{supplier.contactInfo}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(supplier.totalPurchasedYTD)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {supplier.notes || "Sin notas"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(supplier.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSupplier(supplier)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingSupplier(supplier)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddEditSupplierDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSupplierSaved={handleSupplierAdded}
      />

      {editingSupplier && (
        <AddEditSupplierDialog
          isOpen={true}
          onClose={() => setEditingSupplier(null)}
          onSupplierSaved={handleSupplierUpdated}
          supplier={editingSupplier}
        />
      )}

      {deletingSupplier && (
        <DeleteSupplierDialog
          isOpen={true}
          onClose={() => setDeletingSupplier(null)}
          onConfirm={() => handleSupplierDeleted(deletingSupplier.id)}
          supplier={deletingSupplier}
        />
      )}
    </div>
  );
}
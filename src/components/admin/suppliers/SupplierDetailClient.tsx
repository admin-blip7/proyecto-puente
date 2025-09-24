"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Calendar,
  DollarSign,
  Package,
  Phone
} from "lucide-react";
import { Supplier } from "@/types";
import { updateSupplier } from "@/lib/services/supplierService";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLogger } from "@/lib/logger";
import { formatCurrency } from "@/lib/utils";
const log = getLogger("SupplierDetailClient");

interface SupplierDetailClientProps {
  supplier: Supplier;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: any;
  items?: any[];
}

export default function SupplierDetailClient({ supplier: initialSupplier }: SupplierDetailClientProps) {
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier>(initialSupplier);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(supplier.notes || "");
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPurchaseHistory();
  }, [supplier.id]);

  const loadPurchaseHistory = async () => {
    try {
      const q = query(
        collection(db, "purchase_orders"),
        where("supplier", "==", supplier.name),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const orders: PurchaseOrder[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          orderNumber: data.orderNumber,
          totalAmount: data.totalAmount || 0,
          status: data.status,
          createdAt: data.createdAt,
          items: data.items || []
        });
      });
      
      setPurchaseHistory(orders);
    } catch (error) {
      log.error("Error loading purchase history:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de compras",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotes = async () => {
    setIsLoading(true);
    try {
      const updatedSupplier = { ...supplier, notes };
      await updateSupplier(supplier.id, updatedSupplier);
      setSupplier(updatedSupplier);
      setIsEditingNotes(false);
      toast({
        title: "Éxito",
        description: "Notas actualizadas correctamente",
      });
    } catch (error) {
      log.error("Error updating notes:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar las notas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Usar el utilitario global MXN

  function formatDate(timestamp: any): any {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", variant: "secondary" as const },
      received: { label: "Recibida", variant: "default" as const },
      cancelled: { label: "Cancelada", variant: "destructive" as const },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{supplier.name}</h1>
            <p className="text-muted-foreground">
              Proveedor desde {formatDate(supplier.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del Proveedor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Información del Proveedor</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nombre</Label>
                  <p className="text-lg">{supplier.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Comprado (Año)</Label>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(supplier.totalPurchasedYTD)}
                  </p>
                </div>
              </div>

              {supplier.contactInfo && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Información de Contacto</Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.contactInfo}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Notas</span>
                {!isEditingNotes ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setNotes(supplier.notes || "");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isLoading}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingNotes ? (
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregar notas sobre el proveedor..."
                  rows={4}
                />
              ) : (
                <p className="text-muted-foreground">
                  {supplier.notes || "No hay notas disponibles"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas y Historial */}
        <div className="space-y-6">
          {/* Estadísticas Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Estadísticas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(supplier.totalPurchasedYTD)}
                </p>
                <p className="text-sm text-muted-foreground">Total Año Actual</p>
              </div>
              <Separator />
              <div className="text-center">
                <p className="text-xl font-semibold">{purchaseHistory.length}</p>
                <p className="text-sm text-muted-foreground">Órdenes de Compra</p>
              </div>
            </CardContent>
          </Card>

          {/* Historial de Compras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Historial Reciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {purchaseHistory.length > 0 ? (
                  purchaseHistory.slice(0, 5).map((order: PurchaseOrder) => (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm font-semibold text-primary">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      {order.items && (
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} productos
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No hay historial de compras
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
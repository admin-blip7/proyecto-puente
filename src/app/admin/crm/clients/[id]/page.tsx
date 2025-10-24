"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Edit,
    DollarSign,
    History,
    FileText,
    CheckSquare
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { CRMClient, CRMInteraction, CRMTask } from "@/types";
import { getCRMClientById, getCRMInteractions, getCRMTasks } from "@/lib/services/crmClientService";
import CRMClientForm from "@/components/admin/crm/CRMClientForm";

export default function CRMClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [client, setClient] = useState<CRMClient | null>(null);
    const [interactions, setInteractions] = useState<CRMInteraction[]>([]);
    const [tasks, setTasks] = useState<CRMTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);

    useEffect(() => {
        loadClientData();
    }, [params.id]);

    const loadClientData = async () => {
        try {
            const clientId = params.id as string;
            const [clientData, interactionsData, tasksData] = await Promise.all([
                getCRMClientById(clientId),
                getCRMInteractions(clientId),
                getCRMTasks({ clientId })
            ]);

            if (!clientData) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Cliente no encontrado."
                });
                router.push("/admin/crm");
                return;
            }

            setClient(clientData);
            setInteractions(interactionsData);
            setTasks(tasksData);
        } catch (error) {
            console.error("Error loading client data:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo cargar la información del cliente."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClientUpdated = (updatedClient: CRMClient) => {
        setClient(updatedClient);
        setIsEditFormOpen(false);
        toast({
            title: "Cliente actualizado",
            description: "La información del cliente ha sido actualizada."
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN"
        }).format(amount);
    };

    const getInteractionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            sale: "Venta",
            repair: "Reparación",
            credit_payment: "Pago de Crédito",
            warranty: "Garantía",
            contact: "Contacto",
            consignment: "Consignación",
            follow_up: "Seguimiento"
        };
        return labels[type] || type;
    };

    const getTaskPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            low: "bg-gray-100 text-gray-800",
            medium: "bg-blue-100 text-blue-800",
            high: "bg-orange-100 text-orange-800",
            urgent: "bg-red-100 text-red-800"
        };
        return colors[priority] || "bg-gray-100 text-gray-800";
    };

    const getTaskStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800",
            in_progress: "bg-blue-100 text-blue-800",
            completed: "bg-green-100 text-green-800",
            cancelled: "bg-gray-100 text-gray-800"
        };
        return colors[status] || "bg-gray-100 text-gray-800";
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!client) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => router.push("/admin/crm")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {client.firstName} {client.lastName}
                        </h1>
                        <p className="text-muted-foreground">
                            Código: {client.clientCode} | ID: {client.identificationNumber}
                        </p>
                    </div>
                </div>
                <Button onClick={() => setIsEditFormOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                </Button>
            </div>

            {/* Client Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Personal Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <User className="h-5 w-5" />
                            Información Personal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Nombre Completo</p>
                            <p className="font-medium">
                                {client.firstName} {client.lastName}
                            </p>
                        </div>
                        {client.companyName && (
                            <div>
                                <p className="text-sm text-muted-foreground">Empresa</p>
                                <p className="font-medium">{client.companyName}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-muted-foreground">Identificación</p>
                            <p className="font-medium">
                                {client.identificationType}: {client.identificationNumber}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Tipo de Cliente</p>
                            <Badge variant="outline">
                                {client.clientType === 'particular' ? 'Particular' :
                                 client.clientType === 'empresa' ? 'Empresa' : 'Recurrente'}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Estado</p>
                            <Badge className={
                                client.clientStatus === 'active' ? 'bg-green-100 text-green-800' :
                                client.clientStatus === 'inactive' ? 'bg-gray-100 text-gray-800' :
                                client.clientStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }>
                                {client.clientStatus === 'active' ? 'Activo' :
                                 client.clientStatus === 'inactive' ? 'Inactivo' :
                                 client.clientStatus === 'pending' ? 'Pendiente' : 'Lista Negra'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Phone className="h-5 w-5" />
                            Información de Contacto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {client.phone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Teléfono Principal</p>
                                    <p className="font-medium">{client.phone}</p>
                                </div>
                            </div>
                        )}
                        {client.secondaryPhone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Teléfono Secundario</p>
                                    <p className="font-medium">{client.secondaryPhone}</p>
                                </div>
                            </div>
                        )}
                        {client.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{client.email}</p>
                                </div>
                            </div>
                        )}
                        {(client.address || client.city) && (
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Dirección</p>
                                    <p className="font-medium">
                                        {client.address && `${client.address}`}
                                        {client.address && client.city && ", "}
                                        {client.city && client.city}
                                        {client.city && client.province && ", "}
                                        {client.province && client.province}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Financial Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <DollarSign className="h-5 w-5" />
                            Información Financiera
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Compras Totales</p>
                            <p className="text-xl font-bold text-green-600">
                                {formatCurrency(client.totalPurchases)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Balance Pendiente</p>
                            <p className={`text-xl font-bold ${client.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(client.outstandingBalance)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Límite de Crédito</p>
                            <p className="font-medium">
                                {formatCurrency(client.creditLimit)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                                <p className="font-medium">
                                    {format(new Date(client.registrationDate), 'dd/MM/yyyy', { locale: es })}
                                </p>
                            </div>
                        </div>
                        {client.lastContactDate && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Último Contacto</p>
                                    <p className="font-medium">
                                        {format(new Date(client.lastContactDate), 'dd/MM/yyyy', { locale: es })}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for History, Tasks, Documents */}
            <Tabs defaultValue="history" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Historial
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Tareas
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Interacciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {interactions.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No hay interacciones registradas
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {interactions.map((interaction) => (
                                        <div key={interaction.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                            <div className="mt-1">
                                                <Badge variant="outline">
                                                    {getInteractionTypeLabel(interaction.interactionType)}
                                                </Badge>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-medium">{interaction.description}</p>
                                                    {interaction.amount && (
                                                        <span className="font-medium text-green-600">
                                                            {formatCurrency(interaction.amount)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(interaction.interactionDate), 'dd/MM/yyyy HH:mm', { locale: es })}
                                                </p>
                                                {interaction.metadata && Object.keys(interaction.metadata).length > 0 && (
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        {Object.entries(interaction.metadata).map(([key, value]) => (
                                                            <span key={key} className="mr-4">
                                                                {key}: {String(value)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tareas Asignadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {tasks.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No hay tareas asignadas
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {tasks.map((task) => (
                                        <div key={task.id} className="flex items-start gap-4 p-4 border rounded-lg">
                                            <div className="mt-1 space-y-1">
                                                <Badge className={getTaskPriorityColor(task.priority)}>
                                                    {task.priority === 'low' ? 'Baja' :
                                                     task.priority === 'medium' ? 'Media' :
                                                     task.priority === 'high' ? 'Alta' : 'Urgente'}
                                                </Badge>
                                                <Badge className={getTaskStatusColor(task.status)}>
                                                    {task.status === 'pending' ? 'Pendiente' :
                                                     task.status === 'in_progress' ? 'En Progreso' :
                                                     task.status === 'completed' ? 'Completada' : 'Cancelada'}
                                                </Badge>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{task.title}</p>
                                                {task.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {task.description}
                                                    </p>
                                                )}
                                                {task.dueDate && (
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        Vencimiento: {format(new Date(task.dueDate), 'dd/MM/yyyy', { locale: es })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Documentos del Cliente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-8">
                                Funcionalidad de documentos próximamente disponible
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Form Dialog */}
            {client && (
                <CRMClientForm
                    isOpen={isEditFormOpen}
                    onOpenChange={setIsEditFormOpen}
                    client={client}
                    onClientSaved={handleClientUpdated}
                />
            )}
        </div>
    );
}
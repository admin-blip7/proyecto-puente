"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, User, Phone, Mail, Calendar, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { CRMClient, ClientType, CRMClientStatus } from "@/types";
import { getCRMClients, deleteCRMClient } from "@/lib/services/crmClientService";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { formatCurrencyWithPreferences, getDateFnsLocale } from "@/lib/appPreferences";

interface ClientFilters {
    searchTerm: string;
    clientType: string;
    clientStatus: string;
    tags: string[];
}

export default function CRMClientList() {
    const [clients, setClients] = useState<CRMClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<ClientFilters>({
        searchTerm: "",
        clientType: "all",
        clientStatus: "all",
        tags: []
    });
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 10,
        total: 0
    });
    const { toast } = useToast();
    const router = useRouter();

    // Cargar datos iniciales
    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            setLoading(true);
            const clientsData = await getCRMClients({
                search: filters.searchTerm || undefined,
                clientType: filters.clientType !== "all" ? filters.clientType as ClientType : undefined,
                clientStatus: filters.clientStatus !== "all" ? filters.clientStatus as CRMClientStatus : undefined,
                tags: filters.tags.length > 0 ? filters.tags : undefined,
                limit: 100
            });
            setClients(clientsData);
            setPagination(prev => ({ ...prev, total: clientsData.length }));
        } catch (error) {
            console.error("Error loading clients:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los clientes."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        loadClients();
    };

    const handleDeleteClient = async (clientId: string) => {
        if (!confirm("¿Está seguro de que desea eliminar este cliente? Esta acción no se puede deshacer.")) {
            return;
        }

        try {
            await deleteCRMClient(clientId);
            setClients(prev => prev.filter(c => c.id !== clientId));
            toast({
                title: "Cliente eliminado",
                description: "El cliente ha sido eliminado correctamente."
            });
        } catch (error) {
            console.error("Error deleting client:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo eliminar el cliente."
            });
        }
    };

    const handleViewClient = (clientId: string) => {
        router.push(`/admin/crm/clients/${clientId}`);
    };

    const handleEditClient = (clientId: string) => {
        router.push(`/admin/crm/clients/${clientId}/edit`);
    };

    const getClientTypeBadge = (type: ClientType) => {
        const variants: Record<ClientType, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            particular: { label: "Particular", variant: "default" },
            empresa: { label: "Empresa", variant: "secondary" },
            recurrente: { label: "Recurrente", variant: "outline" }
        };
        const config = variants[type];
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getClientStatusBadge = (status: CRMClientStatus) => {
        const variants: Record<CRMClientStatus, { label: string; className?: string }> = {
            active: { label: "Activo", className: "bg-green-100 text-green-800" },
            inactive: { label: "Inactivo", className: "bg-gray-100 text-gray-800" },
            pending: { label: "Pendiente", className: "bg-yellow-100 text-yellow-800" },
            blacklisted: { label: "Lista Negra", className: "bg-red-100 text-red-800" }
        };
        const config = variants[status];
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    const formatCurrency = (amount: number) => {
        return formatCurrencyWithPreferences(amount);
    };

    const filteredClients = clients; // Already filtered on server side
    const paginatedClients = filteredClients.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize
    );

    return (
        <Card className="h-full">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Gestión de Clientes CRM
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Total: {clients.length} clientes registrados
                        </p>
                    </div>
                    <Button onClick={() => router.push('/admin/crm/clients/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Cliente
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Search className="h-4 w-4" />
                            Búsqueda
                        </div>
                        <Input
                            placeholder="Buscar por nombre, email, teléfono..."
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="h-8"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Filter className="h-4 w-4" />
                            Tipo de Cliente
                        </div>
                        <Select
                            value={filters.clientType}
                            onValueChange={(value) => handleFilterChange('clientType', value)}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Todos los tipos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los tipos</SelectItem>
                                <SelectItem value="particular">Particular</SelectItem>
                                <SelectItem value="empresa">Empresa</SelectItem>
                                <SelectItem value="recurrente">Recurrente</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Filter className="h-4 w-4" />
                            Estado
                        </div>
                        <Select
                            value={filters.clientStatus}
                            onValueChange={(value) => handleFilterChange('clientStatus', value)}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Todos los estados" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="active">Activo</SelectItem>
                                <SelectItem value="inactive">Inactivo</SelectItem>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="blacklisted">Lista Negra</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="h-4 w-4" />
                            Acciones
                        </div>
                        <Button onClick={applyFilters} className="h-8 w-full">
                            Aplicar Filtros
                        </Button>
                    </div>
                </div>

                {/* Tabla de Clientes */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Código</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Compras Totales</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead>Registro</TableHead>
                                <TableHead className="w-[100px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                            Cargando clientes...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedClients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8">
                                        <div className="text-muted-foreground">
                                            {filters.searchTerm || filters.clientType !== "all" || filters.clientStatus !== "all"
                                                ? 'No se encontraron clientes con los filtros aplicados.'
                                                : 'No hay clientes registrados.'
                                            }
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedClients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">{client.clientCode}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">
                                                    {client.firstName} {client.lastName}
                                                </div>
                                                {client.companyName && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {client.companyName}
                                                    </div>
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    {client.identificationType}: {client.identificationNumber}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {client.phone && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Phone className="h-3 w-3" />
                                                        {client.phone}
                                                    </div>
                                                )}
                                                {client.email && (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Mail className="h-3 w-3" />
                                                        <span className="truncate max-w-[150px]">{client.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getClientTypeBadge(client.clientType)}
                                        </TableCell>
                                        <TableCell>
                                            {getClientStatusBadge(client.clientStatus)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(client.totalPurchases)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={client.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                                                {formatCurrency(client.outstandingBalance)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {format(new Date(client.registrationDate), 'dd/MM/yyyy', { locale: getDateFnsLocale() })}
                                            </div>
                                            {client.lastContactDate && (
                                                <div className="text-xs text-muted-foreground">
                                                    Contacto: {format(new Date(client.lastContactDate), 'dd/MM/yyyy', { locale: getDateFnsLocale() })}
                                                </div>
                                            )}
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
                                                    <DropdownMenuItem onClick={() => handleViewClient(client.id)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Ver Detalle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEditClient(client.id)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClient(client.id)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Paginación */}
                {filteredClients.length > pagination.pageSize && (
                    <CardFooter className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{' '}
                            {Math.min(pagination.page * pagination.pageSize, filteredClients.length)} de{' '}
                            {filteredClients.length} clientes
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={pagination.page === 1}
                            >
                                Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(Math.ceil(filteredClients.length / pagination.pageSize), prev.page + 1) }))}
                                disabled={pagination.page >= Math.ceil(filteredClients.length / pagination.pageSize)}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </CardFooter>
                )}
            </CardContent>
        </Card>
    );
}

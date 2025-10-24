"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, Calendar, User, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ConsignorPayment, Consignor } from "@/types";
import { getAllConsignorPayments } from "@/lib/services/paymentService";
import { getConsignors } from "@/lib/services/consignorService";

interface PaymentFilters {
    searchTerm: string;
    consignorId: string;
    paymentMethod: string;
    dateRange: {
        start: string;
        end: string;
    };
}

export default function ConsignorPaymentsClient() {
    const [payments, setPayments] = useState<ConsignorPayment[]>([]);
    const [consignors, setConsignors] = useState<Consignor[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<PaymentFilters>({
        searchTerm: "",
        consignorId: "",
        paymentMethod: "",
        dateRange: {
            start: "",
            end: ""
        }
    });
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 10,
        total: 0
    });
    const { toast } = useToast();

    // Cargar datos iniciales
    useEffect(() => {
        loadPayments();
        loadConsignors();
    }, []);

    const loadConsignors = async () => {
        try {
            const consignorsData = await getConsignors();
            setConsignors(consignorsData);
        } catch (error) {
            console.error("Error loading consignors:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los consignadores."
            });
        }
    };

    const loadPayments = async () => {
        try {
            setLoading(true);
            const paymentsData = await getAllConsignorPayments();
            setPayments(paymentsData);
            setPagination(prev => ({ ...prev, total: paymentsData.length }));
        } catch (error) {
            console.error("Error loading payments:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los pagos de consignadores."
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleDateRangeChange = (key: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            dateRange: { ...prev.dateRange, [key]: value }
        }));
    };

    const applyFilters = () => {
        let filtered = payments;

        // Filter by search term
        if (filters.searchTerm) {
            filtered = filtered.filter(payment =>
                payment.paymentId.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                payment.notes?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                consignors.find(c => c.id === payment.consignorId)?.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
            );
        }

        // Filter by consignor
        if (filters.consignorId) {
            filtered = filtered.filter(payment => payment.consignorId === filters.consignorId);
        }

        // Filter by payment method
        if (filters.paymentMethod) {
            filtered = filtered.filter(payment => payment.paymentMethod === filters.paymentMethod);
        }

        // Filter by date range
        if (filters.dateRange.start && filters.dateRange.end) {
            filtered = filtered.filter(payment => {
                const paymentDate = new Date(payment.paymentDate);
                const start = new Date(filters.dateRange.start);
                const end = new Date(filters.dateRange.end);
                return paymentDate >= start && paymentDate <= end;
            });
        }

        return filtered;
    };

    const exportPayments = async () => {
        try {
            const filteredPayments = applyFilters();
            const csvContent = convertPaymentsToCSV(filteredPayments);
            
            // Create and download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `pagos-consignadores-${format(new Date(), 'yyyy-MM-dd')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Exportación exitosa",
                description: `Se exportaron ${filteredPayments.length} pagos a CSV.`
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo exportar los pagos."
            });
        }
    };

    const convertPaymentsToCSV = (payments: ConsignorPayment[]) => {
        const headers = ['ID Pago', 'Consignador', 'Monto', 'Método', 'Fecha', 'Estado', 'Notas'];
        const csvRows = [
            headers.join(','),
            ...payments.map(payment => {
                const consignor = consignors.find(c => c.id === payment.consignorId);
                return [
                    payment.paymentId,
                    consignor?.name || 'Desconocido',
                    `$${payment.amountPaid.toFixed(2)}`,
                    payment.paymentMethod,
                    format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: es }),
                    payment.proofOfPaymentUrl ? 'Realizado' : 'Guardado',
                    `"${payment.notes || ''}"`
                ].join(',');
            })
        ];
        return csvRows.join('\n');
    };

    const getConsignorName = (consignorId: string) => {
        const consignor = consignors.find(c => c.id === consignorId);
        return consignor?.name || 'Desconocido';
    };

    const getStatusBadge = (payment: ConsignorPayment) => {
        if (payment.proofOfPaymentUrl) {
            return <Badge className="bg-green-100 text-green-800">Realizado</Badge>;
        }
        return <Badge variant="secondary">Guardado</Badge>;
    };

    const filteredPayments = applyFilters();
    const paginatedPayments = filteredPayments.slice(
        (pagination.page - 1) * pagination.pageSize,
        pagination.page * pagination.pageSize
    );

    return (
        <Card className="h-full">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            Historial de Pagos
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Total: {payments.length} pagos registrados
                        </p>
                    </div>
                    <Button onClick={exportPayments} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Exportar CSV
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Search className="h-4 w-4" />
                            Búsqueda
                        </div>
                        <Input
                            placeholder="Buscar por ID, nombre o notas..."
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="h-8"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <User className="h-4 w-4" />
                            Consignador
                        </div>
                        <Select
                            value={filters.consignorId}
                            onValueChange={(value) => handleFilterChange('consignorId', value)}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Todos los consignadores" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Todos los consignadores</SelectItem>
                                {consignors.map(consignor => (
                                    <SelectItem key={consignor.id} value={consignor.id}>
                                        {consignor.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Filter className="h-4 w-4" />
                            Método de Pago
                        </div>
                        <Select
                            value={filters.paymentMethod}
                            onValueChange={(value) => handleFilterChange('paymentMethod', value)}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Todos los métodos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Todos los métodos</SelectItem>
                                <SelectItem value="Transferencia Bancaria">Transferencia</SelectItem>
                                <SelectItem value="Efectivo">Efectivo</SelectItem>
                                <SelectItem value="Depósito">Depósito</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <Calendar className="h-4 w-4" />
                            Rango de Fechas
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Input
                                type="date"
                                placeholder="Inicio"
                                value={filters.dateRange.start}
                                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                                className="h-8 text-sm"
                            />
                            <Input
                                type="date"
                                placeholder="Fin"
                                value={filters.dateRange.end}
                                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Tabla de Pagos */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">ID Pago</TableHead>
                                <TableHead>Consignador</TableHead>
                                <TableHead className="w-[100px]">Monto</TableHead>
                                <TableHead className="w-[120px]">Método</TableHead>
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead className="w-[80px]">Estado</TableHead>
                                <TableHead>Notas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                            Cargando pagos...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedPayments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <div className="text-muted-foreground">
                                            {filters.searchTerm || filters.consignorId || filters.paymentMethod || filters.dateRange.start || filters.dateRange.end 
                                                ? 'No se encontraron pagos con los filtros aplicados.' 
                                                : 'No hay pagos registrados.'
                                            }
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPayments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">{payment.paymentId}</TableCell>
                                        <TableCell>{getConsignorName(payment.consignorId)}</TableCell>
                                        <TableCell className="font-semibold text-green-600">
                                            ${payment.amountPaid.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{payment.paymentMethod}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: es })}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(payment)}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {payment.notes || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Paginación */}
                {filteredPayments.length > pagination.pageSize && (
                    <CardFooter className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{' '}
                            {Math.min(pagination.page * pagination.pageSize, filteredPayments.length)} de{' '}
                            {filteredPayments.length} pagos
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
                                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(Math.ceil(filteredPayments.length / pagination.pageSize), prev.page + 1) }))}
                                disabled={pagination.page >= Math.ceil(filteredPayments.length / pagination.pageSize)}
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
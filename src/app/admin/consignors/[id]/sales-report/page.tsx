'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarIcon,
  DownloadIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
  SearchIcon,
  DollarSignIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  FileTextIcon,
  ArrowLeftIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportToPDF, exportToExcel } from '@/lib/utils/exportUtils';
import { useRouter } from 'next/navigation';

interface SaleItem {
  productId: string;
  productName: string;
  name: string;
  quantity: number;
  priceAtSale: number;
  currentPrice?: number;
  serials?: string[];
}

interface Sale {
  id: string;
  createdAt: string;
  total: number;
  payment_method: string;
  items: SaleItem[];
  itemCount: number;
  totalQuantity: number;
  client?: {
    name: string;
    email: string;
  };
  cash_session_id: string;
}

interface ConsignorSalesData {
  consignor: {
    id: string;
    name: string;
  };
  sales: Sale[];
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalQuantity: number;
    averageSaleAmount: number;
    consignorName: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export default function ConsignorSalesReportPage() {
  const params = useParams();
  const consignorId = params.id as string;
  const router = useRouter();

  const [data, setData] = useState<ConsignorSalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/consignors/${consignorId}/sales-report?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar el reporte de ventas');
      }

      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (consignorId) {
      fetchSalesData();
    }
  }, [consignorId, currentPage, sortBy, sortOrder, startDate, endDate]);

  const handleExportPDF = async () => {
    if (!data) return;
    
    const filters = {
      startDate,
      endDate,
      searchTerm,
      paymentMethodFilter,
    };
    
    exportToPDF(data, filters);
  };

  const handleExportExcel = async () => {
    if (!data) return;
    
    const filters = {
      startDate,
      endDate,
      searchTerm,
      paymentMethodFilter,
    };
    
    exportToExcel(data, filters);
  };

  const filteredSales = data?.sales.filter(sale => {
    const matchesSearch = searchTerm === '' || 
      sale.items.some(item => 
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      sale.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPaymentMethod = paymentMethodFilter === 'all' ||
      sale.payment_method === paymentMethodFilter;

    return matchesSearch && matchesPaymentMethod;
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: any) => {
    let date: Date;

    // Handle Firestore timestamp format
    if (dateString && typeof dateString === 'object' && '_seconds' in dateString) {
      date = new Date(dateString._seconds * 1000);
    }
    // Handle ISO string format
    else if (typeof dateString === 'string') {
      date = new Date(dateString);
    }
    // Handle Date object
    else if (dateString instanceof Date) {
      date = dateString;
    }
    // Default fallback
    else {
      return 'Fecha no disponible';
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }

    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'cash': 'default',
      'card': 'secondary',
      'transfer': 'outline',
      'credit': 'destructive',
    };
    
    const labels: Record<string, string> = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'credit': 'Crédito',
    };

    return (
      <Badge variant={variants[method] || 'outline'}>
        {labels[method] || method}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando reporte de ventas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">Error al cargar el reporte</p>
              <p className="text-red-500 text-sm mt-2">{error}</p>
              <Button 
                onClick={fetchSalesData} 
                variant="outline" 
                className="mt-4"
              >
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Regresar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Reporte de Ventas
            </h1>
            <p className="text-gray-600 mt-1">
              {data?.consignor.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileTextIcon className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Ventas</p>
                  <p className="text-2xl font-bold">{data.summary.totalSales}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSignIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUpIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Promedio por Venta</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.summary.averageSaleAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">#</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Productos Vendidos</p>
                  <p className="text-2xl font-bold">{data.summary.totalQuantity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Producto, cliente, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentMethod">Método de Pago</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="credit">Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
                setPaymentMethodFilter('all');
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Ventas Detalladas</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="sortBy" className="text-sm">Ordenar por:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Fecha</SelectItem>
                  <SelectItem value="total">Monto</SelectItem>
                  <SelectItem value="payment_method">Método de Pago</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>ID Venta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Método de Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No se encontraron ventas con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        {formatDate(sale.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {sale.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {sale.client?.name || 'Cliente General'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {sale.items.map((item, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{item.productName}</span>
                              <span className="text-gray-500 ml-2">
                                ({item.quantity}x {formatCurrency(item.priceAtSale)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sale.totalQuantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodBadge(sale.payment_method)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data?.pagination && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-600">
                Mostrando {filteredSales.length} de {data.pagination.total} ventas
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!data.pagination.hasMore}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
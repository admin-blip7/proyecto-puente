import { generateReportPdf } from '../services/pdfReportService';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatCurrencyWithPreferences, getDateFnsLocale } from '@/lib/appPreferences';

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
}

const formatCurrency = (amount: number) => {
  return formatCurrencyWithPreferences(amount);
};

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: getDateFnsLocale() });
};

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    'cash': 'Efectivo',
    'card': 'Tarjeta',
    'transfer': 'Transferencia',
    'credit': 'Crédito',
  };
  return labels[method] || method;
};

export const exportToPDF = async (data: ConsignorSalesData, filters?: {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  paymentMethodFilter?: string;
}) => {
  const details: string[] = [];
  if (filters) {
    if (filters.startDate) details.push(`Desde: ${formatDate(filters.startDate)}`);
    if (filters.endDate) details.push(`Hasta: ${formatDate(filters.endDate)}`);
    if (filters.searchTerm) details.push(`Búsqueda: ${filters.searchTerm}`);
    if (filters.paymentMethodFilter) details.push(`Método: ${getPaymentMethodLabel(filters.paymentMethodFilter)}`);
  }

  const summary = [
    { label: 'Total de Ventas', value: data.summary.totalSales.toString() },
    { label: 'Ingresos Totales', value: formatCurrency(data.summary.totalRevenue) },
    { label: 'Productos Vendidos', value: data.summary.totalQuantity.toString() },
    { label: 'Promedio por Venta', value: formatCurrency(data.summary.averageSaleAmount) }
  ];

  const headers = ['Fecha', 'ID Venta', 'Cliente', 'Productos', 'Cant', 'Total', 'Método'];
  const rows = data.sales.map(sale => [
    formatDate(sale.createdAt),
    sale.id.slice(0, 8) + '...',
    sale.client?.name || 'General',
    sale.items.map(item => `${item.productName.substring(0, 20)} (${item.quantity})`).join(', '),
    sale.totalQuantity.toString(),
    formatCurrency(sale.total),
    getPaymentMethodLabel(sale.payment_method)
  ]);

  // Approximate column weights
  const columnWidths = [15, 12, 18, 25, 8, 12, 10];

  try {
    const pdfBlob = await generateReportPdf({
      title: 'Reporte de Ventas',
      subtitle: `Consignador: ${data.consignor.name}`,
      details,
      summary,
      table: {
        headers,
        rows,
        columnWidths
      },
      filename: `reporte-ventas-${data.consignor.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    });

    // Trigger download
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-ventas-${data.consignor.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error generating PDF report:", error);
  }
};

export const exportToExcel = (data: ConsignorSalesData, filters?: {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  paymentMethodFilter?: string;
}) => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Reporte de Ventas por Consignador'],
    [''],
    ['Consignador:', data.consignor.name],
    ['Generado el:', formatDate(new Date().toISOString())],
    [''],
    ['RESUMEN'],
    ['Total de Ventas:', data.summary.totalSales],
    ['Ingresos Totales:', data.summary.totalRevenue],
    ['Productos Vendidos:', data.summary.totalQuantity],
    ['Promedio por Venta:', data.summary.averageSaleAmount],
  ];

  // Add filters if applied
  if (filters) {
    summaryData.push(['']);
    summaryData.push(['FILTROS APLICADOS']);

    if (filters.startDate) summaryData.push(['Fecha Inicio:', formatDate(filters.startDate)]);
    if (filters.endDate) summaryData.push(['Fecha Fin:', formatDate(filters.endDate)]);
    if (filters.searchTerm) summaryData.push(['Búsqueda:', filters.searchTerm]);
    if (filters.paymentMethodFilter) summaryData.push(['Método de Pago:', getPaymentMethodLabel(filters.paymentMethodFilter)]);
  }

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  // Sales detail sheet
  const salesHeaders = [
    'Fecha',
    'ID Venta',
    'Cliente',
    'Producto',
    'Cantidad',
    'Precio Unitario',
    'Subtotal',
    'Total Venta',
    'Método de Pago',
    'Sesión de Caja'
  ];

  const salesData = [salesHeaders];

  data.sales.forEach(sale => {
    sale.items.forEach((item, index) => {
      salesData.push([
        formatDate(sale.createdAt),
        sale.id,
        sale.client?.name || 'Cliente General',
        item.productName,
        item.quantity.toString(),
        item.priceAtSale.toString(),
        (item.quantity * item.priceAtSale).toString(),
        index === 0 ? sale.total.toString() : '', // Only show total on first item
        index === 0 ? getPaymentMethodLabel(sale.payment_method) : '',
        index === 0 ? sale.cash_session_id : ''
      ]);
    });
  });

  const salesWs = XLSX.utils.aoa_to_sheet(salesData);

  // Set column widths
  const colWidths = [
    { wch: 18 }, // Fecha
    { wch: 15 }, // ID Venta
    { wch: 20 }, // Cliente
    { wch: 30 }, // Producto
    { wch: 10 }, // Cantidad
    { wch: 15 }, // Precio Unitario
    { wch: 15 }, // Subtotal
    { wch: 15 }, // Total Venta
    { wch: 15 }, // Método de Pago
    { wch: 20 }, // Sesión de Caja
  ];

  salesWs['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, salesWs, 'Detalle de Ventas');

  // Save the Excel file
  const fileName = `reporte-ventas-${data.consignor.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

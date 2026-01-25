import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
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

export const exportToPDF = (data: ConsignorSalesData, filters?: {
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  paymentMethodFilter?: string;
}) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('Reporte de Ventas por Consignador', 20, 20);

  doc.setFontSize(14);
  doc.text(`Consignador: ${data.consignor.name}`, 20, 35);

  doc.setFontSize(10);
  doc.text(`Generado el: ${formatDate(new Date().toISOString())}`, 20, 45);

  // Filters applied
  if (filters) {
    let filtersText = 'Filtros aplicados: ';
    const appliedFilters = [];

    if (filters.startDate) appliedFilters.push(`Desde: ${formatDate(filters.startDate)}`);
    if (filters.endDate) appliedFilters.push(`Hasta: ${formatDate(filters.endDate)}`);
    if (filters.searchTerm) appliedFilters.push(`Búsqueda: ${filters.searchTerm}`);
    if (filters.paymentMethodFilter) appliedFilters.push(`Método: ${getPaymentMethodLabel(filters.paymentMethodFilter)}`);

    if (appliedFilters.length > 0) {
      filtersText += appliedFilters.join(', ');
      doc.text(filtersText, 20, 55);
    }
  }

  // Summary section
  const summaryY = filters && (filters.startDate || filters.endDate || filters.searchTerm || filters.paymentMethodFilter) ? 70 : 60;

  doc.setFontSize(12);
  doc.text('Resumen:', 20, summaryY);

  doc.setFontSize(10);
  doc.text(`Total de Ventas: ${data.summary.totalSales}`, 20, summaryY + 10);
  doc.text(`Ingresos Totales: ${formatCurrency(data.summary.totalRevenue)}`, 20, summaryY + 20);
  doc.text(`Productos Vendidos: ${data.summary.totalQuantity}`, 20, summaryY + 30);
  doc.text(`Promedio por Venta: ${formatCurrency(data.summary.averageSaleAmount)}`, 20, summaryY + 40);

  // Sales table
  const tableStartY = summaryY + 55;

  const tableData = data.sales.map(sale => [
    formatDate(sale.createdAt),
    sale.id.slice(0, 8) + '...',
    sale.client?.name || 'Cliente General',
    sale.items.map(item => `${item.productName} (${item.quantity})`).join(', '),
    sale.totalQuantity.toString(),
    formatCurrency(sale.total),
    getPaymentMethodLabel(sale.payment_method)
  ]);

  autoTable(doc, {
    head: [['Fecha', 'ID Venta', 'Cliente', 'Productos', 'Cantidad', 'Total', 'Método de Pago']],
    body: tableData,
    startY: tableStartY,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Fecha
      1: { cellWidth: 20 }, // ID
      2: { cellWidth: 30 }, // Cliente
      3: { cellWidth: 50 }, // Productos
      4: { cellWidth: 15 }, // Cantidad
      5: { cellWidth: 25 }, // Total
      6: { cellWidth: 25 }, // Método
    },
    margin: { top: 20, right: 20, bottom: 20, left: 20 },
  });

  // Save the PDF
  const fileName = `reporte-ventas-${data.consignor.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
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
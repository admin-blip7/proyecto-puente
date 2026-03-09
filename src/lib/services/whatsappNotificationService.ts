import { CashSession, Sale } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BuildCorteMessageOptions {
  session: CashSession;
  sales?: Sale[];
  branchName: string;
}

export function buildCorteMessage({ session, sales = [], branchName }: BuildCorteMessageOptions): string {
  const dateStr = format(
    new Date(session.closedAt ?? session.openedAt),
    'dd/MM/yyyy HH:mm',
    { locale: es }
  );

  const cashTotal = session.totalCashSales ?? 0;
  const cardTotal = session.totalCardSales ?? 0;
  const grandTotal = cashTotal + cardTotal;

  // Aggregate non-cancelled sales by product name
  const productMap: Record<string, { qty: number; total: number }> = {};
  for (const sale of sales) {
    if (sale.status === 'cancelled') continue;
    for (const item of sale.items) {
      const key = item.name;
      if (!productMap[key]) productMap[key] = { qty: 0, total: 0 };
      productMap[key].qty += item.quantity;
      productMap[key].total += item.priceAtSale * item.quantity;
    }
  }

  const productLines = Object.entries(productMap)
    .slice(0, 20) // cap at 20 lines for readability
    .map(([name, v]) => `  • ${v.qty}x ${name.substring(0, 25)}: $${v.total.toFixed(2)}`)
    .join('\n');

  const lines = [
    `*CORTE DE CAJA - ${branchName}*`,
    `Fecha: ${dateStr}`,
    `Cajero: ${session.openedByName}`,
    ``,
    `*Ventas:*`,
    `  Efectivo: $${cashTotal.toFixed(2)}`,
    `  Tarjeta:  $${cardTotal.toFixed(2)}`,
    `  *Total:   $${grandTotal.toFixed(2)}*`,
  ];

  if (productLines) {
    lines.push(``, `*Productos vendidos:*`, productLines);
  }

  lines.push(``, `_Mensaje automático generado al cerrar turno._`);

  return lines.join('\n');
}

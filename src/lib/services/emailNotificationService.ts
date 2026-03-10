import { Resend } from 'resend';
import { CashSession, Sale } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BuildCorteEmailOptions {
  session: CashSession;
  sales?: Sale[];
  branchName: string;
}

export function buildCorteEmailHtml({ session, sales = [], branchName }: BuildCorteEmailOptions): string {
  const dateStr = format(
    new Date(session.closedAt ?? session.openedAt),
    "dd 'de' MMMM yyyy, HH:mm",
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

  const productRows = Object.entries(productMap)
    .map(([name, v]) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${v.qty}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">$${v.total.toFixed(2)}</td>
      </tr>`)
    .join('');

  const productSection = productRows ? `
    <h3 style="color:#374151;margin:24px 0 8px;">Productos vendidos</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500;">Producto</th>
          <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500;">Cant.</th>
          <th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:500;">Total</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:24px 32px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Corte de Caja</p>
            <h1 style="margin:4px 0 0;color:#ffffff;font-size:22px;font-weight:700;">${branchName}</h1>
            <p style="margin:6px 0 0;color:#6b7280;font-size:13px;">${dateStr}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <!-- Cajero -->
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
              Cajero: <strong style="color:#111827;">${session.openedByName}</strong>
            </p>

            <!-- Totales -->
            <h3 style="color:#374151;margin:0 0 12px;">Resumen de ventas</h3>
            <table style="width:100%;border-collapse:collapse;font-size:15px;">
              <tr style="background:#f9fafb;">
                <td style="padding:10px 16px;border-radius:6px 6px 0 0;color:#374151;">Efectivo</td>
                <td style="padding:10px 16px;text-align:right;color:#374151;">$${cashTotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;color:#374151;">Tarjeta</td>
                <td style="padding:10px 16px;text-align:right;color:#374151;">$${cardTotal.toFixed(2)}</td>
              </tr>
              <tr style="background:#111827;border-radius:0 0 6px 6px;">
                <td style="padding:12px 16px;color:#ffffff;font-weight:700;border-radius:0 0 0 6px;">Total</td>
                <td style="padding:12px 16px;text-align:right;color:#ffffff;font-weight:700;font-size:17px;border-radius:0 0 6px 0;">$${grandTotal.toFixed(2)}</td>
              </tr>
            </table>

            ${productSection}

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
              Mensaje automático generado al cerrar turno · ${branchName}
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendCorteEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'Corte de Caja <noreply@resend.dev>',
    to,
    subject,
    html,
  });

  if (error) return { ok: false, error: error.message };
  if (!data?.id) return { ok: false, error: 'no_id_returned' };
  return { ok: true };
}

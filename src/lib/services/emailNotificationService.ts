import { Resend } from 'resend';
import { CashSession, Sale, SaleItem } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BuildCorteEmailOptions {
  session: CashSession;
  sales?: Sale[];
  branchName: string;
}

export function buildCorteEmailHtml({ session, sales = [], branchName }: BuildCorteEmailOptions): string {
  // Format dates
  const openedAt = session.openedAt ? new Date(session.openedAt) : null;
  const closedAt = session.closedAt ? new Date(session.closedAt) : null;
  
  const openedAtStr = openedAt 
    ? format(openedAt, "dd 'de' MMMM yyyy, HH:mm", { locale: es })
    : 'No registrada';
  
  const closedAtStr = closedAt
    ? format(closedAt, "dd 'de' MMMM yyyy, HH:mm", { locale: es })
    : 'Aún abierta';

  // Calculate totals
  const cashTotal = session.totalCashSales ?? 0;
  const cardTotal = session.totalCardSales ?? 0;
  const grandTotal = cashTotal + cardTotal;
  const totalSales = sales.filter(s => s.status !== 'cancelled').length;
  
  // Aggregate products by name
  const productMap: Record<string, { qty: number; total: number }> = {};
  for (const sale of sales) {
    if (sale.status === 'cancelled') continue;
    for (const item of sale.items || []) {
      const key = item.name || 'Producto sin nombre';
      if (!productMap[key]) productMap[key] = { qty: 0, total: 0 };
      productMap[key].qty += item.quantity;
      productMap[key].total += (item.priceAtSale || 0) * item.quantity;
    }
  }

  // Sort products by total (most sold first)
  const sortedProducts = Object.entries(productMap)
    .sort((a, b) => b[1].total - a[1].total);

  const productRows = sortedProducts
    .map(([name, v]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${v.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">$${v.total.toFixed(2)}</td>
      </tr>`)
    .join('');

  // Build sales detail rows
  const salesDetailRows = sales
    .filter(s => s.status !== 'cancelled')
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    })
    .map((sale, idx) => {
      const saleDate = sale.createdAt ? format(new Date(sale.createdAt), 'HH:mm') : '--:--';
      const itemsList = (sale.items || [])
        .map(item => `${item.quantity}x ${item.name}`)
        .join(', ');
      return `
        <tr style="background:${idx % 2 === 0 ? '#f9fafb' : '#ffffff'};">
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${saleDate}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${sale.cashierName || 'N/A'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">${itemsList || 'Sin detalle'}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:500;">$${(sale.totalAmount || 0).toFixed(2)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;">${sale.paymentMethod || 'Efectivo'}</td>
        </tr>`;
    })
    .join('');

  const productSection = productRows ? `
    <h3 style="color:#374151;margin:24px 0 8px;font-size:16px;">📦 Productos Vendidos</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;color:#374151;font-weight:600;">Producto</th>
          <th style="padding:10px 12px;text-align:center;color:#374151;font-weight:600;">Cant.</th>
          <th style="padding:10px 12px;text-align:right;color:#374151;font-weight:600;">Total</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>` : '';

  const salesDetailSection = salesDetailRows ? `
    <h3 style="color:#374151;margin:24px 0 8px;font-size:16px;">🧾 Detalle de Ventas (${totalSales} ventas)</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:10px 12px;text-align:left;color:#374151;font-weight:600;">Hora</th>
          <th style="padding:10px 12px;text-align:left;color:#374151;font-weight:600;">Cajero</th>
          <th style="padding:10px 12px;text-align:left;color:#374151;font-weight:600;">Productos</th>
          <th style="padding:10px 12px;text-align:right;color:#374151;font-weight:600;">Total</th>
          <th style="padding:10px 12px;text-align:center;color:#374151;font-weight:600;">Método</th>
        </tr>
      </thead>
      <tbody>${salesDetailRows}</tbody>
    </table>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="700" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:700px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#111827 0%,#374151 100%);padding:28px 32px;">
            <p style="margin:0;color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">📊 Corte de Caja</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:26px;font-weight:700;">${branchName}</h1>
            <p style="margin:8px 0 0;color:#9ca3af;font-size:13px;">${closedAt ? format(closedAt, 'dd MMMM yyyy', { locale: es }) : ''}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <!-- Info Box - Session Details -->
            <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;border:1px solid #e2e8f0;">
              <h3 style="margin:0 0 16px;color:#1e293b;font-size:15px;">📅 Información de la Sesión</h3>
              <table style="width:100%;font-size:14px;">
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;width:50%;">
                    <span style="color:#64748b;">🏠 Sucursal:</span><br>
                    <strong style="color:#1e293b;">${branchName}</strong>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;width:50%;">
                    <span style="color:#64748b;">👤 Cajero apertura:</span><br>
                    <strong style="color:#1e293b;">${session.openedByName || 'No registrado'}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#64748b;">🕐 Apertura:</span><br>
                    <strong style="color:#1e293b;">${openedAtStr}</strong>
                  </td>
                  <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#64748b;">🔒 Cierre:</span><br>
                    <strong style="color:#1e293b;">${closedAtStr}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <span style="color:#64748b;">💰 Efectivo inicial:</span><br>
                    <strong style="color:#1e293b;">$${(session.startingFloat || 0).toFixed(2)}</strong>
                  </td>
                  <td style="padding:8px 0;">
                    <span style="color:#64748b;">🧾 Total ventas:</span><br>
                    <strong style="color:#1e293b;">${totalSales} ventas</strong>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Totales -->
            <h3 style="color:#374151;margin:0 0 12px;font-size:16px;">💵 Resumen de Ingresos</h3>
            <table style="width:100%;border-collapse:collapse;font-size:15px;margin-bottom:24px;">
              <tr style="background:#f8fafc;">
                <td style="padding:12px 16px;border-radius:8px 0 0 8px;color:#475569;font-weight:500;">💵 Efectivo</td>
                <td style="padding:12px 16px;text-align:right;color:#059669;font-weight:700;font-size:16px;">$${cashTotal.toFixed(2)}</td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="padding:12px 16px;color:#475569;font-weight:500;">💳 Tarjeta</td>
                <td style="padding:12px 16px;text-align:right;color:#7c3aed;font-weight:700;font-size:16px;">$${cardTotal.toFixed(2)}</td>
              </tr>
              <tr style="background:#111827;border-radius:0 0 8px 8px;">
                <td style="padding:14px 16px;color:#ffffff;font-weight:700;font-size:17px;border-radius:0 0 0 8px;">✅ TOTAL INGRESOS</td>
                <td style="padding:14px 16px;text-align:right;color:#22c55e;font-weight:700;font-size:20px;border-radius:0 0 8px 0;">$${grandTotal.toFixed(2)}</td>
              </tr>
            </table>

            ${salesDetailSection}

            ${productSection}

            <!-- Footer -->
            <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;margin-top:24px;">
              <p style="margin:0;color:#64748b;font-size:12px;">
                📧 Correo enviado automáticamente por el sistema POS de ${branchName}
              </p>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:11px;">
                Generated: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}
              </p>
            </div>

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
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey) {
    return { ok: false, error: 'missing_resend_api_key' };
  }

  const resend = new Resend(resendApiKey);
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

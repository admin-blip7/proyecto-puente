import { getTiendaCmsOrders } from "@/lib/services/tiendaCmsService";

export default async function TiendaAdminOrdersPage() {
  const orders = await getTiendaCmsOrders(100);

  return (
    <main>
      <h2 className="font-editors-note text-4xl font-light">Ordenes</h2>
      <p className="mt-1 text-sm text-black/60">Historial de ventas desde la tabla `sales`.</p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fff7cc] text-black">
            <tr>
              <th className="px-4 py-3 font-semibold">Folio</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Pago</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-black/60">
                  No hay ordenes registradas.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-black/10">
                  <td className="px-4 py-3">{order.sale_number || order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{order.customer_name || "Mostrador"}</td>
                  <td className="px-4 py-3 text-black/70">{order.payment_method || "-"}</td>
                  <td className="px-4 py-3">
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(order.total_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium">
                      {order.status || "completed"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

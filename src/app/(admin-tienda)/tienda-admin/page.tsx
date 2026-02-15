import { getTiendaCmsDashboardStats } from "@/lib/services/tiendaCmsService";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <p className="text-xs uppercase tracking-[0.15em] text-black/60">{label}</p>
      <p className="mt-2 font-editors-note text-4xl font-light">{value}</p>
    </div>
  );
}

export default async function TiendaAdminDashboardPage() {
  const stats = await getTiendaCmsDashboardStats();

  return (
    <main>
      <h2 className="font-editors-note text-4xl font-light">Panel de Tienda</h2>
      <p className="mt-1 text-sm text-black/60">Resumen operativo conectado a Supabase.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Productos Totales" value={stats.totalProducts.toLocaleString("es-MX")} />
        <StatCard label="Stock Bajo" value={stats.lowStockProducts.toLocaleString("es-MX")} />
        <StatCard label="Ordenes Totales" value={stats.totalOrders.toLocaleString("es-MX")} />
        <StatCard
          label="Ventas del Mes"
          value={new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(stats.monthlyRevenue)}
        />
      </div>
    </main>
  );
}

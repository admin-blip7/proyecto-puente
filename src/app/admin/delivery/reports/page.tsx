"use client";

import { useEffect, useMemo, useState } from "react";
import LeftSidebar from "@/components/shared/LeftSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getRoutes } from "@/lib/services/deliveryRouteService";
import { generateReportPdf } from "@/lib/services/pdfReportService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3B82F6", "#22C55E", "#EF4444", "#F59E0B"];

export default function DeliveryReportsPage() {
  const [routes, setRoutes] = useState<any[]>([]);

  useEffect(() => {
    void getRoutes({ status: "all" }).then(setRoutes).catch(() => setRoutes([]));
  }, []);

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    routes.forEach((r) => {
      map[r.status] = (map[r.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [routes]);

  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    routes.forEach((r) => {
      const key = new Date(r.deliveryDate).toISOString().split("T")[0];
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([day, total]) => ({ day, total }))
      .sort((a, b) => (a.day < b.day ? -1 : 1))
      .slice(-14);
  }, [routes]);

  const totalRoutes = routes.length;
  const completed = routes.filter((r) => r.status === "completed").length;
  const failed = routes.filter((r) => r.totalFailedDeliveries > 0).length;
  const successRate = totalRoutes ? Math.round((completed / totalRoutes) * 100) : 0;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const headers = ["route_code", "delivery_date", "status", "assigned_to", "total_orders", "total_deliveries", "total_failed_deliveries", "total_amount"];
    const rows = routes.map((r) => [
      r.routeCode,
      new Date(r.deliveryDate).toISOString().split("T")[0],
      r.status,
      r.assignedTo || "",
      String(r.totalOrders || 0),
      String(r.totalDeliveries || 0),
      String(r.totalFailedDeliveries || 0),
      String(r.totalAmount || 0),
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `delivery-report-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const exportPdf = async () => {
    const blob = await generateReportPdf({
      title: "Reporte de Entregas",
      subtitle: `Corte ${new Date().toLocaleDateString()}`,
      summary: [
        { label: "Rutas", value: String(totalRoutes) },
        { label: "Completadas", value: String(completed) },
        { label: "Con fallas", value: String(failed) },
        { label: "Tasa de éxito", value: `${successRate}%` },
      ],
      table: {
        headers: ["Ruta", "Fecha", "Estado", "Repartidor", "Pedidos", "Entregadas", "Fallidas", "Monto"],
        rows: routes.map((r) => [
          r.routeCode,
          new Date(r.deliveryDate).toISOString().split("T")[0],
          r.status,
          r.assignedTo || "-",
          String(r.totalOrders || 0),
          String(r.totalDeliveries || 0),
          String(r.totalFailedDeliveries || 0),
          `$${Number(r.totalAmount || 0).toFixed(2)}`,
        ]),
        columnWidths: [14, 12, 12, 18, 10, 10, 10, 14],
      },
      filename: "delivery-report.pdf",
    });
    downloadBlob(blob, `delivery-report-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="flex h-screen w-full flex-row bg-zinc-50">
      <div className="hidden md:flex">
        <LeftSidebar />
      </div>
      <main className="flex-1 overflow-auto p-4 md:p-6 md:pt-8 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Reportes de Entregas</h1>
          <p className="text-sm text-zinc-600">Métricas operativas de rutas y rendimiento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportCsv}>Exportar CSV</Button>
          <Button className="bg-black text-white hover:bg-zinc-900" onClick={exportPdf}>Exportar PDF</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card><CardHeader><CardTitle className="text-sm">Rutas</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{totalRoutes}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Tasa de éxito</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{successRate}%</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Completadas</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{completed}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Con fallas</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{failed}</CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader><CardTitle>Entregas por día</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tasa de éxito / estatus</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={65} outerRadius={110}>
                    {byStatus.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { PartnerSummary } from "@/lib/services/masterService";
import { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Users, Building2, Package, ShoppingCart, Wallet, ChevronDown, ChevronRight,
    Search, TrendingUp, AlertCircle,
} from "lucide-react";

interface Props {
    summaries: PartnerSummary[];
    allProducts: Product[];
}

const fmt = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

// ── Collapsible section ────────────────────────────────────────────────────────
function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-lg border overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
            >
                <span className="font-medium text-sm">{title}</span>
                <div className="flex items-center gap-2">
                    {count !== undefined && (
                        <Badge variant="secondary" className="text-xs">{count}</Badge>
                    )}
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
            </button>
            {open && <div className="p-4">{children}</div>}
        </div>
    );
}

// ── Per-socio card ─────────────────────────────────────────────────────────────
function SocioCard({ s }: { s: PartnerSummary }) {
    const [searchProd, setSearchProd] = useState("");
    const [searchClient, setSearchClient] = useState("");

    const allBranchProducts = s.branchInventory.flatMap((inv) => inv.products);
    const filteredProds = allBranchProducts.filter(
        (p) =>
            !searchProd ||
            p.name.toLowerCase().includes(searchProd.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchProd.toLowerCase())
    );
    const filteredClients = s.clients.list.filter(
        (c) =>
            !searchClient ||
            c.name.toLowerCase().includes(searchClient.toLowerCase()) ||
            (c.phone ?? "").includes(searchClient)
    );

    const totalInventoryValue = s.branchInventory.reduce((a, inv) => a + inv.totalValuePrice, 0);
    const totalInventoryUnits = s.branchInventory.reduce((a, inv) => a + inv.totalUnits, 0);

    return (
        <div className="rounded-xl border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-muted/20 px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-base">{s.socio.name}</p>
                        <Badge variant="secondary" className="text-xs">Socio</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{s.socio.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Miembro desde {fmtDate(s.socio.createdAt)} · Partner ID: {s.socio.partnerId ?? "—"}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Ventas</p>
                        <p className="font-bold text-lg">{s.sales.count}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Revenue total</p>
                        <p className="font-bold text-lg">{fmt(s.sales.totalRevenue)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Últ. 30 días</p>
                        <p className="font-bold text-lg text-green-600">{fmt(s.sales.last30DaysRevenue)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Clientes</p>
                        <p className="font-bold text-lg">{s.clients.count}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Cajas</p>
                        <p className="font-bold text-lg">{s.cashSessions.count}</p>
                    </div>
                </div>
            </div>

            {/* Content tabs */}
            <div className="p-4 space-y-3">
                {/* Sucursales + inventario */}
                <Section title={`Sucursales e inventario — ${totalInventoryUnits} uds · ${fmt(totalInventoryValue)}`} count={s.branches.length}>
                    <div className="space-y-3">
                        {s.branches.length === 0 && (
                            <p className="text-sm text-muted-foreground">Sin sucursales registradas.</p>
                        )}
                        {s.branchInventory.map((inv) => (
                            <div key={inv.branch.id} className="rounded-lg border p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-sm">{inv.branch.name}</span>
                                        {inv.branch.isMain && <Badge variant="outline" className="text-xs">Principal</Badge>}
                                        {!inv.branch.isActive && <Badge variant="destructive" className="text-xs">Inactiva</Badge>}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {inv.products.length} productos · {inv.totalUnits} uds · {fmt(inv.totalValuePrice)}
                                    </span>
                                </div>
                                {inv.products.length > 0 && (
                                    <div className="overflow-auto max-h-48 rounded border text-xs">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Producto</TableHead>
                                                    <TableHead className="text-right">Stock</TableHead>
                                                    <TableHead className="text-right">Precio</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {inv.products.map((p) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="max-w-[160px] truncate">{p.name}</TableCell>
                                                        <TableCell className="text-right">{p.stock}</TableCell>
                                                        <TableCell className="text-right">{fmt(p.price)}</TableCell>
                                                        <TableCell className="text-right">{fmt(p.price * p.stock)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                                {inv.products.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">Sin productos asignados a esta sucursal todavía.</p>
                                )}
                            </div>
                        ))}
                        {/* Products without branch assigned */}
                        {allBranchProducts.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar producto..."
                                    className="h-7 text-xs"
                                    value={searchProd}
                                    onChange={(e) => setSearchProd(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </Section>

                {/* Ventas recientes */}
                <Section title="Ventas recientes" count={s.sales.count}>
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pb-2 border-b">
                            <span>Total: <strong className="text-foreground">{fmt(s.sales.totalRevenue)}</strong></span>
                            <span>Últimos 30 días: <strong className="text-green-600">{fmt(s.sales.last30DaysRevenue)}</strong></span>
                            <span>Efectivo: <strong className="text-foreground">{fmt(s.cashSessions.totalCashSales)}</strong></span>
                            <span>Tarjeta: <strong className="text-foreground">{fmt(s.cashSessions.totalCardSales)}</strong></span>
                        </div>
                        {s.sales.recentSales.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
                        ) : (
                            <div className="overflow-auto rounded border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead># Venta</TableHead>
                                            <TableHead>Cajero</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {s.sales.recentSales.map((sale) => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-mono text-xs">{sale.saleId}</TableCell>
                                                <TableCell className="text-xs">{sale.cashierName}</TableCell>
                                                <TableCell className="text-xs">{sale.customerName ?? "—"}</TableCell>
                                                <TableCell className="text-xs">{fmtDate(sale.createdAt)}</TableCell>
                                                <TableCell className="text-right font-medium">{fmt(sale.total)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </Section>

                {/* Clientes */}
                <Section title="Clientes CRM" count={s.clients.count}>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Search className="h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar cliente..."
                                className="h-7 text-xs"
                                value={searchClient}
                                onChange={(e) => setSearchClient(e.target.value)}
                            />
                        </div>
                        {filteredClients.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Sin clientes registrados.</p>
                        ) : (
                            <div className="overflow-auto rounded border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Teléfono</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="text-right">Compras</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredClients.map((c) => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium text-xs">{c.name}</TableCell>
                                                <TableCell className="text-xs">{c.phone ?? "—"}</TableCell>
                                                <TableCell className="text-xs">{c.email ?? "—"}</TableCell>
                                                <TableCell className="text-right font-medium">{fmt(c.totalPurchases)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </Section>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MasterDashboardClient({ summaries, allProducts }: Props) {
    const [prodSearch, setProdSearch] = useState("");

    const supabaseDown = summaries.length === 0 && allProducts.length === 0;

    const globalTotalRevenue = summaries.reduce((a, s) => a + s.sales.totalRevenue, 0);
    const globalTotalProducts = allProducts.length;
    const globalTotalClients = summaries.reduce((a, s) => a + s.clients.count, 0);
    const globalTotalSales = summaries.reduce((a, s) => a + s.sales.count, 0);

    const filteredGlobal = allProducts.filter(
        (p) =>
            !prodSearch ||
            p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(prodSearch.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard Master</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Vista completa de todos los socios, sus sucursales, ventas, clientes e inventario.
                </p>
            </div>

            {supabaseDown && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium text-red-800">Sin conexión a Supabase</p>
                        <p className="text-sm text-red-700 mt-1">Verifica el proyecto en supabase.com/dashboard.</p>
                    </div>
                </div>
            )}

            {/* Global KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        <Users className="h-3 w-3" /> Socios
                    </div>
                    <p className="text-2xl font-semibold">{summaries.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        <ShoppingCart className="h-3 w-3" /> Ventas totales
                    </div>
                    <p className="text-2xl font-semibold">{globalTotalSales.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        <TrendingUp className="h-3 w-3" /> Revenue global
                    </div>
                    <p className="text-xl font-semibold">{fmt(globalTotalRevenue)}</p>
                </div>
                <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        <Package className="h-3 w-3" /> Productos / Clientes
                    </div>
                    <p className="text-xl font-semibold">{globalTotalProducts.toLocaleString()} / {globalTotalClients}</p>
                </div>
            </div>

            <Tabs defaultValue="socios">
                <TabsList>
                    <TabsTrigger value="socios">Por Socio</TabsTrigger>
                    <TabsTrigger value="global">Inventario Global</TabsTrigger>
                </TabsList>

                {/* ── Tab: Por Socio ── */}
                <TabsContent value="socios" className="mt-4 space-y-4">
                    {summaries.length === 0 && !supabaseDown && (
                        <p className="text-center py-12 text-muted-foreground">No hay socios registrados.</p>
                    )}
                    {summaries.map((s) => (
                        <SocioCard key={s.socio.id} s={s} />
                    ))}
                </TabsContent>

                {/* ── Tab: Inventario Global ── */}
                <TabsContent value="global" className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 max-w-sm">
                        <Search className="h-4 w-4 text-muted-foreground absolute ml-3" />
                        <Input
                            placeholder="Buscar producto..."
                            className="pl-9"
                            value={prodSearch}
                            onChange={(e) => setProdSearch(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {filteredGlobal.length} productos · valor precio:{" "}
                        {fmt(filteredGlobal.reduce((a, p) => a + p.price * p.stock, 0))}
                    </div>
                    <div className="rounded-md border overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Sucursal</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredGlobal.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {allProducts.length === 0 ? "Sin datos — verifica conexión a Supabase." : "Sin resultados."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredGlobal.map((p) => {
                                        const inv = summaries
                                            .flatMap((s) => s.branchInventory)
                                            .find((inv) => inv.branch.id === p.branchId);
                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium max-w-[180px] truncate">{p.name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{p.sku}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {inv?.branch.name ?? <span className="italic">Sin sucursal</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    <span className={p.stock === 0 ? "text-red-600" : ""}>
                                                        {p.stock}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-sm">{fmt(p.cost)}</TableCell>
                                                <TableCell className="text-right text-sm">{fmt(p.price)}</TableCell>
                                                <TableCell className="text-right text-sm">{fmt(p.price * p.stock)}</TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

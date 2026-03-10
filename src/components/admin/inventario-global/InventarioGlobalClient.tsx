"use client";

import { useState, useMemo } from "react";
import { Product } from "@/types";
import { SocioInfo, BranchInfo, BranchInventory } from "@/lib/services/masterService";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Building2, Users, Package, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
    products: Product[];
    socios: SocioInfo[];
    branches: BranchInfo[];
    branchInventory: BranchInventory[];
}

const fmt = (value: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

const typeColors: Record<string, string> = {
    Venta: "bg-blue-100 text-blue-800",
    Refacción: "bg-purple-100 text-purple-800",
    Servicio: "bg-gray-100 text-gray-800",
};

function BranchInventoryPanel({ inv }: { inv: BranchInventory }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() =>
        inv.products.filter((p) =>
            !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())
        ), [inv.products, search]);

    return (
        <div className="rounded-lg border overflow-hidden">
            {/* Header — clickable */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
            >
                <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{inv.branch.name}</span>
                    {inv.branch.isMain && (
                        <Badge variant="outline" className="text-xs">Principal</Badge>
                    )}
                    {!inv.branch.isActive && (
                        <Badge variant="destructive" className="text-xs">Inactiva</Badge>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{inv.products.length}</strong> productos</span>
                    <span><strong className="text-foreground">{inv.totalUnits.toLocaleString()}</strong> uds</span>
                    <span className="hidden sm:inline">{fmt(inv.totalValuePrice)}</span>
                </div>
            </button>

            {/* Expandable content */}
            {open && (
                <div className="p-3 space-y-3">
                    {inv.products.length === 0 ? (
                        <p className="text-center py-6 text-sm text-muted-foreground">
                            Esta sucursal no tiene productos asignados aún.
                            <br />
                            <span className="text-xs">Los productos se asocian al crear/editar desde la cuenta del socio.</span>
                        </p>
                    ) : (
                        <>
                            {/* Mini summary */}
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
                                <span>Valor costo: <strong className="text-foreground">{fmt(inv.totalValueCost)}</strong></span>
                                <span>Valor precio: <strong className="text-foreground">{fmt(inv.totalValuePrice)}</strong></span>
                                <span>Unidades: <strong className="text-foreground">{inv.totalUnits.toLocaleString()}</strong></span>
                            </div>

                            <div className="relative max-w-xs">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    className="pl-8 h-8 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="rounded border overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead className="text-right">Stock</TableHead>
                                            <TableHead className="text-right">Costo</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{p.sku}</TableCell>
                                                <TableCell>
                                                    <Badge className={`text-xs ${typeColors[p.type] ?? "bg-gray-100 text-gray-800"}`} variant="outline">
                                                        {p.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    <span className={p.stock === 0 ? "text-red-600" : p.stock <= (p.minStock ?? 0) ? "text-yellow-600" : ""}>
                                                        {p.stock}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-sm">{fmt(p.cost)}</TableCell>
                                                <TableCell className="text-right text-sm">{fmt(p.price)}</TableCell>
                                                <TableCell className="text-right text-sm">{fmt(p.price * p.stock)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function InventarioGlobalClient({ products, socios, branches, branchInventory }: Props) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("all");

    const supabaseDown = products.length === 0 && socios.length === 0 && branches.length === 0;

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchSearch =
                !search ||
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.sku.toLowerCase().includes(search.toLowerCase());
            const matchType = typeFilter === "all" || p.type === typeFilter;
            return matchSearch && matchType;
        });
    }, [products, search, typeFilter]);

    const totalValorCosto = filteredProducts.reduce((acc, p) => acc + p.cost * p.stock, 0);
    const totalValorPrecio = filteredProducts.reduce((acc, p) => acc + p.price * p.stock, 0);
    const totalUnidades = filteredProducts.reduce((acc, p) => acc + p.stock, 0);

    // Group branchInventory by partner → socio
    const socioInventory = useMemo(() => {
        return socios.map((socio) => {
            const sociosBranches = branchInventory.filter(
                (inv) => inv.branch.partnerId === socio.partnerId
            );
            return { socio, branchInventory: sociosBranches };
        });
    }, [socios, branchInventory]);

    // Branches without a socio (orphan branches)
    const orphanInventory = useMemo(() => {
        const socioPartnerIds = new Set(socios.map((s) => s.partnerId).filter(Boolean));
        return branchInventory.filter((inv) => !socioPartnerIds.has(inv.branch.partnerId));
    }, [branchInventory, socios]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Inventario Global</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Vista master — socios, sucursales y todos los productos del sistema.
                </p>
            </div>

            {supabaseDown && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium text-red-800">Sin conexión a Supabase</p>
                        <p className="text-sm text-red-700 mt-1">
                            Verifica que el proyecto esté activo en <span className="font-mono">supabase.com/dashboard</span>.
                        </p>
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Users className="h-3 w-3" /> Socios
                    </p>
                    <p className="text-2xl font-semibold mt-1">{socios.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Sucursales
                    </p>
                    <p className="text-2xl font-semibold mt-1">{branches.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Package className="h-3 w-3" /> Productos totales
                    </p>
                    <p className="text-2xl font-semibold mt-1">{products.length.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor global</p>
                    <p className="text-xl font-semibold mt-1">
                        {fmt(products.reduce((acc, p) => acc + p.price * p.stock, 0))}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="socios">
                <TabsList>
                    <TabsTrigger value="socios">Por Socio / Sucursal</TabsTrigger>
                    <TabsTrigger value="global">Inventario Global</TabsTrigger>
                </TabsList>

                {/* Tab: Por Socio */}
                <TabsContent value="socios" className="mt-4 space-y-6">
                    {socios.length === 0 && !supabaseDown && (
                        <p className="text-center py-12 text-muted-foreground">
                            No hay socios registrados en el sistema.
                        </p>
                    )}

                    {socioInventory.map(({ socio, branchInventory: invs }) => (
                        <div key={socio.id} className="space-y-2">
                            {/* Socio header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <span className="font-semibold">{socio.name}</span>
                                        <span className="text-sm text-muted-foreground ml-2">{socio.email}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">Socio</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground hidden sm:block">
                                    {invs.length} sucursal{invs.length !== 1 ? "es" : ""}
                                    {" · "}
                                    {invs.reduce((a, i) => a + i.products.length, 0)} productos
                                </span>
                            </div>

                            {/* Branches */}
                            {invs.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground ml-6">
                                    Sin sucursales registradas para este socio.
                                </div>
                            ) : (
                                <div className="ml-6 space-y-2">
                                    {invs.map((inv) => (
                                        <BranchInventoryPanel key={inv.branch.id} inv={inv} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {orphanInventory.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Sucursales sin socio asignado</p>
                            {orphanInventory.map((inv) => (
                                <BranchInventoryPanel key={inv.branch.id} inv={inv} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Tab: Global */}
                <TabsContent value="global" className="space-y-4 mt-4">
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span>Mostrando <strong>{filteredProducts.length}</strong> productos · <strong>{totalUnidades.toLocaleString()}</strong> unidades</span>
                        <span>Valor costo: <strong>{fmt(totalValorCosto)}</strong></span>
                        <span>Valor precio: <strong>{fmt(totalValorPrecio)}</strong></span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o SKU..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {["all", "Venta", "Refacción", "Servicio"].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                                        typeFilter === t
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background border-border hover:bg-muted"
                                    }`}
                                >
                                    {t === "all" ? "Todos" : t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-md border overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Sucursal</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            {products.length === 0
                                                ? "Sin datos — verifica la conexión a Supabase."
                                                : "Sin productos con ese filtro."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map((p) => {
                                        const branch = branches.find((b) => b.id === p.branchId);
                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                                                <TableCell className="text-muted-foreground text-xs">{p.sku}</TableCell>
                                                <TableCell>
                                                    <Badge className={`text-xs ${typeColors[p.type] ?? "bg-gray-100 text-gray-800"}`} variant="outline">
                                                        {p.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {branch?.name ?? <span className="italic">Sin sucursal</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    <span className={p.stock === 0 ? "text-red-600" : p.stock <= (p.minStock ?? 0) ? "text-yellow-600" : ""}>
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

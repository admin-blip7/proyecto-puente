"use client";

import { useState, useEffect } from "react";
import {
    AlertCircle,
    CheckCircle2,
    RefreshCcw,
    ShieldAlert,
    ShieldCheck,
    ChevronRight,
    Search,
    Filter,
    ArrowUpDown,
    Wrench
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InventoryValidationResult, InventoryIssue } from "@/lib/services/inventoryValidationService";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

export default function AuditClient() {
    const [loading, setLoading] = useState(true);
    const [validating, setValidating] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [auditData, setAuditData] = useState<InventoryValidationResult | null>(null);
    const { toast } = useToast();

    const fetchAuditData = async (action: "validate" | "quickCheck" = "validate", autoFix = false) => {
        try {
            setValidating(true);
            const response = await fetch("/api/inventory-validation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, autoFix })
            });

            const data = await response.json();
            if (data.success) {
                setAuditData(data.validationResult);
                if (autoFix && data.fixResult) {
                    toast({
                        title: "Corrección Completada",
                        description: `Se corrigieron ${data.fixResult.fixed} problemas automáticamente.`
                    });
                }
            } else {
                throw new Error(data.error || "Error al obtener datos de auditoría");
            }
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error de Auditoría",
                description: "No se pudieron obtener los datos de validación de inventario."
            });
        } finally {
            setLoading(false);
            setValidating(false);
        }
    };

    const handleAutoFix = async () => {
        if (!auditData || auditData.issues.length === 0) return;

        const fixableIssues = auditData.issues.filter(i => i.type === 'negative_stock');
        if (fixableIssues.length === 0) {
            toast({
                title: "Sin problemas corregibles",
                description: "Los problemas detectados requieren intervención manual."
            });
            return;
        }

        setFixing(true);
        await fetchAuditData("validate", true);
        setFixing(false);
    };

    useEffect(() => {
        fetchAuditData("quickCheck");
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-lg font-medium">Cargando auditoría...</span>
            </div>
        );
    }

    const { summary, issues, isValid } = auditData || {
        summary: { totalProducts: 0, productsWithIssues: 0, totalDiscrepancy: 0 },
        issues: [],
        isValid: true
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical': return <Badge variant="destructive" className="bg-red-600">Crítico</Badge>;
            case 'high': return <Badge variant="destructive">Alto</Badge>;
            case 'medium': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Medio</Badge>;
            default: return <Badge variant="outline">Bajo</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Auditoría de Productos</h1>
                    <p className="text-muted-foreground">Validación técnica de integridad de stock y logs de inventario.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => fetchAuditData("validate")}
                        disabled={validating}
                    >
                        <RefreshCcw className={cn("mr-2 h-4 w-4", validating && "animate-spin")} />
                        Re-validar Todo
                    </Button>
                    <Button
                        onClick={handleAutoFix}
                        disabled={validating || fixing || issues.length === 0}
                    >
                        <Wrench className="mr-2 h-4 w-4" />
                        Corregir Automáticamente
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Salud del Inventario</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center">
                            {isValid ? (
                                <ShieldCheck className="h-8 w-8 text-green-500 mr-2" />
                            ) : (
                                <ShieldAlert className="h-8 w-8 text-amber-500 mr-2" />
                            )}
                            <div className="text-2xl font-bold">
                                {isValid ? "Excelente" : "Requiere Atención"}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {summary.productsWithIssues} productos con inconsistencias detectadas.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Discrepancia Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {summary.totalDiscrepancy} <span className="text-sm font-normal text-muted-foreground">unidades</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Diferencia acumulada entre registros y stock real.
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.totalProducts}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Items de venta activos analizados.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Inconsistencias Detectadas</CardTitle>
                    <CardDescription>
                        Lista de productos donde los registros técnicos no coinciden con el stock declarado.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {issues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                            <h3 className="text-lg font-semibold">¡Todo en orden!</h3>
                            <p className="text-muted-foreground max-w-xs">
                                No se encontraron discrepancias en el inventario durante la última validación.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Tipo de Error</TableHead>
                                        <TableHead>Gravedad</TableHead>
                                        <TableHead className="text-right">Stock Actual</TableHead>
                                        <TableHead className="text-right">Esperado</TableHead>
                                        <TableHead className="text-right">Desviación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {issues.map((issue, index) => (
                                        <TableRow key={`${issue.productId}-${index}`}>
                                            <TableCell className="font-medium">
                                                <div>
                                                    {issue.productName}
                                                    <div className="text-xs text-muted-foreground font-normal">
                                                        ID: {issue.productId.substring(0, 8)}...
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="capitalize text-sm">
                                                        {issue.type.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground leading-tight">
                                                        {issue.description}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getSeverityBadge(issue.severity)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {issue.currentValue ?? "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {issue.expectedValue ?? "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-amber-600 font-bold">
                                                {issue.discrepancy ? `±${issue.discrepancy}` : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 text-xs text-muted-foreground py-3">
                    <AlertCircle className="h-3 w-3 mr-2" />
                    Las discrepancias suelen deberse a procesos de venta interrumpidos o ediciones manuales de stock sin registro de logs.
                </CardFooter>
            </Card>
        </div>
    );
}

"use client"

import { useState, useMemo, useEffect } from "react";
import { Product, Sale, Warranty } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getWarranties } from "@/lib/services/warrantyService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Bot, Cpu, Loader2 } from "lucide-react";
import { analyzeProductQuality } from "@/ai/flows/analyze-product-quality";
import { ProductQualityOutput } from "@/ai/flows/types";
import { useToast } from "@/hooks/use-toast";

interface ProductQualityAnalysisProps {
    allProducts: Product[];
    allSales: Sale[];
}

interface ProductStats {
    productId: string;
    name: string;
    totalSold: number;
    totalWarranties: number;
    warrantyRate: number;
    commonReasons: string[];
    analysis?: ProductQualityOutput;
}

export default function ProductQualityAnalysis({ allProducts, allSales }: ProductQualityAnalysisProps) {
    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [analysisResults, setAnalysisResults] = useState<Record<string, ProductQualityOutput>>({});
    const [loadingAnalysisFor, setLoadingAnalysisFor] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        getWarranties().then(data => {
            setWarranties(data);
            setIsLoading(false);
        });
    }, []);

    const productStats = useMemo((): ProductStats[] => {
        const salesMap = new Map<string, number>();
        allSales.forEach(sale => {
            sale.items.forEach(item => {
                salesMap.set(item.productId, (salesMap.get(item.productId) || 0) + item.quantity);
            });
        });

        const warrantyMap = new Map<string, Warranty[]>();
        warranties.forEach(warranty => {
            if (!warrantyMap.has(warranty.productId)) {
                warrantyMap.set(warranty.productId, []);
            }
            warrantyMap.get(warranty.productId)!.push(warranty);
        });

        return allProducts.map(product => {
            const totalSold = salesMap.get(product.id) || 0;
            const productWarranties = warrantyMap.get(product.id) || [];
            const totalWarranties = productWarranties.length;
            const warrantyRate = totalSold > 0 ? (totalWarranties / totalSold) * 100 : 0;
            
            const reasonCounts: Record<string, number> = {};
            productWarranties.forEach(w => {
                // Simple pattern matching for reasons
                const reason = w.reason.toLowerCase();
                if (reason.includes("batería") || reason.includes("carga")) reasonCounts["Problema de Batería"] = (reasonCounts["Problema de Batería"] || 0) + 1;
                else if (reason.includes("pantalla") || reason.includes("display")) reasonCounts["Falla de Pantalla"] = (reasonCounts["Falla de Pantalla"] || 0) + 1;
                else reasonCounts["Otro"] = (reasonCounts["Otro"] || 0) + 1;
            });
            
            const commonReasons = Object.entries(reasonCounts).sort((a,b) => b[1] - a[1]).map(([reason]) => reason);

            return {
                productId: product.id,
                name: product.name,
                totalSold,
                totalWarranties,
                warrantyRate,
                commonReasons
            };
        })
        .filter(p => p.totalWarranties > 0)
        .sort((a, b) => b.warrantyRate - a.warrantyRate);

    }, [allProducts, allSales, warranties]);

    const handleRunAnalysis = async (product: ProductStats) => {
        setLoadingAnalysisFor(product.productId);
        try {
            const result = await analyzeProductQuality({
                productName: product.name,
                totalSold: product.totalSold,
                totalWarranties: product.totalWarranties,
                warrantyRate: parseFloat(product.warrantyRate.toFixed(2)),
                commonReasons: product.commonReasons,
            });
            setAnalysisResults(prev => ({ ...prev, [product.productId]: result }));
        } catch (error) {
            console.error("Error analyzing product quality:", error);
            toast({ variant: "destructive", title: "Error de IA", description: "No se pudo generar el análisis." });
        } finally {
            setLoadingAnalysisFor(null);
        }
    }


    return (
        <Card>
            <CardHeader>
                 <div className="flex items-center gap-2">
                    <Cpu className="h-6 w-6 text-primary" />
                    <CardTitle>Análisis de Calidad de Producto con IA</CardTitle>
                </div>
                <CardDescription>
                    Identifica productos con altas tasas de garantía para tomar acciones correctivas y mejorar la satisfacción del cliente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-[400px] w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-center">Unidades Vendidas</TableHead>
                                <TableHead className="text-center"># Garantías</TableHead>
                                <TableHead className="text-center">Tasa de Garantía</TableHead>
                                <TableHead className="text-right">Análisis IA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                 <TableRow><TableCell colSpan={5} className="h-24 text-center">Cargando datos de garantías...</TableCell></TableRow>
                            ) : productStats.length > 0 ? (
                                productStats.map(product => {
                                    const analysis = analysisResults[product.productId];
                                    return (
                                        <TableRow key={product.productId} className={product.warrantyRate > 5 ? "bg-destructive/10" : ""}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell className="text-center">{product.totalSold}</TableCell>
                                            <TableCell className="text-center">{product.totalWarranties}</TableCell>
                                            <TableCell className="text-center font-bold">{product.warrantyRate.toFixed(2)}%</TableCell>
                                            <TableCell className="text-right">
                                                {analysis ? (
                                                     <div className="space-y-2 text-left p-2 rounded-md bg-muted/50">
                                                        <p className="font-semibold text-primary">Análisis:</p>
                                                        <p className="text-xs">{analysis.analysis}</p>
                                                        <p className="font-semibold text-amber-600">Recomendación:</p>
                                                        <p className="text-xs">{analysis.recommendation}</p>
                                                    </div>
                                                ) : (
                                                    <Button variant="secondary" size="sm" onClick={() => handleRunAnalysis(product)} disabled={loadingAnalysisFor === product.productId}>
                                                        {loadingAnalysisFor === product.productId ? <Loader2 className="h-4 w-4 animate-spin"/> : <Bot className="h-4 w-4" />}
                                                        <span className="ml-2">Analizar</span>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                           <AlertCircle className="h-4 w-4" />
                                           <span>No hay productos con garantías registradas.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

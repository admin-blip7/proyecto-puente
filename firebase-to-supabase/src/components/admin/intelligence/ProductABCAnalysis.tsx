"use client"

import { useMemo } from "react";
import { Product, Sale } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Star, ThumbsUp, Snail } from "lucide-react";

interface ProductABCAnalysisProps {
    products: Product[];
    sales: Sale[];
}

interface ProductRevenue {
    productId: string;
    name: string;
    totalRevenue: number;
}

type ABCCategory = 'A' | 'B' | 'C';

const getCategoryBadge = (category: ABCCategory) => {
    switch (category) {
        case 'A':
            return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white"><Star className="h-3 w-3 mr-1" /> Estrella</Badge>;
        case 'B':
            return <Badge variant="secondary"><ThumbsUp className="h-3 w-3 mr-1" /> Promedio</Badge>;
        case 'C':
            return <Badge variant="outline"><Snail className="h-3 w-3 mr-1" /> Baja Rotación</Badge>;
    }
}


export default function ProductABCAnalysis({ products, sales }: ProductABCAnalysisProps) {
    
    const classifiedProducts = useMemo(() => {
        const revenueMap = new Map<string, number>();

        sales.forEach(sale => {
            sale.items.forEach(item => {
                const currentRevenue = revenueMap.get(item.productId) || 0;
                revenueMap.set(item.productId, currentRevenue + (item.priceAtSale * item.quantity));
            });
        });

        const productRevenues: ProductRevenue[] = products.map(product => ({
            productId: product.id,
            name: product.name,
            totalRevenue: revenueMap.get(product.id) || 0,
        })).sort((a, b) => b.totalRevenue - a.totalRevenue);

        const totalRevenueSum = productRevenues.reduce((sum, p) => sum + p.totalRevenue, 0);
        
        const countA = Math.ceil(productRevenues.length * 0.20);
        const countB = Math.ceil(productRevenues.length * 0.30);
        
        return productRevenues.map((p, index) => {
            let category: ABCCategory;
            if (index < countA) {
                category = 'A';
            } else if (index < countA + countB) {
                category = 'B';
            } else {
                category = 'C';
            }
            return { ...p, category };
        });

    }, [products, sales]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Análisis ABC de Productos</CardTitle>
                <CardDescription>
                    Clasificación de productos basada en su contribución a los ingresos totales para una gestión de inventario más inteligente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead className="text-right">Ingresos Totales</TableHead>
                                <TableHead className="text-center">Categoría ABC</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classifiedProducts.map(product => (
                                <TableRow key={product.productId}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-right font-semibold">${product.totalRevenue.toFixed(2)}</TableCell>
                                    <TableCell className="text-center">{getCategoryBadge(product.category)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

"use client"

import { Product, Sale, Warranty } from "@/types";
import LowStockAlerts from "./LowStockAlerts";
import ProductABCAnalysis from "./ProductABCAnalysis";
import DemandForecast from "./DemandForecast";
import { Separator } from "@/components/ui/separator";
import ProductQualityAnalysis from "./ProductQualityAnalysis";
import { getWarranties } from "@/lib/services/warrantyService";

interface IntelligenceClientProps {
    allProducts: Product[];
    allSales: Sale[];
}

export default function IntelligenceClient({ allProducts, allSales }: IntelligenceClientProps) {

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inteligencia de Inventario</h1>
                    <p className="text-muted-foreground">Análisis proactivo para optimizar tu stock y maximizar ganancias.</p>
                </div>
            </div>

            <LowStockAlerts products={allProducts} />
            <ProductABCAnalysis products={allProducts} sales={allSales} />
            <DemandForecast products={allProducts} sales={allSales} />
            <ProductQualityAnalysis allProducts={allProducts} allSales={allSales} />

        </div>
    )
}
